import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  greetingFor,
  firstName,
  preferredTimeOfDay,
  pickRoutine,
  routineProgress,
  trendingPosts,
} from "../src/lib/homeCopy";

const at = (h: number) => new Date(2026, 0, 1, h, 0, 0);

describe("greetingFor", () => {
  test("changes with the time of day", () => {
    assert.equal(greetingFor(at(6)), "Good morning");
    assert.equal(greetingFor(at(13)), "Good afternoon");
    assert.equal(greetingFor(at(19)), "Good evening");
    assert.equal(greetingFor(at(23)), "Good night");
    assert.equal(greetingFor(at(2)), "Good night");
  });
});

describe("firstName", () => {
  test("takes the first word and tolerates empty input", () => {
    assert.equal(firstName("Anshika Sharma"), "Anshika");
    assert.equal(firstName("  Riya "), "Riya");
    assert.equal(firstName(""), "");
    assert.equal(firstName(null), "");
    assert.equal(firstName(undefined), "");
  });
});

describe("routines", () => {
  const morning = { timeOfDay: "morning" as const, steps: [{ completed: true }, { completed: false }] };
  const evening = { timeOfDay: "evening" as const, steps: [{ completed: false }] };

  test("preferredTimeOfDay switches at 15:00", () => {
    assert.equal(preferredTimeOfDay(at(9)), "morning");
    assert.equal(preferredTimeOfDay(at(14)), "morning");
    assert.equal(preferredTimeOfDay(at(15)), "evening");
  });

  test("pickRoutine prefers this time of day, falls back to the first, and handles none", () => {
    assert.equal(pickRoutine([morning, evening], at(8)), morning);
    assert.equal(pickRoutine([morning, evening], at(20)), evening);
    assert.equal(pickRoutine([morning], at(20)), morning);
    assert.equal(pickRoutine([], at(8)), null);
  });

  test("routineProgress counts completed steps", () => {
    assert.deepEqual(routineProgress(morning), { done: 1, total: 2 });
    assert.deepEqual(routineProgress({ timeOfDay: "morning", steps: [] }), { done: 0, total: 0 });
  });
});

describe("trendingPosts", () => {
  const p = (id: string, likes: number, commentCount: number, createdAt: string) => ({ id, likes, commentCount, createdAt });

  test("ranks by likes plus double comments, ties go to the newest, and respects the limit", () => {
    const posts = [
      p("a", 10, 0, "2026-01-01T00:00:00Z"),
      p("b", 2, 5, "2026-01-02T00:00:00Z"), // 12
      p("c", 12, 0, "2026-01-03T00:00:00Z"), // 12, newer than b
      p("d", 1, 0, "2026-01-04T00:00:00Z"),
    ];
    assert.deepEqual(trendingPosts(posts, 3).map((x) => x.id), ["c", "b", "a"]);
  });

  test("does not mutate its input", () => {
    const posts = [p("a", 1, 0, "2026-01-01T00:00:00Z"), p("b", 9, 0, "2026-01-01T00:00:00Z")];
    trendingPosts(posts);
    assert.equal(posts[0]!.id, "a");
  });
});
