// Pure text helpers for the home screen. No react-native imports, so they are unit-tested in test/.

export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 22) return "Good evening";
  return "Good night";
}

export function firstName(name?: string | null): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return first;
}

/** Morning routine until mid-afternoon, evening after. */
export function preferredTimeOfDay(date: Date = new Date()): "morning" | "evening" {
  return date.getHours() < 15 ? "morning" : "evening";
}

interface RoutineLike {
  timeOfDay: "morning" | "evening";
  steps: { completed: boolean }[];
}

/** The routine to feature on the home banner: the one for this time of day, else the first. */
export function pickRoutine<T extends RoutineLike>(routines: T[], date: Date = new Date()): T | null {
  if (routines.length === 0) return null;
  const want = preferredTimeOfDay(date);
  return routines.find((r) => r.timeOfDay === want) ?? routines[0] ?? null;
}

export function routineProgress(routine: RoutineLike): { done: number; total: number } {
  return { done: routine.steps.filter((s) => s.completed).length, total: routine.steps.length };
}

interface PostLike {
  likes: number;
  commentCount: number;
  createdAt: string;
}

/** Most engaged recent posts first. Ties go to the newest. Returns at most `limit`. */
export function trendingPosts<T extends PostLike>(posts: T[], limit = 6): T[] {
  return [...posts]
    .sort((a, b) => {
      const score = b.likes + b.commentCount * 2 - (a.likes + a.commentCount * 2);
      return score !== 0 ? score : Date.parse(b.createdAt) - Date.parse(a.createdAt);
    })
    .slice(0, limit);
}
