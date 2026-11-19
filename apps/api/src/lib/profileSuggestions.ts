// "For you" suggestions on the home page, built only from what the person
// told us in onboarding (concerns, goals, skin type, acne type, sensitivities,
// avoid-list, special situations, budget). No face scan, no AI: every item
// cites the answer that produced it.
//
// Safety: anything that hits the avoid-list, a chosen sensitivity, or a
// retinoid restriction is dropped (conflictsWithProfile). Products the person
// already owns come first and cost nothing against the budget.

import type { Product } from "@prisma/client";
import { CONCERN_DEFS } from "./skinConcerns";
import type { ConcernKey } from "./skinConcerns";
import { conflictsWithProfile, normalizeProfile, type NormalizedProfile, type ProfileRow } from "./skinProfile";
import type { OwnedProduct, SuggestedItem } from "./scanSuggestions";

export const MAX_AREAS = 3;
export const PER_AREA = 2;

export interface FocusArea {
  key: string;
  label: string;
  keywords: string[];
  /** Why this area is on the list, citing the onboarding answer. */
  reason: string;
  tips: string[];
}

export interface AreaSuggestions {
  key: string;
  label: string;
  reason: string;
  items: SuggestedItem[];
  tips: string[];
  emptyReason: string | null;
}

export interface ProfileSuggestions {
  /** Short chips echoing the answers used, e.g. "Combination skin". */
  basedOn: string[];
  budget: number | null;
  areas: AreaSuggestions[];
  plan: { total: number; productCount: number };
}

// Onboarding concern → area. Concerns without a scan-style definition get one here.
const CONCERN_AREAS: Record<string, { label: string; keywords: string[]; defKey?: ConcernKey; tips?: string[] }> = {
  acne: { label: "Acne & breakouts", keywords: [], defKey: "acne" },
  pigmentation: { label: "Pigmentation & dark spots", keywords: [], defKey: "darkSpots" },
  dryness: { label: "Dryness", keywords: [], defKey: "dryness" },
  dullness: { label: "Dullness", keywords: [], defKey: "dullness" },
  "large pores": { label: "Pores & oil", keywords: [], defKey: "oiliness" },
  "dark circles": { label: "Dark circles", keywords: [], defKey: "darkCircles" },
  "fine lines": {
    label: "Fine lines",
    keywords: ["retinol", "peptide", "vitamin c", "bakuchiol"],
    tips: [
      "Daily sunscreen is the most proven anti-aging step.",
      "Introduce a retinoid slowly, two nights a week, and moisturize after.",
    ],
  },
  redness: {
    label: "Redness",
    keywords: ["centella", "cica", "azelaic", "niacinamide", "panthenol"],
    tips: [
      "Use lukewarm water and pat dry instead of rubbing.",
      "Skip hot showers and harsh scrubs while skin is red.",
    ],
  },
};

// Goals that add something concerns don't already cover.
const GOAL_AREAS: Record<string, { label: string; keywords: string[]; defKey?: ConcernKey; tips?: string[] }> = {
  "clear skin": { label: "Clear skin", keywords: [], defKey: "acne" },
  "even tone": { label: "Even tone", keywords: [], defKey: "darkSpots" },
  "oil control": { label: "Oil control", keywords: [], defKey: "oiliness" },
  hydration: {
    label: "Hydration",
    keywords: ["hyaluronic", "ceramide", "glycerin", "squalane"],
    tips: ["Moisturize on damp skin to lock in water."],
  },
  "anti-aging": {
    label: "Anti-aging",
    keywords: ["retinol", "peptide", "vitamin c"],
    tips: ["Sunscreen every morning does more than any serum."],
  },
};

