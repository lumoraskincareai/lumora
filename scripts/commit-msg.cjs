// Runs from .githooks/commit-msg with the path of the message file, and from CI on each PR commit.
const fs = require("node:fs");
const { checkCommitMessage } = require("./lib/gates.cjs");

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/commit-msg.cjs <message-file>");
  process.exit(2);
}
const message = fs.readFileSync(arg, "utf8");
const problems = checkCommitMessage(message.split("\n").filter((l) => !l.startsWith("#")).join("\n"));
if (problems.length > 0) {
  console.error("\nCommit message rejected:\n");
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\nExample: feat(mobile): add the new home screen\n');
  process.exit(1);
}
