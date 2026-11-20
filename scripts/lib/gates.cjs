// Pure checking logic for the commit and push gates. No git, no I/O, so it is unit-tested
// in scripts/gates.test.cjs. The hooks in .githooks/ call it through scripts/*.cjs.
//
// To let a line through on purpose, add `gate:allow` to it, and say why in a comment.

const FORBIDDEN_FILE_RULES = [
  { test: (f) => /(^|\/)\.env(\..+)?$/.test(f) && !/\.env\.example$/.test(f), why: "environment file (secrets)" },
  { test: (f) => /(^|\/)google-services\.json$/.test(f), why: "Firebase config" },
  { test: (f) => /(^|\/)GoogleService-Info\.plist$/.test(f), why: "Firebase config" },
  { test: (f) => /\.(keystore|jks|p8|p12|pem|key|mobileprovision)$/i.test(f), why: "signing key or certificate" },
  { test: (f) => /\.(apk|aab|ipa)$/i.test(f), why: "build artifact (use EAS and a link instead)" },
  { test: (f) => /(^|\/)node_modules\//.test(f), why: "node_modules" },
];

const SECRET_RULES = [
  { name: "private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: "Resend API key", re: /\bre_[A-Za-z0-9]{20,}\b/ },
  { name: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/ },
  {
    name: "database URL with a password",
    re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/'"]+:(?!password\b|pass\b|changeme\b|postgres\b|<)[^\s@/'"]{6,}@/i,
  },
  {
    name: "hard-coded secret assignment",
    re: /\b(?:secret|token|password|passwd|api[_-]?key|private[_-]?key)\b\s*[:=]\s*(['"])(?![^'"]*(?:\$\{|process\.env|example|placeholder|changeme|your[_-]|<))[A-Za-z0-9+/_=.-]{20,}\1/i,
  },
];

const ALLOW = "gate:allow";

function checkFiles(files) {
  const problems = [];
  for (const f of files) {
    const rule = FORBIDDEN_FILE_RULES.find((r) => r.test(f));
    if (rule) problems.push(`${f}: not allowed in git, ${rule.why}`);
  }
  return problems;
}

const isTest = (f) => /(^|\/)(test|tests|__tests__)\//.test(f) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(f);
const isMobileSource = (f) => /^apps\/mobile\/(src|app)\//.test(f) && /\.[jt]sx?$/.test(f) && !isTest(f);
const isExample = (f) => /\.env\.example$/.test(f) || /\.md$/.test(f);

// `addedByFile` is { path: [added line, ...] }, which is only the lines this commit adds,
// so old code that already has a console.log does not block an unrelated commit.
function checkAddedLines(addedByFile) {
  const problems = [];
  for (const [file, lines] of Object.entries(addedByFile)) {
    lines.forEach((line, i) => {
      if (line.includes(ALLOW)) return;
      const where = `${file} (added line ${i + 1})`;

      if (!isExample(file) && !isTest(file)) {
        for (const rule of SECRET_RULES) {
          if (rule.re.test(line)) problems.push(`${where}: looks like a ${rule.name}`);
        }
      }
      if (isMobileSource(file)) {
        if (/\bconsole\.log\s*\(/.test(line)) problems.push(`${where}: console.log in app code (use console.warn/error or remove)`);
        if (/\bdebugger\b/.test(line)) problems.push(`${where}: debugger statement`);
        if (/(?:localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+)(?::\d+)?/.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line)) {
          problems.push(`${where}: local address in app code (use EXPO_PUBLIC_API_URL)`);
        }
      }
    });
  }
  return problems;
}

const COMMIT_TYPES = ["feat", "fix", "docs", "chore", "refactor", "test", "perf", "ci", "build", "style", "revert"];
const COMMIT_RE = new RegExp(`^(${COMMIT_TYPES.join("|")})(\\([a-z0-9][a-z0-9-]*\\))?!?: \\S.*$`);

function checkCommitMessage(message) {
  const first = String(message).split(/\r?\n/)[0].trim();
  if (/^(Merge |Revert "|fixup! |squash! )/.test(first)) return [];
  const problems = [];
  if (!COMMIT_RE.test(first)) {
    problems.push(`"${first}" is not a conventional commit. Use "type(scope): summary", with type one of ${COMMIT_TYPES.join(", ")}`);
  } else if (first.length > 100) {
    problems.push(`first line is ${first.length} characters, keep it to 100 or fewer`);
  } else if (/[.]$/.test(first)) {
    problems.push("first line should not end with a full stop");
  }
  return problems;
}

// Cross-app contract and deploy-risk hints for the pre-push hook. These are warnings, not blocks.
function pushWarnings(changedFiles) {
  const warnings = [];
  const touched = (re) => changedFiles.some((f) => re.test(f));
  if (touched(/^apps\/api\/src\/routes\//) && !touched(/^apps\/mobile\/src\/api\//)) {
    warnings.push("An API route changed but nothing under apps/mobile/src/api did. Check the contract (AGENTS.md section 2), or say clearly that you didn't.");
  }
  if (touched(/^apps\/api\/prisma\/migrations\//)) {
    warnings.push("A Prisma migration changed. It must be applied (prisma migrate deploy) before the API that needs it is deployed. Released app builds keep calling the old API.");
  }
  if (touched(/^apps\/api\/src\/lib\/features\.ts$/) && !touched(/^apps\/api\/\.env\.example$/)) {
    warnings.push("Feature flags changed but apps/api/.env.example did not. Document every flag there.");
  }
  if (touched(/^apps\/mobile\/app\.json$/) || touched(/^apps\/mobile\/eas\.json$/)) {
    warnings.push("app.json or eas.json changed. Check the Android package still matches the Play URL in apps/website/site.js.");
  }
  return warnings;
}

module.exports = { checkFiles, checkAddedLines, checkCommitMessage, pushWarnings, COMMIT_TYPES };