// Used when concerns and goals leave room, so even a sparse profile gets something.
const SKIN_TYPE_AREAS: Record<string, { label: string; keywords: string[]; tips: string[] }> = {
  dry: { label: "Dry skin care", keywords: ["ceramide", "hyaluronic", "glycerin", "squalane"], tips: ["Use a cream moisturizer, not a gel, at night."] },
  oily: { label: "Oily skin care", keywords: ["niacinamide", "salicylic", "zinc", "clay"], tips: ["Do not skip moisturizer; dehydrated skin gets oilier."] },
  combination: { label: "Combination skin care", keywords: ["niacinamide", "hyaluronic", "glycerin"], tips: ["Treat the T-zone and cheeks differently if needed."] },
  normal: { label: "Everyday balance", keywords: ["ceramide", "hyaluronic", "niacinamide"], tips: ["Keep it simple: cleanser, moisturizer, sunscreen."] },
  sensitive: { label: "Gentle care", keywords: ["centella", "cica", "panthenol", "ceramide"], tips: ["Introduce one new product at a time and patch test first."] },
};

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function areaFrom(
  spec: { label: string; keywords: string[]; defKey?: ConcernKey; tips?: string[] },
  key: string,
  reason: string,
): FocusArea {
  const def = spec.defKey ? CONCERN_DEFS[spec.defKey] : null;
  return {
    key,
    label: spec.label,
    keywords: def ? def.keywords : spec.keywords,
    reason,
    tips: (def ? def.freeTips : (spec.tips ?? [])).slice(0, 2),
  };
}

/**
 * Up to MAX_AREAS areas to focus on, in priority order: concerns in the
 * order the person ranked them, then goals, then their skin type.
 * Areas that would repeat the same ingredients are merged away.
 */
export function focusAreas(p: NormalizedProfile): FocusArea[] {
  const out: FocusArea[] = [];
  const seen = new Set<string>();
  const add = (a: FocusArea) => {
    const sig = [...a.keywords].sort().join("|");
    if (out.length >= MAX_AREAS || seen.has(sig) || !a.keywords.length) return;
    seen.add(sig);
    out.push(a);
  };

  for (const concern of p.concerns) {
    const spec = CONCERN_AREAS[concern];
    if (!spec) continue;
    let reason = `You told us ${concern} is a concern`;
    if (concern === "acne" && p.acneType) reason += ` (${p.acneType})`;
    const area = areaFrom(spec, `concern:${concern}`, reason);
    if (concern === "acne" && (p.acneType === "cystic" || p.acneType === "hormonal")) {
      area.tips = [
        ...area.tips.slice(0, 1),
        `${titleCase(p.acneType)} acne often needs more than skincare; a dermatologist can help.`,
      ];
    }
    if (concern === "acne" && p.acneType === "blackheads") {
      area.keywords = ["salicylic acid", "niacinamide", "clay", "zinc"];
    }
    add(area);
  }
  for (const goal of p.goals) {
    const spec = GOAL_AREAS[goal];
    if (spec) add(areaFrom(spec, `goal:${goal}`, `Your goal is ${goal}`));
  }
  const skin = SKIN_TYPE_AREAS[p.skinType];
  if (skin) {
    add({
      key: `skin:${p.skinType}`,
      label: skin.label,
      keywords: skin.keywords,
      reason: `You have ${p.skinType} skin`,
      tips: skin.tips,
    });
  }
  return out;
}

function productText(p: Product) {
  return `${p.name} ${p.category} ${p.ingredients.join(" ")}`.toLowerCase();
}

function ownedText(up: OwnedProduct) {
  return up.product ? productText(up.product) : (up.customName ?? "").toLowerCase();
}

// Strong actives that sensitive skin should meet later, so they rank lower.
const STRONG_ACTIVES = ["retinol", "glycolic", "lactic", "salicylic", "alpha hydroxy", "tretinoin"];

