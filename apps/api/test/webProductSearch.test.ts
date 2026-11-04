import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, type SearchInput } from "../src/lib/webProductSearch";
import { normalizeProfile, webProfileContext } from "../src/lib/skinProfile";

const base: SearchInput = {
  concerns: [{ key: "acne", label: "Acne & breakouts", score: 70, detected: true }],
  skinType: "oily",
  sensitivities: ["fragrance"],
  budget: 1500,
  ownedNames: ["Clear Gel"],
};

test("the prompt is unchanged when there is no extra context", () => {
  const prompt = buildPrompt(base);
  assert.match(prompt, /Skin type: oily/);
  assert.doesNotMatch(prompt, /Skin tone|Age range|Also avoid|retinoid \(retinol/);
  assert.match(prompt, /Monthly skincare budget: ₹1500/);
});

test("allowlisted context lines are added", () => {
  const context = webProfileContext(
    normalizeProfile({
      skinType: "oily",
      concerns: [],
      sensitivities: [],
      goals: [],
      skinTone: 2,
      ageRange: "25-34",
      sensitiveSkin: "often",
      avoidIngredients: ["benzyl alcohol"],
    }),
  );
  const prompt = buildPrompt({ ...base, context });
  assert.match(prompt, /Skin tone: fair/);
  assert.match(prompt, /Age range: 25-34/);
  assert.match(prompt, /Skin reacts easily: yes/);
  assert.match(prompt, /Also avoid these ingredients: benzyl alcohol/);
});

test("a health answer reaches the prompt only as 'do not suggest a retinoid'", () => {
  const context = webProfileContext(
    normalizeProfile({ skinType: "dry", concerns: [], sensitivities: [], goals: [], specialSituations: ["pregnant"] }),
  );
  const prompt = buildPrompt({ ...base, context });
  assert.match(prompt, /Do not suggest any retinoid/);
  assert.doesNotMatch(prompt, /pregnan|breastfeed|isotretinoin/i);
});
