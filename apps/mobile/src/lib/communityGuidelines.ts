// Pure community logic: the house rules shown before first entry, the
// per-user acceptance record, post validation and time formatting.
// No React Native imports here so it runs under `tsx --test`.

// Bump when the rules change materially, so everyone sees the popup again.
export const GUIDELINES_VERSION = 1;

export type Guideline = { id: string; title: string; body: string };

export const GUIDELINES: Guideline[] = [
  {
    id: "respect",
    title: "Be kind and respectful",
    body: "Treat everyone with courtesy. No harassment, bullying, hate or shaming of anyone's skin, body or background.",
  },
  {
    id: "honest",
    title: "Share honest experiences",
    body: "Post what actually worked or didn't for you. Everyone's skin is different, so avoid presenting your result as a guarantee.",
  },
  {
    id: "medical",
    title: "No medical claims",
    body: "Community posts are not medical advice. For persistent or severe skin issues, encourage seeing a dermatologist.",
  },
  {
    id: "spam",
    title: "No spam or self-promotion",
    body: "Don't advertise, sell, or post affiliate or referral links. Disclose it if you were gifted a product.",
  },
  {
    id: "privacy",
    title: "Protect privacy",
    body: "Never share personal details such as phone numbers, addresses or other people's photos without their consent.",
  },
  {
    id: "report",
    title: "Report, don't retaliate",
    body: "See something that breaks these rules? Long-press the post and choose Report. Repeat violations may lead to removal.",
  },
];

// ---- acceptance record -------------------------------------------------

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export function acceptanceKey(userId: string): string {
  return `community_guidelines_accepted:${userId}`;
}

/** True only if this user accepted the current version of the rules. */
export async function hasAcceptedGuidelines(
  store: KeyValueStore,
  userId: string | undefined | null,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const raw = await store.getItem(acceptanceKey(userId));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { version?: unknown };
    return (
      typeof parsed.version === "number" && parsed.version >= GUIDELINES_VERSION
    );
  } catch {
    // Unreadable storage or corrupt JSON: ask again rather than skip the rules.
    return false;
  }
}

export async function acceptGuidelines(
  store: KeyValueStore,
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  await store.setItem(
    acceptanceKey(userId),
    JSON.stringify({ version: GUIDELINES_VERSION, acceptedAt: now.toISOString() }),
  );
}

// ---- post validation ---------------------------------------------------

export const TITLE_MAX = 80;
export const CONTENT_MAX = 2000;

export type PostDraft = { title: string; content: string };

/** Returns an error message, or null when the draft can be posted. */
export function validatePostDraft(draft: PostDraft): string | null {
  const content = draft.content.trim();
  if (!content) return "Write something to share.";
  if (content.length > CONTENT_MAX)
    return `Posts can be up to ${CONTENT_MAX} characters.`;
  if (draft.title.trim().length > TITLE_MAX)
    return `Titles can be up to ${TITLE_MAX} characters.`;
  return null;
}

// ---- formatting --------------------------------------------------------

/** Short relative time: "now", "5m", "3h", "2d", "3w", "4mo". */
export function timeAgo(dateStr: string, now: number = Date.now()): string {
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

export type FeedEmptyCopy = { title: string; body: string };

export function emptyFeedCopy(
  tab: "community" | "bookmarks",
  category: string,
): FeedEmptyCopy {
  if (tab === "bookmarks") {
    return {
      title: "No bookmarks yet",
      body: "Long-press any post and choose Bookmark to save it here.",
    };
  }
  if (category === "All") {
    return {
      title: "No posts yet",
      body: "Be the first to start a conversation with the community.",
    };
  }
  return {
    title: `Nothing in ${category} yet`,
    body: "Be the first to share something in this category.",
  };
}
