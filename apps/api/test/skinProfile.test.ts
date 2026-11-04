import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SENSITIVITIES,
  avoidHits,
  computeCompleteness,
  conflictsWithProfile,
  deriveRestrictions,
  normalizeAvoidToken,
  normalizeProfile,
  profileFingerprint,
  validateSkinProfileInput,
  webProfileContext,
} from "../src/lib/skinProfile";
import { SENSITIVITY_INGREDIENTS, ingredientText } from "../src/lib/ingredientRules";

const legacy = { skinType: "oily", concerns: ["acne"], sensitivities: ["fragrance"], goals: ["clear skin"] };

test("every sensitivity the app offers has an ingredient rule", () => {
  for (const s of SENSITIVITIES) {
    assert.ok((SENSITIVITY_INGREDIENTS[s] ?? []).length > 0, `no rule for "${s}"`);
  }
});

test("an old-style payload is still valid", () => {
  const r = validateSkinProfileInput(
    { skinType: "Oily", concerns: ["Acne", "Fine lines"], sensitivities: ["Fragrance", "None that I know of"], goals: ["Clear skin"], climateZone: null },
    { partial: false },
  );
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.skinType, "oily");
    assert.deepEqual(r.value.concerns, ["acne", "fine lines"]);
    assert.deepEqual(r.value.sensitivities, ["fragrance"]);
    assert.deepEqual(r.value.goals, ["clear skin"]);
  }
});

test("rejects a missing or unknown skin type, non-objects and bad list types", () => {
  assert.equal(validateSkinProfileInput({}, { partial: false }).ok, false);
  assert.equal(validateSkinProfileInput({ skinType: "scaly" }, { partial: false }).ok, false);
  assert.equal(validateSkinProfileInput("oily", { partial: false }).ok, false);
  assert.equal(validateSkinProfileInput(null, { partial: false }).ok, false);
  assert.equal(validateSkinProfileInput({ skinType: "dry", concerns: "acne" }, { partial: false }).ok, false);
});

test("combo is accepted and unknown answers inside lists are dropped", () => {
  const r = validateSkinProfileInput({ skinType: "combo", concerns: ["acne", "made up", "ACNE"] }, { partial: false });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.skinType, "combination");
    assert.deepEqual(r.value.concerns, ["acne"]);
  }
});

test("partial updates return only the fields that were sent", () => {
  assert.deepEqual(validateSkinProfileInput({ skinTone: 4 }, { partial: true }), { ok: true, value: { skinTone: 4 } });
  assert.equal(validateSkinProfileInput({ skinTone: 9 }, { partial: true }).ok, false);
  assert.equal(validateSkinProfileInput({ skinTone: 2.5 }, { partial: true }).ok, false);
  assert.deepEqual(validateSkinProfileInput({ ageRange: null }, { partial: true }), { ok: true, value: { ageRange: null } });
  assert.equal(validateSkinProfileInput({ ageRange: "200+" }, { partial: true }).ok, false);
});

test("new fields are validated against their lists", () => {
  const r = validateSkinProfileInput(
    { sensitiveSkin: "Often", acneType: "cystic", specialSituations: ["Pregnant", "none"], ageRange: "25-34" },
    { partial: true },
  );
  assert.deepEqual(r, {
    ok: true,
    value: { sensitiveSkin: "often", acneType: "cystic", specialSituations: ["pregnant"], ageRange: "25-34" },
  });
  assert.equal(validateSkinProfileInput({ sensitiveSkin: "constantly" }, { partial: true }).ok, false);
  assert.equal(validateSkinProfileInput({ acneType: "weird" }, { partial: true }).ok, false);
});

test("typed ingredients are cleaned, capped and deduplicated", () => {
  assert.equal(normalizeAvoidToken("  Benzyl   Alcohol "), "benzyl alcohol");
  assert.equal(normalizeAvoidToken("a"), null);
  assert.equal(normalizeAvoidToken("<b>x</b>"), "bxb");
  assert.equal(normalizeAvoidToken("x".repeat(41)), null);
  const many = Array.from({ length: 15 }, (_, i) => `ingredient ${i}`);
  const r = validateSkinProfileInput({ avoidIngredients: [...many, "Ingredient 0"] }, { partial: true });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.avoidIngredients?.length, 10);
});

