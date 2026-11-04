// src/lib/skinProfile.ts
//
// Everything about the skin profile that isn't a database call: the allowed
// answers, validation and normalisation of what the app sends, a score for
// how complete a profile is, and the safety restrictions derived from it.
// Pure functions only (no DB, no network), so the rules are unit tested.
//
// Keep the vocabularies in step with apps/mobile/src/lib/onboardingSteps.ts.
// Stored values are the lowercase labels the app has always saved, so rows
// written by older app builds stay valid.

import { createHash } from "crypto";
import { RETINOIDS_TO_AVOID, SENSITIVITY_INGREDIENTS, findAny, sensitivityHits } from "./ingredientRules";
import type { IngredientHit } from "./ingredientRules";

// ---- Vocabularies -----------------------------------------------------------

/** "sensitive" is only accepted for older app builds, which saved it as a skin type. */
export const SKIN_TYPES = ["oily", "dry", "combination", "normal", "sensitive"] as const;
export const SENSITIVITY_LEVELS = ["rarely", "sometimes", "often"] as const;
export const CONCERNS = [
  "acne",
  "pigmentation",
  "dryness",
  "fine lines",
  "dullness",
  "large pores",
  "dark circles",
  "redness",
] as const;
export const ACNE_TYPES = ["occasional", "hormonal", "cystic", "blackheads"] as const;
/** Every entry must have a rule in SENSITIVITY_INGREDIENTS (a test enforces it). */
export const SENSITIVITIES = ["fragrance", "alcohol", "sulfates", "essential oils", "parabens", "silicones"] as const;
export const GOALS = ["clear skin", "even tone", "anti-aging", "hydration", "oil control"] as const;
export const SPECIAL_SITUATIONS = [
  "pregnant",
  "breastfeeding",
  "trying to conceive",
  "isotretinoin",
  "prescription retinoid",
] as const;
export const AGE_RANGES = ["under 18", "18-24", "25-34", "35-44", "45-54", "55+"] as const;

export const PROFILE_SECTIONS = ["skin", "safety", "you"] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export const MAX_CONCERNS = 8;
export const MAX_GOALS = 5;
export const MAX_AVOID_INGREDIENTS = 10;
export const AVOID_TOKEN_MIN = 2;
export const AVOID_TOKEN_MAX = 40;

const LEGACY_NONE = /none/i;

// ---- Shapes -----------------------------------------------------------------

/** A SkinProfile row as the database returns it. The newer fields are absent on old rows. */
export interface ProfileRow {
  skinType: string;
  concerns: string[];
  sensitivities: string[];
  goals: string[];
  climateZone?: string | null;
  monthlyBudget?: number | null;
  sensitiveSkin?: string | null;
  acneType?: string | null;
  skinTone?: number | null;
  ageRange?: string | null;
  specialSituations?: string[] | null;
  avoidIngredients?: string[] | null;
  profileVersion?: number | null;
  completedSections?: string[] | null;
}

export interface NormalizedProfile {
  skinType: string;
  /** True when skin reacts "sometimes" or "often", or the legacy skin type was "sensitive". */
  isSensitive: boolean;
  sensitiveSkin: string | null;
  concerns: string[];
  sensitivities: string[];
  avoidIngredients: string[];
  specialSituations: string[];
  goals: string[];
  acneType: string | null;
  skinTone: number | null;
  ageRange: string | null;
  monthlyBudget: number | null;
}

/** What a validated request may write. Only the fields that were sent are present. */
export interface ProfileWrite {
  skinType?: string;
  sensitiveSkin?: string | null;
  concerns?: string[];
  acneType?: string | null;
  sensitivities?: string[];
  avoidIngredients?: string[];
  specialSituations?: string[];
  skinTone?: number | null;
  ageRange?: string | null;
  goals?: string[];
  climateZone?: string | null;
}

export type ValidationResult = { ok: true; value: ProfileWrite } | { ok: false; error: string };

// ---- Small helpers ----------------------------------------------------------

