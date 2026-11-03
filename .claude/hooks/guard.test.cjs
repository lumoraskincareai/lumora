// Runs guard.cjs the way Claude Code does (JSON on stdin) against a table of commands.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const guard = path.join(__dirname, 'guard.cjs');
const cases = [
  // Refused
  ['deny', 'npx prisma migrate reset --force'],
  ['deny', 'cd apps/api && npx prisma migrate reset'],
  ['deny', 'DATABASE_URL=x npx prisma migrate reset'],
  ['deny', '$env:DATABASE_URL="x"; npx prisma migrate reset'],
  ['deny', 'node_modules/.bin/prisma migrate reset'],
  ['deny', 'npm exec -w lumora-backend -- prisma migrate reset'],
  ['deny', 'bash -c "npx prisma migrate reset --force"'],
  ['deny', 'powershell -Command "npx prisma migrate reset"'],
  ['deny', 'npx prisma db push --force-reset'],
  ['deny', 'npx prisma db push --accept-data-loss'],
  ['deny', 'npx prisma db execute --stdin --url x "DROP TABLE users"'],
  ['deny', 'cat .env'],
  ['deny', 'cat apps/api/.env'],
  ['deny', 'cat .env.local'],
  ['deny', 'Get-Content .env'],
  ['deny', 'type .\\.env'],
  ['deny', 'grep DATABASE .env'],
  ['deny', 'sed -n 1,5p .env | head'],
  ['deny', 'git show HEAD~3:.env'],
  ['deny', 'node -e "console.log(require(\'fs\').readFileSync(\'.env\',\'utf8\'))"'],
  ['deny', 'wc -l < .env'],
  ['deny', 'cp .env /tmp/x'],
  ['deny', 'git add -f .env'],
  // Needs the user's confirmation
  ['ask', 'npx prisma migrate dev --name add_x'],
  ['ask', 'npx prisma migrate deploy'],
  ['ask', 'npx prisma db push'],
  ['ask', 'npm run seed'],
  ['ask', 'npm run seed:demo'],
  ['ask', 'npm run unseed:demo'],
  ['ask', 'npm --prefix apps/api run seed'],
  ['ask', 'npm -w lumora-backend run seed'],
  ['ask', 'npm run seed -w lumora-backend'],
  ['ask', 'npx tsx prisma/seedDemo.ts'],
  ['ask', 'eas build --profile preview --platform android'],
  ['ask', 'eas update --channel preview'],
  ['ask', 'git push origin main'],
  ['ask', 'git -C apps/mobile push origin main'],
  ['ask', 'git push'],
  ['ask', 'git push --force origin feat/x'],
  ['ask', 'gh pr merge 3'],
  ['ask', 'cp .env.example .env'],
  ['ask', 'echo X=1 > .env'],
  ['ask', 'psql "$DATABASE_URL"'],
  // Left alone
  ['pass', 'npx tsc --noEmit'],
  ['pass', 'npm test'],
  ['pass', 'npm run verify'],
  ['pass', 'npx prisma validate'],
  ['pass', 'npx prisma generate'],
  ['pass', 'npx prisma migrate status'],
  ['pass', 'cat .env.example'],
  ['pass', 'grep -rn foo src --exclude=.env'],
  ['pass', 'ls -la .env'],
  ['pass', 'wc -c .env'],
  ['pass', 'git check-ignore .env'],
  ['pass', 'git status --short'],
  ['pass', 'git push -u origin feat/x'],
  ['pass', 'git commit -m "guard against prisma migrate reset; cat .env"'],
  ['pass', 'echo "never run npx prisma migrate reset"'],
  ['pass', 'grep -n "migrate reset" AGENTS.md'],
  ['pass', 'npm run dev'],
  ['pass', 'node --env-file=.env src/index.ts'],
];

let failed = 0;
for (const [want, command] of cases) {
  for (const tool of ['Bash', 'PowerShell']) {
    const run = spawnSync(process.execPath, [guard], {
      input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: tool, tool_input: { command } }),
      encoding: 'utf8',
    });
    const got = run.status !== 0
      ? `crash: ${run.stderr.slice(0, 120)}`
      : run.stdout.trim() ? JSON.parse(run.stdout).hookSpecificOutput.permissionDecision : 'pass';
    if (got !== want) {
      failed++;
      console.log(`FAIL [${tool}] want ${want}, got ${got}: ${command}`);
    }
  }
}
console.log(`guard: ${cases.length * 2 - failed}/${cases.length * 2} passed`);
process.exit(failed ? 1 : 0);
