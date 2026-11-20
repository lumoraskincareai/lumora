// Runs from the root `prepare` script after `npm install` / `npm ci`. Points git at .githooks/.
// Does nothing when there is no .git folder (CI tarballs, Docker builds) so installs never fail.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
if (!fs.existsSync(path.join(root, ".git"))) process.exit(0);

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: root, stdio: "ignore" });
  console.log("git hooks installed (core.hooksPath = .githooks)");
} catch {
  console.warn("could not set core.hooksPath; run: git config core.hooksPath .githooks");
}
