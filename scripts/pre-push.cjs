// Runs from .githooks/pre-push. Blocks on `npm run verify`, and prints warnings about contracts and deploy risk.
const { execFileSync, spawnSync } = require("node:child_process");
const { pushWarnings } = require("./lib/gates.cjs");

const git = (...args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

// What does this push add? Compare with the upstream, then origin/main, then the previous commit.
const base = ["@{upstream}", "origin/main", "HEAD~1"].find((ref) => git("rev-parse", "--verify", "--quiet", ref));
const changed = base ? git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean) : [];

for (const w of pushWarnings(changed)) console.warn(`\n[warning] ${w}`);

if (process.env.SKIP_VERIFY === "1") {
  console.warn("\n[warning] SKIP_VERIFY=1, so verify was skipped. CI will still run it.\n");
  process.exit(0);
}

console.log("\nRunning npm run verify before the push (typecheck, tests, lint, guard test)...\n");
const run = spawnSync("npm", ["run", "verify"], { stdio: "inherit", shell: true });
if (run.status !== 0) {
  console.error("\nPush blocked: npm run verify failed. Fix it and push again.\n");
  process.exit(1);
}
