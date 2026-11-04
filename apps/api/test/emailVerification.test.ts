import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VERIFY_CODE_TTL_MS,
  VERIFY_RESEND_COOLDOWN_MS,
  canSendCode,
  generateVerificationCode,
  isCodeExpired,
  isValidCodeFormat,
} from "../src/lib/emailVerification";

test("generated codes are always six digits", () => {
  for (let i = 0; i < 500; i++) {
    assert.match(generateVerificationCode(), /^[1-9]\d{5}$/);
  }
});

test("isValidCodeFormat accepts exactly six digits", () => {
  assert.equal(isValidCodeFormat("123456"), true);
  assert.equal(isValidCodeFormat("12345"), false);
  assert.equal(isValidCodeFormat("1234567"), false);
  assert.equal(isValidCodeFormat("12a456"), false);
  assert.equal(isValidCodeFormat(" 12345"), false);
  assert.equal(isValidCodeFormat(123456), false);
  assert.equal(isValidCodeFormat(undefined), false);
});

test("isCodeExpired", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  assert.equal(isCodeExpired(null, now), true);
  assert.equal(isCodeExpired(undefined, now), true);
  assert.equal(isCodeExpired(new Date(now.getTime() - 1), now), true);
  assert.equal(isCodeExpired(new Date(now.getTime()), now), true);
  assert.equal(isCodeExpired(new Date(now.getTime() + VERIFY_CODE_TTL_MS), now), false);
});

test("canSendCode enforces the resend cooldown", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  assert.equal(canSendCode(null, now), true);
  assert.equal(canSendCode(new Date(now.getTime() - 5_000), now), false);
  assert.equal(canSendCode(new Date(now.getTime() - VERIFY_RESEND_COOLDOWN_MS), now), true);
});