function lower(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

function inList<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/** Keeps only known answers, in the order given, without duplicates. */
function pickKnown(raw: unknown, allowed: readonly string[], aliases: Record<string, string> = {}): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const key = lower(item);
    const canonical = aliases[key] ?? key;
    if (inList(allowed, canonical)) out.push(canonical);
  }
  return dedupe(out);
}

/** A typed ingredient: lowercase, only letters, digits, spaces and . - ( ) %, 2-40 characters. */
export function normalizeAvoidToken(raw: unknown): string | null {
  const token = lower(raw).replace(/[^a-z0-9 .\-()%]/g, "").replace(/\s+/g, " ").trim();
  if (token.length < AVOID_TOKEN_MIN || token.length > AVOID_TOKEN_MAX) return null;
  return token;
}

// ---- Validation -------------------------------------------------------------

/**
 * Checks and cleans what the app sends. Unknown fields are ignored (a newer
 * app talking to an older server never breaks) and unknown answers inside a
 * list are dropped. With `partial`, only the fields that were sent are
 * returned, for editing one section at a time.
 */
export function validateSkinProfileInput(body: unknown, opts: { partial: boolean }): ValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Send your skin profile as an object" };
  }
  const b = body as Record<string, unknown>;
  const has = (k: string) => b[k] !== undefined;
  const out: ProfileWrite = {};

  // Skin type: required for a full profile.
  if (has("skinType") || !opts.partial) {
    const raw = lower(b.skinType);
    const skinType = raw === "combo" ? "combination" : raw;
    if (!inList(SKIN_TYPES, skinType)) {
      return { ok: false, error: "Choose a skin type: oily, dry, combination or normal" };
    }
    out.skinType = skinType;
  }

  if (has("sensitiveSkin")) {
    if (b.sensitiveSkin === null) out.sensitiveSkin = null;
    else {
      const level = lower(b.sensitiveSkin);
      if (!inList(SENSITIVITY_LEVELS, level)) {
        return { ok: false, error: "Skin sensitivity must be rarely, sometimes or often" };
      }
      out.sensitiveSkin = level;
    }
  }

  if (has("concerns") || !opts.partial) {
    if (b.concerns !== undefined && !Array.isArray(b.concerns)) return { ok: false, error: "Concerns must be a list" };
    out.concerns = pickKnown(b.concerns, CONCERNS).slice(0, MAX_CONCERNS);
  }

  if (has("acneType")) {
    if (b.acneType === null) out.acneType = null;
    else {
      const t = lower(b.acneType);
      if (!inList(ACNE_TYPES, t)) return { ok: false, error: "Unknown acne type" };
      out.acneType = t;
    }
  }

  if (has("sensitivities") || !opts.partial) {
    if (b.sensitivities !== undefined && !Array.isArray(b.sensitivities)) {
      return { ok: false, error: "Sensitivities must be a list" };
    }
    // "None that I know of" (sent by older builds) just means an empty list.
    out.sensitivities = pickKnown(b.sensitivities, SENSITIVITIES);
  }

  if (has("avoidIngredients")) {
    if (!Array.isArray(b.avoidIngredients)) return { ok: false, error: "Ingredients to avoid must be a list" };
    const tokens = b.avoidIngredients.map(normalizeAvoidToken).filter((t): t is string => t !== null);
    out.avoidIngredients = dedupe(tokens).slice(0, MAX_AVOID_INGREDIENTS);
  }

  if (has("specialSituations")) {
    if (!Array.isArray(b.specialSituations)) return { ok: false, error: "Special situations must be a list" };
    out.specialSituations = pickKnown(b.specialSituations, SPECIAL_SITUATIONS);
  }

  if (has("skinTone")) {
    if (b.skinTone === null) out.skinTone = null;
    else if (Number.isInteger(b.skinTone) && (b.skinTone as number) >= 1 && (b.skinTone as number) <= 6) {
      out.skinTone = b.skinTone as number;
    } else {
      return { ok: false, error: "Skin tone must be a number from 1 to 6" };
    }
  }

  if (has("ageRange")) {
    if (b.ageRange === null) out.ageRange = null;
    else {
      const a = lower(b.ageRange);
      if (!inList(AGE_RANGES, a)) return { ok: false, error: "Unknown age range" };
      out.ageRange = a;
    }
  }

  if (has("goals") || !opts.partial) {
    if (b.goals !== undefined && !Array.isArray(b.goals)) return { ok: false, error: "Goals must be a list" };
    out.goals = pickKnown(b.goals, GOALS, { "anti aging": "anti-aging", antiaging: "anti-aging" }).slice(0, MAX_GOALS);
  }

  if (has("climateZone")) {
    if (b.climateZone === null) out.climateZone = null;
    else if (typeof b.climateZone === "string") out.climateZone = b.climateZone.trim().slice(0, 40) || null;
    else return { ok: false, error: "Climate must be text" };
  }

  return { ok: true, value: out };
}

