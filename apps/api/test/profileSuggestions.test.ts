// Tests for the home-page "For you" suggestions built from the onboarding
// profile. Plain objects in the Prisma shapes; no database.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Product, SkinProfile } from "@prisma/client";
import { buildProfileSuggestions, focusAreas, MAX_AREAS, PER_AREA } from "../src/lib/profileSuggestions";
import { normalizeProfile } from "../src/lib/skinProfile";
import type { OwnedProduct } from "../src/lib/scanSuggestions";

const NOW = new Date("2026-06-15T09:00:00Z");

function profile(o: Partial<SkinProfile> = {}): SkinProfile {
  return {
    id: "sp1",
    userId: "u1",
    skinType: "normal",
    concerns: [],
    sensitivities: [],
    goals: [],
    climateZone: null,
    monthlyBudget: null,
    sensitiveSkin: null,
    acneType: null,
    skinTone: null,
    ageRange: null,
    specialSituations: [],
    avoidIngredients: [],
    profileVersion: 2,
    completedSections: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...o,
  };
}

function product(o: Partial<Product> & { id: string; name: string }): Product {
  return {
    brand: "Brand",
    category: "serum",
    ingredients: [],
    price: 500,
    imageUrl: null,
    barcode: null,
    isPromoted: false,
    createdAt: NOW,
    ...o,
  };
}

function owned(o: Partial<OwnedProduct> & { id: string }): OwnedProduct {
  return {
    userId: "u1",
    productId: null,
    customName: null,
    customBrand: null,
    product: null,
    isFinished: false,
    expiresAt: null,
    quantityTotal: null,
    quantityLeft: null,
    ...o,
  } as OwnedProduct;
}

const catalog = [
  product({ id: "sal", name: "Clear Gel", ingredients: ["salicylic acid", "zinc"], price: 400 }),
  product({ id: "nia", name: "Tone Serum", ingredients: ["niacinamide"], price: 600 }),
  product({ id: "cer", name: "Barrier Cream", category: "moisturizer", ingredients: ["ceramide", "glycerin"], price: 700 }),
  product({ id: "frag", name: "Scented Cream", category: "moisturizer", ingredients: ["ceramide", "fragrance"], price: 300 }),
  product({ id: "ret", name: "Night Retinol", ingredients: ["retinol"], price: 900 }),
];

function ids(r: ReturnType<typeof buildProfileSuggestions>) {
  return r.areas.flatMap((a) => a.items.map((i) => i.productId));
}

describe("focusAreas", () => {
  test("follows concern order, then goals, then skin type, capped", () => {
    const p = normalizeProfile(
      profile({ skinType: "dry", concerns: ["dryness", "acne"], goals: ["oil control", "hydration"] }),
    );
    const areas = focusAreas(p);
    assert.ok(areas.length <= MAX_AREAS);
    assert.equal(areas[0]!.key, "concern:dryness");
    assert.equal(areas[1]!.key, "concern:acne");
  });

  test("a sparse profile still gets a skin-type area", () => {
    const areas = focusAreas(normalizeProfile(profile({ skinType: "oily" })));
    assert.equal(areas[0]!.key, "skin:oily");
  });

  test("areas with identical ingredients are not repeated", () => {
    const areas = focusAreas(normalizeProfile(profile({ concerns: ["acne"], goals: ["clear skin"] })));
    assert.equal(areas.filter((a) => a.label.match(/acne|clear/i)).length, 1);
  });

  test("acne type is cited and cystic points to a dermatologist", () => {
    const [a] = focusAreas(normalizeProfile(profile({ concerns: ["acne"], acneType: "cystic" })));
    assert.match(a!.reason, /cystic/);
    assert.ok(a!.tips.some((t) => /dermatologist/i.test(t)));
  });
});

