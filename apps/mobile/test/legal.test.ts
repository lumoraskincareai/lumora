import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { legalParts } from "../src/lib/legal";

describe("legalParts", () => {
  test("links only the pages that exist", () => {
    const parts = legalParts(null, "https://example.com/privacy");
    assert.equal(parts.find((p) => p.text === "Terms")?.url, null);
    assert.equal(parts.find((p) => p.text === "Privacy Policy")?.url, "https://example.com/privacy");
  });

  test("reads as one sentence", () => {
    assert.equal(
      legalParts("https://t", "https://p").map((p) => p.text).join(""),
      "By continuing, you agree to our Terms and Privacy Policy.",
    );
  });
});
