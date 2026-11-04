import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import {
  BCRYPT_COST,
  hashPassword,
  isValidEmail,
  needsRehash,
  normalizeEmail,
  normalizeName,
  validatePassword,
  verifyPassword,
} from "../src/lib/password";

test("accepts a reasonable password", () => {
  assert.equal(validatePassword("glowSkin2026"), null);
});

test("rejects missing, short, long, and unsuitable passwords", () => {
  assert.match(validatePassword(undefined) ?? "", /required/i);
  assert.match(validatePassword("abc123") ?? "", /at least 8/);
  assert.match(validatePassword("a1".repeat(40)) ?? "", /too long/);
  assert.match(validatePassword("onlyletters") ?? "", /letter and one number/);
  assert.match(validatePassword("12345678") ?? "", /letter and one number/);
});

test("counts bytes, not characters, against the bcrypt limit", () => {
  // 30 emoji = 120 bytes but only 30 characters (60 UTF-16 units).
  assert.match(validatePassword("a1" + "🙂".repeat(30)) ?? "", /too long/);
});

test("rejects common passwords regardless of case", () => {
  assert.match(validatePassword("Password123") ?? "", /too common/);
  assert.match(validatePassword("QWERTY123") ?? "", /too common/);
});

test("rejects passwords containing the email name or display name", () => {
  assert.match(validatePassword("shivam2026x", { email: "shivam@example.com" }) ?? "", /email/);
  assert.match(validatePassword("Anshika99pass", { name: "Anshika" }) ?? "", /name/);
  // Short local parts are ignored: too many false positives.
  assert.equal(validatePassword("joe12345xyz", { email: "joe@example.com" }), null);
});

test("hashes with the current cost and verifies", async () => {
  const hash = await hashPassword("glowSkin2026");
  assert.equal(bcrypt.getRounds(hash), BCRYPT_COST);
  assert.equal(await verifyPassword("glowSkin2026", hash), true);
  assert.equal(await verifyPassword("wrongPass1", hash), false);
});

test("verifyPassword is false when the account has no hash", async () => {
  assert.equal(await verifyPassword("whatever1", null), false);
  assert.equal(await verifyPassword("whatever1", undefined), false);
});

test("needsRehash flags old low-cost hashes only", async () => {
  assert.equal(needsRehash(bcrypt.hashSync("x", 10)), true);
  assert.equal(needsRehash(await hashPassword("x1234567")), false);
  assert.equal(needsRehash("not-a-bcrypt-hash"), false);
});

test("normalizeEmail trims and lowercases, and rejects non-strings", () => {
  assert.equal(normalizeEmail("  Shivam@Example.COM "), "shivam@example.com");
  assert.equal(normalizeEmail(""), null);
  assert.equal(normalizeEmail(42), null);
  assert.equal(normalizeEmail(undefined), null);
});

test("isValidEmail", () => {
  assert.equal(isValidEmail("a@b.co"), true);
  assert.equal(isValidEmail("a b@c.com"), false);
  assert.equal(isValidEmail("no-at-sign.com"), false);
  assert.equal(isValidEmail("a@b"), false);
  assert.equal(isValidEmail("a@" + "b".repeat(250) + ".com"), false);
});

test("normalizeName collapses spaces and enforces length", () => {
  assert.equal(normalizeName("  Anshika   Gupta "), "Anshika Gupta");
  assert.equal(normalizeName("A"), null);
  assert.equal(normalizeName("x".repeat(61)), null);
  assert.equal(normalizeName(null), null);
});
