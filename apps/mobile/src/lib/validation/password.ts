import { z } from 'zod'

// Mirrors apps/api/src/lib/password.ts. The API is the one that enforces this;
// these rules exist so people see problems before they submit.
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_BYTES = 72

export interface PasswordRule {
  key: string
  label: string
  test: (password: string) => boolean
}

export const passwordRules: PasswordRule[] = [
  { key: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { key: 'letter', label: 'A letter', test: (p) => /[A-Za-z]/.test(p) },
  { key: 'number', label: 'A number', test: (p) => /[0-9]/.test(p) },
]

export function byteLength(value: string): number {
  // React Native's Hermes has no TextEncoder on every target, so count UTF-8 by hand.
  let bytes = 0
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4
  }
  return bytes
}

export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong'

/** A rough guide for the meter. The real checks are passwordRules and the server. */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return 'empty'
  const met = passwordRules.filter((rule) => rule.test(password)).length
  if (met < passwordRules.length) return 'weak'

  let variety = 0
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) variety++
  if (/[^A-Za-z0-9]/.test(password)) variety++
  if (password.length >= 12) variety++
  return variety >= 2 ? 'strong' : 'fair'
}

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((p) => byteLength(p) <= PASSWORD_MAX_BYTES, 'Password is too long')
  .refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), 'Include at least one letter and one number')
