// src/lib/password.ts
//
// Password and email rules for sign-up / reset, plus bcrypt helpers.
// Pure except for hashing: no DB, no network (so it can be unit tested).
//
// Keep PASSWORD_RULES in step with apps/mobile/src/lib/validation/password.ts.

import bcrypt from "bcrypt";

/** bcrypt work factor for new hashes. 10 was the old value; 12 is ~4x slower to brute force. */
export const BCRYPT_COST = 12;

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt silently ignores everything after 72 bytes, so refuse longer input instead of truncating. */
export const PASSWORD_MAX_BYTES = 72;

// Small blocklist of the passwords attackers try first. Not exhaustive: it only
// stops the obvious ones that still satisfy "letter + number".
const COMMON_PASSWORDS = new Set([
  "password1",
  "password12",
  "password123",
  "passw0rd",
  "qwerty123",
  "qwertyuiop1",
  "abc12345",
  "abcd1234",
  "iloveyou1",
  "welcome1",
  "welcome123",
  "letmein123",
  "admin123",
  "lumora123",
  "lumora1234",
  "12345678a",
  "a12345678",
  "1q2w3e4r",
  "1qaz2wsx",
]);

export interface PasswordContext {
  email?: string | undefined;
  name?: string | undefined;
}

/**
 * Returns a user-facing error message, or null when the password is acceptable.
 * Only apply this when someone *sets* a password (sign-up, reset). Never on
 * login: existing accounts may have shorter passwords that still have to work.
 */
export function validatePassword(password: unknown, ctx: PasswordContext = {}): string | null {
  if (typeof password !== "string" || password.length === 0) {
    return "Password required";
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
    return "Password is too long (72 bytes at most)";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number";
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "That password is too common. Choose a less predictable one";
  }

  const lower = password.toLowerCase();
  const local = ctx.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) {
    return "Password can't contain your email address";
  }
  const name = ctx.name?.trim().toLowerCase();
  if (name && name.length >= 4 && lower.includes(name)) {
    return "Password can't contain your name";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

// Verified against when the account doesn't exist, so a login for an unknown
// email takes as long as one for a real email (no timing-based account probing).
const DUMMY_HASH = bcrypt.hashSync("lumora-dummy-password", BCRYPT_COST);

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  const valid = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return hash ? valid : false;
}

/** True when a stored hash was made with a lower cost than we use now. */
export function needsRehash(hash: string): boolean {
  try {
    return bcrypt.getRounds(hash) < BCRYPT_COST;
  } catch {
    return false;
  }
}

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const value = email.trim().toLowerCase();
  return value.length > 0 ? value : null;
}

// Deliberately simple: one @, something on both sides, a dot in the domain, no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;

export function normalizeName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const value = name.trim().replace(/\s+/g, " ");
  if (value.length < NAME_MIN_LENGTH || value.length > NAME_MAX_LENGTH) return null;
  return value;
}
