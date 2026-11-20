const test = require("node:test");
const assert = require("node:assert/strict");
const { checkFiles, checkAddedLines, checkCommitMessage, pushWarnings } = require("./lib/gates.cjs");

// Fake secrets are built from pieces so this file does not trip the scanner itself.
const fake = {
  aws: "AKIA" + "ABCDEFGHIJKLMNOP",
  google: "AIza" + "SyA1234567890abcdefghijklmnopqrstuv",
  pem: "-----BEGIN " + "RSA PRIVATE KEY-----",
  db: "postgresql://lumora:" + "Sup3rSecretPw" + "@ep-cool-123.neon.tech/db",
};

test("forbidden files are refused, examples are allowed", () => {
  assert.equal(checkFiles(["apps/api/.env"]).length, 1);
  assert.equal(checkFiles(["apps/mobile/.env.production"]).length, 1);
  assert.equal(checkFiles(["apps/mobile/google-services.json"]).length, 1);
  assert.equal(checkFiles(["apps/mobile/release.keystore"]).length, 1);
  assert.equal(checkFiles(["apps/website/lumora-beta.apk"]).length, 1);
  assert.deepEqual(checkFiles(["apps/api/.env.example", "apps/api/src/index.ts", "README.md"]), []);
});

test("secrets in added lines are caught", () => {
  for (const line of [fake.aws, fake.google, fake.pem, fake.db]) {
    assert.equal(checkAddedLines({ "apps/api/src/x.ts": [`const v = "${line}"`] }).length > 0, true, line);
  }
  assert.equal(checkAddedLines({ "apps/api/src/x.ts": ['const password = "aVeryLongHardCodedPassword1234"'] }).length, 1);
});

test("safe lines pass: env reads, placeholders, examples, tests, gate:allow", () => {
  assert.deepEqual(checkAddedLines({ "apps/api/src/x.ts": ["const k = process.env.JWT_ACCESS_SECRET"] }), []);
  assert.deepEqual(checkAddedLines({ "apps/api/src/x.ts": ['const db = "postgresql://user:password@localhost/db"'] }), []);
  assert.deepEqual(checkAddedLines({ "apps/api/.env.example": [`KEY=${fake.google}`] }), []);
  assert.deepEqual(checkAddedLines({ "apps/api/test/x.test.ts": [`const k = "${fake.aws}"`] }), []);
  assert.deepEqual(checkAddedLines({ "apps/api/src/x.ts": [`const k = "${fake.aws}" // gate:allow public test id`] }), []);
});

test("mobile app code rules: console.log, debugger and local addresses", () => {
  const f = "apps/mobile/src/lib/x.ts";
  assert.equal(checkAddedLines({ [f]: ["console.log(user)"] }).length, 1);
  assert.equal(checkAddedLines({ [f]: ["debugger;"] }).length, 1);
  assert.equal(checkAddedLines({ [f]: ['const u = "http://localhost:4000"'] }).length, 1);
  assert.deepEqual(checkAddedLines({ [f]: ["console.warn('x')", "console.error(e)"] }), []);
  assert.deepEqual(checkAddedLines({ [f]: ["// talks to http://localhost:4000 in dev"] }), []);
  // API code and tests may log and use localhost.
  assert.deepEqual(checkAddedLines({ "apps/api/src/index.ts": ["console.log('listening on localhost:4000')"] }), []);
  assert.deepEqual(checkAddedLines({ "apps/mobile/test/x.test.ts": ["console.log(1)"] }), []);
});

test("commit messages must be conventional", () => {
  for (const ok of [
    "feat: add home screen",
    "fix(api): stop leaking the reset code",
    "feat(mobile)!: drop the old tab bar",
    "chore: bump deps",
    "Merge branch 'main' into x",
    'Revert "feat: x"',
  ]) {
    assert.deepEqual(checkCommitMessage(ok), [], ok);
  }
  for (const bad of ["updated stuff", "Feat: caps", "feat:no space", "feat(): empty scope", "feat: ends with a dot.", `feat: ${"x".repeat(100)}`, ""]) {
    assert.equal(checkCommitMessage(bad).length > 0, true, bad);
  }
});

test("push warnings", () => {
  assert.equal(pushWarnings(["apps/api/src/routes/users.ts"]).length, 1);
  assert.deepEqual(pushWarnings(["apps/api/src/routes/users.ts", "apps/mobile/src/api/users.ts"]), []);
  assert.equal(pushWarnings(["apps/api/prisma/migrations/2026_x/migration.sql"]).length, 1);
  assert.equal(pushWarnings(["apps/api/src/lib/features.ts"]).length, 1);
  assert.deepEqual(pushWarnings(["README.md"]), []);
});