test("normalizeProfile treats legacy rows as unknown, not wrong", () => {
  const p = normalizeProfile(legacy);
  assert.equal(p.isSensitive, false);
  assert.equal(p.skinTone, null);
  assert.deepEqual(p.avoidIngredients, []);
  assert.deepEqual(p.specialSituations, []);
  assert.equal(normalizeProfile({ ...legacy, skinType: "Sensitive" }).isSensitive, true);
  assert.equal(normalizeProfile({ ...legacy, sensitiveSkin: "often" }).isSensitive, true);
  assert.equal(normalizeProfile({ ...legacy, sensitiveSkin: "rarely" }).isSensitive, false);
  assert.deepEqual(normalizeProfile({ ...legacy, sensitivities: ["none that i know of"] }).sensitivities, []);
});

test("completeness counts sections, and old profiles still count", () => {
  assert.deepEqual(computeCompleteness(legacy), { percent: 100, done: ["skin", "safety", "you"], missing: [] });
  const partial = computeCompleteness({ skinType: "dry", concerns: [], sensitivities: [], goals: [] });
  assert.deepEqual(partial, { percent: 33, done: ["skin"], missing: ["safety", "you"] });
  const saved = computeCompleteness({
    skinType: "dry",
    concerns: [],
    sensitivities: [],
    goals: [],
    completedSections: ["skin", "safety"],
  });
  assert.equal(saved.percent, 67);
});

test("pregnancy, breastfeeding and isotretinoin restrict retinoids", () => {
  for (const s of ["pregnant", "breastfeeding", "trying to conceive", "isotretinoin", "prescription retinoid"]) {
    const r = deriveRestrictions({ specialSituations: [s] });
    assert.equal(r.avoidRetinoids, true, s);
    assert.ok(r.retinoidReason && /doctor|dermatologist/i.test(r.retinoidReason));
  }
  assert.deepEqual(deriveRestrictions({ specialSituations: [] }), { avoidRetinoids: false, retinoidReason: null });
});

test("avoidHits finds sensitivities, typed ingredients and restricted retinoids", () => {
  const text = ingredientText(["Aqua", "Retinol", "Parfum", "Benzyl Alcohol", "Dimethicone"], "Night Serum");
  const p = normalizeProfile({
    ...legacy,
    avoidIngredients: ["benzyl alcohol", "silicones"],
    specialSituations: ["pregnant"],
  });
  const hits = avoidHits(text, p);
  assert.equal(hits.sensitivity[0]?.found, "parfum");
  assert.deepEqual(hits.custom.map((h) => h.label), ["benzyl alcohol", "silicones"]);
  assert.equal(hits.retinoid?.found, "retinol");
});

test("bakuchiol is not treated as a retinoid", () => {
  const p = normalizeProfile({ ...legacy, sensitivities: [], specialSituations: ["pregnant"] });
  assert.equal(avoidHits(ingredientText(["Aqua", "Bakuchiol"]), p).retinoid, null);
});

test("conflictsWithProfile is false for a legacy profile and a clean product", () => {
  assert.equal(conflictsWithProfile(ingredientText(["Aqua", "Glycerin"]), legacy), false);
  assert.equal(conflictsWithProfile(ingredientText(["Aqua", "Parfum"]), legacy), true);
});

test("the web context shares the derived restriction, never the health answer", () => {
  const ctx = webProfileContext(
    normalizeProfile({ ...legacy, skinTone: 3, specialSituations: ["pregnant"], avoidIngredients: ["benzyl alcohol"] }),
  );
  assert.equal(ctx.avoidRetinoids, true);
  assert.deepEqual(ctx.avoidIngredients, ["benzyl alcohol"]);
  assert.match(ctx.skinTone ?? "", /medium/);
  assert.equal(JSON.stringify(ctx).includes("pregnant"), false);
});

test("the fingerprint changes when the profile changes and ignores order", () => {
  const a = profileFingerprint(legacy);
  assert.equal(a, profileFingerprint({ ...legacy }));
  assert.notEqual(a, profileFingerprint({ ...legacy, skinType: "dry" }));
  assert.notEqual(a, profileFingerprint({ ...legacy, specialSituations: ["pregnant"] }));
  assert.equal(
    profileFingerprint({ ...legacy, concerns: ["acne", "dryness"] }),
    profileFingerprint({ ...legacy, concerns: ["dryness", "acne"] }),
  );
});