/** Chips echoing the answers the suggestions were built from. */
export function basedOnChips(p: NormalizedProfile): string[] {
  const chips: string[] = [];
  if (p.skinType) chips.push(`${titleCase(p.skinType)} skin`);
  if (p.isSensitive && p.skinType !== "sensitive") chips.push("Sensitive");
  for (const c of p.concerns.slice(0, 2)) chips.push(titleCase(c));
  if (p.sensitivities.length) chips.push(`No ${p.sensitivities.slice(0, 2).join(", ")}`);
  if (p.monthlyBudget != null) chips.push(`Up to ₹${p.monthlyBudget}`);
  return chips.slice(0, 6);
}

export function buildProfileSuggestions(input: {
  profile: ProfileRow;
  catalog: Product[];
  owned: OwnedProduct[];
  now: Date;
}): ProfileSuggestions {
  const { profile, catalog, owned, now } = input;
  const p = normalizeProfile(profile);
  const budget = p.monthlyBudget;
  const areas = focusAreas(p);

  const usableOwned = owned.filter(
    (up) =>
      !up.isFinished &&
      !(up.expiresAt && up.expiresAt.getTime() < now.getTime()) &&
      !conflictsWithProfile(ownedText(up), profile),
  );
  const ownedProductIds = new Set(owned.map((up) => up.productId).filter(Boolean));
  const usableCatalog = catalog.filter(
    (c) => !ownedProductIds.has(c.id) && !conflictsWithProfile(productText(c), profile),
  );

  const used = new Set<string>(); // never suggest the same product in two areas
  let total = 0;

  const result: AreaSuggestions[] = areas.map((area) => {
    const items: SuggestedItem[] = [];

    for (const up of usableOwned) {
      if (items.length >= 1) break;
      const key = `owned:${up.id}`;
      if (used.has(key)) continue;
      const text = ownedText(up);
      const kw = area.keywords.find((k) => text.includes(k));
      if (!kw) continue;
      used.add(key);
      items.push({
        productId: up.productId,
        userProductId: up.id,
        name: up.product?.name ?? up.customName ?? "Your product",
        brand: up.product?.brand ?? up.customBrand ?? "",
        price: null,
        category: up.product?.category ?? null,
        keyIngredient: kw,
        why: `You already own this and it contains ${kw}. ${area.reason}.`,
        tag: "owned",
        url: null,
        alsoFor: [],
      });
    }

    const ranked = usableCatalog
      .flatMap((c) => {
        if (used.has(c.id)) return [];
        const text = productText(c);
        const hits = area.keywords.filter((k) => text.includes(k));
        if (!hits.length) return [];
        const gentle = p.isSensitive && STRONG_ACTIVES.some((a) => text.includes(a)) ? -150 : 0;
        const rank = (c.isPromoted ? 50 : 0) + hits.length * 100 + gentle - c.price / 100;
        return [{ c, hits, rank }];
      })
      .sort((a, b) => b.rank - a.rank);

    let skippedForBudget = false;
    for (const { c, hits } of ranked) {
      if (items.length >= PER_AREA) break;
      const price = c.price > 0 ? c.price : 0;
      if (budget != null && total + price > budget) {
        skippedForBudget = true;
        continue;
      }
      total += price;
      used.add(c.id);
      items.push({
        productId: c.id,
        userProductId: null,
        name: c.name,
        brand: c.brand,
        price: c.price > 0 ? c.price : null,
        category: c.category,
        keyIngredient: hits[0]!,
        why: `${area.reason}, and its ${hits.slice(0, 2).join(" and ")} helps with that.`,
        tag: c.isPromoted ? "featured" : "catalog",
        url: null,
        alsoFor: [],
      });
    }

    return {
      key: area.key,
      label: area.label,
      reason: area.reason,
      items,
      tips: area.tips,
      emptyReason: items.length
        ? null
        : skippedForBudget
          ? `Nothing here fits what is left of your ₹${budget} budget.`
          : "No matching products yet. The free tips below still apply.",
    };
  });

  return {
    basedOn: basedOnChips(p),
    budget,
    areas: result,
    plan: { total, productCount: used.size },
  };
}