describe("buildProfileSuggestions", () => {
  test("suggests products matching the stated concern and cites it", () => {
    const r = buildProfileSuggestions({ profile: profile({ concerns: ["acne"] }), catalog, owned: [], now: NOW });
    const first = r.areas[0]!;
    assert.equal(first.key, "concern:acne");
    assert.ok(first.items.length > 0 && first.items.length <= PER_AREA);
    assert.ok(first.items.every((i) => /acne/i.test(i.why)));
    assert.ok(ids(r).includes("sal"));
    assert.ok(r.basedOn.includes("Acne"));
  });

  test("drops products with a chosen sensitivity or avoid-list ingredient", () => {
    const r = buildProfileSuggestions({
      profile: profile({ concerns: ["dryness"], sensitivities: ["fragrance"], avoidIngredients: ["glycerin"] }),
      catalog,
      owned: [],
      now: NOW,
    });
    assert.ok(!ids(r).includes("frag"));
    assert.ok(!ids(r).includes("cer"));
  });

  test("never suggests a retinoid when pregnant", () => {
    const r = buildProfileSuggestions({
      profile: profile({ concerns: ["fine lines"], specialSituations: ["pregnant"] }),
      catalog,
      owned: [],
      now: NOW,
    });
    assert.ok(!ids(r).includes("ret"));
  });

  test("monthly budget caps the total across areas", () => {
    const r = buildProfileSuggestions({
      profile: profile({ concerns: ["acne", "dryness"], monthlyBudget: 1000 }),
      catalog,
      owned: [],
      now: NOW,
    });
    assert.ok(r.plan.total <= 1000);
  });

  test("explains an empty area caused by budget", () => {
    const r = buildProfileSuggestions({
      profile: profile({ concerns: ["dryness"], monthlyBudget: 50 }),
      catalog,
      owned: [],
      now: NOW,
    });
    assert.equal(r.areas[0]!.items.length, 0);
    assert.match(r.areas[0]!.emptyReason!, /budget/);
  });

  test("owned products come first, tagged, and cost nothing", () => {
    const mine = owned({ id: "up1", customName: "My Niacinamide Serum" });
    const r = buildProfileSuggestions({
      profile: profile({ concerns: ["pigmentation"], monthlyBudget: 100 }),
      catalog,
      owned: [mine],
      now: NOW,
    });
    const first = r.areas[0]!.items[0]!;
    assert.equal(first.tag, "owned");
    assert.equal(first.userProductId, "up1");
    assert.equal(r.plan.total, 0);
  });

  test("skips expired or finished owned products", () => {
    const expired = owned({ id: "a", customName: "Niacinamide old", expiresAt: new Date("2026-01-01") });
    const done = owned({ id: "b", customName: "Niacinamide done", isFinished: true });
    const r = buildProfileSuggestions({
      profile: profile({ concerns: ["pigmentation"] }),
      catalog: [],
      owned: [expired, done],
      now: NOW,
    });
    assert.equal(r.areas[0]!.items.length, 0);
  });

  test("does not suggest the same catalog product twice, or one already owned", () => {
    const r = buildProfileSuggestions({
      profile: profile({ concerns: ["acne", "pigmentation"] }),
      catalog,
      owned: [owned({ id: "up", productId: "nia", product: catalog[1]! })],
      now: NOW,
    });
    const all = ids(r).filter(Boolean);
    assert.equal(new Set(all).size, all.length);
    assert.ok(r.areas.flatMap((a) => a.items).filter((i) => i.tag !== "owned").every((i) => i.productId !== "nia"));
  });

  test("sensitive skin ranks strong actives below gentle matches", () => {
    const cat = [
      product({ id: "strong", name: "Peel", ingredients: ["salicylic acid", "zinc", "niacinamide"], price: 100 }),
      product({ id: "gentle", name: "Gentle", ingredients: ["niacinamide"], price: 100 }),
    ];
    const r = buildProfileSuggestions({
      profile: profile({ concerns: ["pigmentation"], sensitiveSkin: "often" }),
      catalog: cat,
      owned: [],
      now: NOW,
    });
    assert.equal(r.areas[0]!.items[0]!.productId, "gentle");
  });

  test("legacy sparse rows do not throw and still return areas with tips", () => {
    const r = buildProfileSuggestions({
      profile: profile({ skinType: "Combo", specialSituations: undefined as any, avoidIngredients: undefined as any }),
      catalog: [],
      owned: [],
      now: NOW,
    });
    assert.ok(r.areas.length > 0);
    assert.ok(r.areas[0]!.tips.length > 0);
  });
});