// ---- Normalising what's stored ---------------------------------------------

/**
 * One consistent view of a stored profile for every rule. Rows saved before
 * the newer questions existed are fine: missing answers become "unknown"
 * (null or empty), which every rule treats as "no change".
 */
export function normalizeProfile(row: ProfileRow): NormalizedProfile {
  const rawSkin = lower(row.skinType);
  const skinType = rawSkin === "combo" ? "combination" : rawSkin;
  const sensitiveSkin = row.sensitiveSkin && inList(SENSITIVITY_LEVELS, lower(row.sensitiveSkin)) ? lower(row.sensitiveSkin) : null;

  return {
    skinType,
    sensitiveSkin,
    isSensitive: sensitiveSkin === "sometimes" || sensitiveSkin === "often" || skinType === "sensitive",
    concerns: (row.concerns ?? []).map(lower).filter(Boolean),
    sensitivities: (row.sensitivities ?? []).map(lower).filter((s) => s && !LEGACY_NONE.test(s)),
    avoidIngredients: (row.avoidIngredients ?? []).map(lower).filter(Boolean),
    specialSituations: (row.specialSituations ?? []).map(lower).filter((s) => inList(SPECIAL_SITUATIONS, s)),
    goals: (row.goals ?? []).map(lower).filter(Boolean),
    acneType: row.acneType ? lower(row.acneType) : null,
    skinTone: typeof row.skinTone === "number" ? row.skinTone : null,
    ageRange: row.ageRange ? lower(row.ageRange) : null,
    monthlyBudget: typeof row.monthlyBudget === "number" ? row.monthlyBudget : null,
  };
}

// ---- Completeness -----------------------------------------------------------

export interface Completeness {
  percent: number;
  done: ProfileSection[];
  missing: ProfileSection[];
}

/**
 * How much of the profile is filled in, by section. Profiles saved by older
 * builds have no completedSections, so a section counts as done when its
 * old-style answers are there.
 */
export function computeCompleteness(row: ProfileRow): Completeness {
  const saved = new Set((row.completedSections ?? []).map(lower));
  const legacy: Record<ProfileSection, boolean> = {
    skin: !!row.skinType,
    safety: (row.sensitivities ?? []).length > 0,
    you: (row.goals ?? []).length > 0,
  };
  const done = PROFILE_SECTIONS.filter((s) => saved.has(s) || legacy[s]);
  const missing = PROFILE_SECTIONS.filter((s) => !done.includes(s));
  return { percent: Math.round((done.length / PROFILE_SECTIONS.length) * 100), done, missing };
}

// ---- Safety restrictions ----------------------------------------------------

export interface Restrictions {
  avoidRetinoids: boolean;
  /** A short, cautious explanation to show next to the warning; null when nothing is restricted. */
  retinoidReason: string | null;
}

/**
 * Turns the optional "special situations" answers into what to steer away
 * from. Wording stays cautious: this is information, not medical advice.
 */
