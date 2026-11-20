// Runs from .githooks/pre-commit. Checks only what is staged.
const { execFileSync } = require("node:child_process");
const { checkFiles, checkAddedLines } = require("./lib/gates.cjs");

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const files = git("diff", "--cached", "--name-only", "--diff-filter=ACMR").split("\n").filter(Boolean);
if (files.length === 0) process.exit(0);

const problems = checkFiles(files);

// Collect only the added lines per file from the staged diff.
const addedByFile = {};
const diff = git("diff", "--cached", "--unified=0", "--no-color", "--diff-filter=ACMR");
let current = null;
for (const line of diff.split("\n")) {
  if (line.startsWith("+++ b/")) {
    current = line.slice(6);
    addedByFile[current] = [];
  } else if (line.startsWith("+++ ")) {
    current = null;
  } else if (current && line.startsWith("+") && !line.startsWith("+++")) {
    addedByFile[current].push(line.slice(1));
  }
}
problems.push(...checkAddedLines(addedByFile));

if (problems.length > 0) {
  console.error("\nCommit blocked by the pre-commit checks:\n");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("\nFix these, or if a line is a deliberate exception add `gate:allow` with a comment saying why.");
  console.error("Do not use --no-verify: CI runs the same checks.\n");
  process.exit(1);
}
