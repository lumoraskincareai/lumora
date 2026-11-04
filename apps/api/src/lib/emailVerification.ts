// src/lib/emailVerification.ts
//
// Rules for the one-time code that verifies an email address at sign-up.
// Pure functions only (no DB, no network) so they can be unit tested.

import { randomInt } from "crypto";

export const VERIFY_CODE_TTL_MS = 15 * 60 * 1000;
export const VERIFY_RESEND_COOLDOWN_MS = 60 * 1000;
/** Wrong guesses allowed before the code is thrown away and a new one is needed. */
export const VERIFY_MAX_ATTEMPTS = 5;

export function generateVerificationCode(): string {
  return randomInt(100000, 1000000).toString();
}

export function isValidCodeFormat(code: unknown): code is string {
  return typeof code === "string" && /^\d{6}$/.test(code);
}

export function isCodeExpired(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  return !expiresAt || expiresAt.getTime() <= now.getTime();
}

/** False while the last code was sent less than a minute ago. */
export function canSendCode(sentAt: Date | null | undefined, now: Date = new Date()): boolean {
  return !sentAt || now.getTime() - sentAt.getTime() >= VERIFY_RESEND_COOLDOWN_MS;
}