export function deriveRestrictions(profile: Pick<NormalizedProfile, "specialSituations">): Restrictions {
  const s = new Set(profile.specialSituations);
  if (s.has("pregnant") || s.has("breastfeeding") || s.has("trying to conceive")) {
    return {
      avoidRetinoids: true,
      retinoidReason:
        "Retinoids are commonly advised against while pregnant, breastfeeding or trying to conceive. Check with your doctor before using it. This is general information, not medical advice.",
    };
  }
  if (s.has("isotretinoin")) {
    return {
      avoidRetinoids: true,
      retinoidReason:
        "Skin on isotretinoin is very sensitive, and extra retinoids can over-irritate it. Ask your dermatologist before adding one. This is general information, not medical advice.",
    };
  }
  if (s.has("prescription retinoid")) {
    return {
      avoidRetinoids: true,
      retinoidReason:
        "You already use a prescription retinoid, and adding another can over-irritate your skin. Ask your dermatologist before combining them.",
    };
  }
  return { avoidRetinoids: false, retinoidReason: null };
}

export interface AvoidResult {
  /** Matches for the sensitivities the person picked (fragrance, alcohol, ...). */
  sensitivity: IngredientHit[];
  /** Matches for ingredients they typed in themselves. */
  custom: IngredientHit[];
  /** The retinoid found, when their situation says to avoid retinoids. */
  retinoid: { found: string; reason: string } | null;
}

/** Everything in a product's ingredient text that this profile says to avoid. */
export function avoidHits(text: string, profile: NormalizedProfile): AvoidResult {
  const sensitivity = sensitivityHits(text, profile.sensitivities);
  const custom: IngredientHit[] = profile.avoidIngredients.flatMap((token) => {
    // A typed ingredient that is also a named sensitivity group (e.g. "fragrance") uses that group's list.
    const found = findAny(text, SENSITIVITY_INGREDIENTS[token] ?? [token]);
    return found ? [{ label: token, found }] : [];
  });

  const r = deriveRestrictions(profile);
  const retinoidFound = r.avoidRetinoids ? findAny(text, RETINOIDS_TO_AVOID) : null;
  return {
    sensitivity,
    custom,
    retinoid: retinoidFound && r.retinoidReason ? { found: retinoidFound, reason: r.retinoidReason } : null,
  };
}

/** True when the product has anything this profile says to avoid. */
export function conflictsWithProfile(text: string, row: ProfileRow): boolean {
  const hits = avoidHits(text, normalizeProfile(row));
  return hits.sensitivity.length > 0 || hits.custom.length > 0 || hits.retinoid !== null;
}

// ---- Context for the web search and its cache --------------------------------

const TONE_LABELS: Record<number, string> = {
  1: "very fair (always burns)",
  2: "fair (burns easily)",
  3: "medium (sometimes burns, tans slowly)",
  4: "olive (rarely burns)",
  5: "brown (very rarely burns)",
  6: "deep brown (almost never burns)",
};

export interface WebProfileContext {
  skinTone: string | null;
  ageRange: string | null;
  sensitiveSkin: boolean;
  avoidIngredients: string[];
  /** Only the derived restriction is shared, never the health answer behind it. */
  avoidRetinoids: boolean;
}

/** The only profile details the web-search prompt may carry, all from fixed lists or sanitised tokens. */
export function webProfileContext(profile: NormalizedProfile): WebProfileContext {
  return {
    skinTone: profile.skinTone != null ? (TONE_LABELS[profile.skinTone] ?? null) : null,
    ageRange: profile.ageRange,
    sensitiveSkin: profile.isSensitive,
    avoidIngredients: profile.avoidIngredients,
    avoidRetinoids: deriveRestrictions(profile).avoidRetinoids,
  };
}

/** A short stable fingerprint of everything that changes which products suit a person. */
export function profileFingerprint(row: ProfileRow): string {
  const p = normalizeProfile(row);
  const payload = JSON.stringify([
    p.skinType,
    p.isSensitive,
    [...p.concerns].sort(),
    [...p.sensitivities].sort(),
    [...p.avoidIngredients].sort(),
    deriveRestrictions(p).avoidRetinoids,
    p.skinTone,
    p.ageRange,
    p.monthlyBudget,
  ]);
  return createHash("sha1").update(payload).digest("hex").slice(0, 12);
}
