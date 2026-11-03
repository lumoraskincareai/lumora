#!/usr/bin/env node
'use strict';
// Claude Code hook for the Lumora monorepo. Tests: npm run test:guard
//
//   PreToolUse (Bash|PowerShell): refuses or asks about shell commands that could lose
//     hosted data, expose secrets, or ship something.
//   SessionStart: warns only when the local setup can't run the project.
//
// This is a seatbelt against mistakes, not a security boundary. A determined command
// can get past pattern matching. permissions.deny in settings.json covers the file
// tools; the real protection for data is pointing DATABASE_URL at a dev database.

const fs = require('node:fs');
const path = require('node:path');

const MIN_NODE_MAJOR = 22;

// Matches a real secrets file, but not .env.example.
const ENV_FILE = /(^|[\s"'=/\\:@])\.env(\.(local|production|development|staging|preview|test))?(?=$|[\s"'|;&)>])/i;
const READERS =
  /(^|\$\(|`)\s*(cat|type|gc|get-content|head|tail|less|more|bat|sed|awk|grep|egrep|fgrep|rg|findstr|select-string|sls|cut|strings|xxd|od|base64|source|\.|scp|curl|git\s+(show|cat-file|diff)|git\s+log\s.*(-p|--patch)|(node|python3?|py)\s+(-e|-c|--eval))(\s|$)/i;
// A copy only exposes secrets when .env is the source; `cp .env.example .env` is setup.
const COPIES_SECRET_FILE = /^(cp|copy|copy-item|mv|move|move-item)\s+(\S*[/\\])?\.env(\.(local|production|development|staging|preview|test))?\s/i;

const DENY = [
  [/^prisma\s+migrate\s+reset\b/i, 'prisma migrate reset wipes the database.'],
  [/^prisma\b.*--(force-reset|accept-data-loss)\b/i, 'This Prisma flag can destroy data.'],
  [/^(prisma\s+db\s+execute|psql)\b.*\b(DROP\s+(TABLE|SCHEMA|DATABASE)|TRUNCATE\s)/i, 'DROP/TRUNCATE on the database.'],
  [/^git\s+add\b.*(\s|\/|\\)\.env(\s|$)/i, '.env must never be committed.'],
];

const ASK = [
  [/^prisma\s+(migrate\s+(dev|deploy|resolve)|db\s+(push|seed|execute))\b/i, 'This writes to the database in DATABASE_URL, which may be the hosted one with real data.'],
  [/^psql\b/i, 'Direct database access; DATABASE_URL may be the hosted one with real data.'],
  [/^npm\s+run\s+(un)?seed\b/i, 'Seeds write to the database in DATABASE_URL, which may be the hosted one with real data.'],
  [/^tsx\s+\S*prisma[/\\]\S*seed/i, 'Seeds write to the database in DATABASE_URL, which may be the hosted one with real data.'],
  [/^eas\s+(build|submit|update)\b/i, 'This ships to users or spends EAS build credits.'],
  [/^git\s+push\b.*\s(--force|--force-with-lease|-f)(\s|$)/i, 'Force push rewrites shared history.'],
  [/^git\s+push\b.*\s(HEAD:)?(main|master)(\s|$)/i, 'Direct push to main; the repos work through branches and PRs.'],
  [/^git\s+push\s*(origin\s*|origin\s+HEAD\s*)?$/i, 'Push target is implicit and may be main; please confirm.'],
  [/^gh\s+(pr\s+merge|repo\s+(delete|edit|rename))\b/i, 'This changes the shared GitHub repository.'],
  [/^(cp|copy|copy-item|mv|move|move-item)\s+\S+\s+\S*\.env(\s|$)/i, 'This overwrites a .env file.'],
];

// Splits on ; && || | & and newlines, ignoring those inside quotes.
function splitCommand(command) {
  const parts = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      current += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      current += c;
    } else if (c === ';' || c === '\n' || c === '|' || (c === '&' && command[i - 1] !== '>' && command[i + 1] !== '>')) {
      parts.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// Removes what precedes the real command: env assignments, npx, local bin paths, and
// path flags, so `DATABASE_URL=x npx prisma ...` is judged as `prisma ...`.
function normalize(segment) {
  let s = segment;
  let previous;
  do {
    previous = s;
    s = s
      .replace(/^\$env:\w+\s*=\s*("[^"]*"|'[^']*'|\S+)\s*/i, '')
      .replace(/^\w+=("[^"]*"|'[^']*'|\S*)\s+/, '')
      .replace(/^(sudo|time|call|command|cross-env|dotenv)\s+/i, '')
      .replace(/^&\s*/, '')
      .replace(/^npx(\.cmd)?\s+(--yes\s+|-y\s+)?/i, '')
      .replace(/^npm\s+exec\s+((--prefix|--workspace|-w)(=|\s+)\S+\s+)*(--\s+)?/i, '')
      .replace(/^(\.[/\\])?node_modules[/\\]\.bin[/\\]/i, '');
  } while (s !== previous);
  return s
    .replace(/^npm\s+((--prefix|--workspace|-w)(=|\s+)\S+\s+)+/i, 'npm ')
    .replace(/^git\s+-C\s+("[^"]*"|\S+)\s+/i, 'git ')
    .replace(/^prisma(\.cmd)?\s+/i, 'prisma ');
}

// `bash -c "..."`, `powershell -Command "..."` and friends: judge what's inside.
function unwrap(segment) {
  const match = segment.match(/^(?:bash|sh|zsh|cmd(?:\.exe)?|pwsh|powershell(?:\.exe)?|eval)\b(?:.*?\s(?:-c|\/c|-Command))?\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim().replace(/^(["'])(.*)\1$/s, '$2');
}

function readsSecretFile(segment) {
  const withoutFlags = segment
    .replace(/--env-file(=|\s+)\S+/gi, '')
    .replace(/--(exclude|exclude-dir|glob|iglob)(=|\s+)\S+/gi, '')
    .replace(/\s-g\s+\S+/g, '');
  if (!ENV_FILE.test(withoutFlags)) return false;
  return READERS.test(withoutFlags) || COPIES_SECRET_FILE.test(withoutFlags) || /<\s*\S*\.env/i.test(withoutFlags);
}

function judge(command) {
  let verdict = null;
  for (const raw of splitCommand(command)) {
    const segment = normalize(raw);
    const inner = unwrap(segment);
    if (inner) {
      const nested = judge(inner);
      if (nested?.decision === 'deny') return nested;
      verdict ??= nested;
    }
    if (readsSecretFile(segment)) {
      return { decision: 'deny', reason: 'Reading .env is not allowed, because its secrets would enter the transcript. Check names in .env.example, or ask the user.' };
    }
    for (const [pattern, reason] of DENY) {
      if (pattern.test(segment)) {
        return { decision: 'deny', reason: `${reason} Blocked by the Lumora guard. If this is truly intended, the user should run it themselves.` };
      }
    }
    for (const [pattern, reason] of ASK) {
      if (!verdict && pattern.test(segment)) verdict = { decision: 'ask', reason };
    }
    if (!verdict && />>?\s*\S*\.env(\s|$)/i.test(segment)) {
      verdict = { decision: 'ask', reason: 'This overwrites a .env file.' };
    }
  }
  return verdict;
}

function setupProblems(projectDir) {
  const problems = [];
  const major = Number(process.versions.node.split('.')[0]);
  if (process.arch === 'ia32') {
    problems.push(`Node is 32-bit (${process.version}). Prisma and the backend's TypeScript 7 don't support it; install 64-bit Node ${MIN_NODE_MAJOR} LTS.`);
  } else if (major < MIN_NODE_MAJOR) {
    problems.push(`Node ${process.version} is below the required ${MIN_NODE_MAJOR} (see .nvmrc).`);
  }

  if (!fs.existsSync(path.join(projectDir, 'node_modules'))) {
    problems.push('node_modules is missing; run npm ci at the repo root.');
  }
  for (const app of ['apps/mobile', 'apps/api']) {
    const envFile = path.join(projectDir, app, '.env');
    if (!fs.existsSync(envFile) || fs.statSync(envFile).size === 0) {
      problems.push(`${app}: .env is missing or empty; the user must fill it in from .env.example (don't do this for them).`);
    }
  }
  return problems;
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));

  if (input.hook_event_name === 'SessionStart') {
    const problems = setupProblems(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
    if (problems.length) {
      const text = `Lumora setup problems:\n- ${problems.join('\n- ')}`;
      console.log(JSON.stringify({ systemMessage: text, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }));
    }
    return;
  }

  const verdict = judge(String(input.tool_input?.command ?? ''));
  if (verdict) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: verdict.decision,
        permissionDecisionReason: verdict.reason,
      },
    }));
  }
}

main();
