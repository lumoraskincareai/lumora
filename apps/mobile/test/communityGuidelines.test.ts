import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GUIDELINES,
  GUIDELINES_VERSION,
  CONTENT_MAX,
  TITLE_MAX,
  acceptanceKey,
  acceptGuidelines,
  hasAcceptedGuidelines,
  validatePostDraft,
  timeAgo,
  emptyFeedCopy,
  type KeyValueStore,
} from "../src/lib/communityGuidelines";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    async getItem(k) {
      return k in data ? data[k] : null;
    },
    async setItem(k, v) {
      data[k] = v;
    },
  };
}

describe("guidelines content", () => {
  test("has rules with unique ids and non-empty text", () => {
    assert.ok(GUIDELINES.length >= 4);
    assert.equal(new Set(GUIDELINES.map((g) => g.id)).size, GUIDELINES.length);
    for (const g of GUIDELINES) {
      assert.ok(g.title.trim());
      assert.ok(g.body.trim());
    }
  });
});

describe("guidelines acceptance", () => {
  test("new user has not accepted", async () => {
    assert.equal(await hasAcceptedGuidelines(memoryStore(), "u1"), false);
  });

  test("missing user id never counts as accepted", async () => {
    assert.equal(await hasAcceptedGuidelines(memoryStore(), undefined), false);
    assert.equal(await hasAcceptedGuidelines(memoryStore(), null), false);
  });

  test("accepting persists for that user", async () => {
    const store = memoryStore();
    await acceptGuidelines(store, "u1", new Date("2026-01-01T00:00:00Z"));
    assert.equal(await hasAcceptedGuidelines(store, "u1"), true);
    const saved = JSON.parse(store.data[acceptanceKey("u1")]);
    assert.equal(saved.version, GUIDELINES_VERSION);
    assert.equal(saved.acceptedAt, "2026-01-01T00:00:00.000Z");
  });

  test("acceptance is per user", async () => {
    const store = memoryStore();
    await acceptGuidelines(store, "u1");
    assert.equal(await hasAcceptedGuidelines(store, "u2"), false);
  });

  test("an older accepted version must be re-accepted", async () => {
    const store = memoryStore({
      [acceptanceKey("u1")]: JSON.stringify({ version: GUIDELINES_VERSION - 1 }),
    });
    assert.equal(await hasAcceptedGuidelines(store, "u1"), false);
  });

  test("corrupt or throwing storage falls back to asking again", async () => {
    const corrupt = memoryStore({ [acceptanceKey("u1")]: "{not json" });
    assert.equal(await hasAcceptedGuidelines(corrupt, "u1"), false);
    const noVersion = memoryStore({ [acceptanceKey("u1")]: "{}" });
    assert.equal(await hasAcceptedGuidelines(noVersion, "u1"), false);
    const broken: KeyValueStore = {
      getItem: async () => {
        throw new Error("disk");
      },
      setItem: async () => {},
    };
    assert.equal(await hasAcceptedGuidelines(broken, "u1"), false);
  });
});

describe("validatePostDraft", () => {
  test("rejects empty and whitespace-only content", () => {
    assert.ok(validatePostDraft({ title: "", content: "" }));
    assert.ok(validatePostDraft({ title: "Hi", content: "   \n " }));
  });

  test("accepts normal content with or without a title", () => {
    assert.equal(validatePostDraft({ title: "", content: "Hello" }), null);
    assert.equal(validatePostDraft({ title: "T", content: "Hello" }), null);
  });

  test("enforces content and title limits at the boundary", () => {
    assert.equal(
      validatePostDraft({ title: "", content: "a".repeat(CONTENT_MAX) }),
      null,
    );
    assert.ok(
      validatePostDraft({ title: "", content: "a".repeat(CONTENT_MAX + 1) }),
    );
    assert.equal(
      validatePostDraft({ title: "t".repeat(TITLE_MAX), content: "x" }),
      null,
    );
    assert.ok(
      validatePostDraft({ title: "t".repeat(TITLE_MAX + 1), content: "x" }),
    );
  });

  test("trims before measuring", () => {
    assert.equal(
      validatePostDraft({ title: "", content: `  ${"a".repeat(CONTENT_MAX)}  ` }),
      null,
    );
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-06-01T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const MIN = 60_000;

  test("formats each range", () => {
    assert.equal(timeAgo(ago(10_000), now), "now");
    assert.equal(timeAgo(ago(5 * MIN), now), "5m");
    assert.equal(timeAgo(ago(59 * MIN), now), "59m");
    assert.equal(timeAgo(ago(60 * MIN), now), "1h");
    assert.equal(timeAgo(ago(23 * 60 * MIN), now), "23h");
    assert.equal(timeAgo(ago(24 * 60 * MIN), now), "1d");
    assert.equal(timeAgo(ago(6 * 24 * 60 * MIN), now), "6d");
    assert.equal(timeAgo(ago(14 * 24 * 60 * MIN), now), "2w");
    assert.equal(timeAgo(ago(65 * 24 * 60 * MIN), now), "2mo");
  });

  test("future timestamps read as now and bad dates as empty", () => {
    assert.equal(timeAgo(new Date(now + 5 * MIN).toISOString(), now), "now");
    assert.equal(timeAgo("not a date", now), "");
  });
});

describe("emptyFeedCopy", () => {
  test("bookmarks, all-category and specific-category copy differ", () => {
    assert.equal(emptyFeedCopy("bookmarks", "All").title, "No bookmarks yet");
    assert.equal(emptyFeedCopy("community", "All").title, "No posts yet");
    assert.equal(
      emptyFeedCopy("community", "Products").title,
      "Nothing in Products yet",
    );
  });
});
