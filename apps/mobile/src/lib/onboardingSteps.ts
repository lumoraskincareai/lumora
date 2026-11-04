// What the onboarding asks, in what order, and how answers become a profile.
// Pure TypeScript (no React, no network) so the flow logic is easy to reason about.
//
// The answer vocabularies mirror apps/api/src/lib/skinProfile.ts. The API is
// the one that enforces them; keep both in step when adding an option.

export type Section = "skin" | "safety" | "you";

export const SECTION_LABELS: Record<Section, string> = {
  skin: "Your skin",
  safety: "Safety",
  you: "About you",
};

export interface Answers {
  /** oily | dry | combination | normal, or "unsure" while the quiz is pending. */
  skinType: string | null;
  sensitiveSkin: string | null;
  /** In priority order: the first one tapped matters most. */
  concerns: string[];
  acneType: string | null;
  sensitivities: string[];
  avoidIngredients: string[];
  specialSituations: string[];
  skinTone: number | null;
  ageRange: string | null;
  /** In priority order. */
  goals: string[];
  monthlyBudget: number | null;
}

export const EMPTY_ANSWERS: Answers = {
  skinType: null,
  sensitiveSkin: null,
  concerns: [],
  acneType: null,
  sensitivities: [],
  avoidIngredients: [],
  specialSituations: [],
  skinTone: null,
  ageRange: null,
  goals: [],
  monthlyBudget: null,
};

export const UNSURE = "unsure";

// ---- Options ----------------------------------------------------------------

export interface Option {
  value: string;
  label: string;
  description?: string;
  /** A lucide-react-native icon name, mapped in components/onboarding/icons.ts. */
  icon: string;
}

export const SKIN_TYPE_OPTIONS: Option[] = [
  { value: "oily", label: "Oily", description: "Shiny all over, often by midday", icon: "Droplets" },
  { value: "dry", label: "Dry", description: "Feels tight or flaky, rarely shiny", icon: "Wind" },
  { value: "combination", label: "Combination", description: "Oily forehead and nose, normal or dry cheeks", icon: "Layers" },
  { value: "normal", label: "Normal", description: "Balanced, comfortable most of the day", icon: "Smile" },
  { value: UNSURE, label: "Not sure yet", description: "Answer 4 quick questions and we'll work it out", icon: "Sparkles" },
];

export const SENSITIVITY_LEVEL_OPTIONS: Option[] = [
  { value: "rarely", label: "Rarely", description: "New products almost never bother me", icon: "ShieldCheck" },
  { value: "sometimes", label: "Sometimes", description: "Some products sting or leave me red", icon: "Gauge" },
  { value: "often", label: "Often", description: "My skin reacts to a lot of things", icon: "ShieldAlert" },
];

export const CONCERN_OPTIONS: Option[] = [
  { value: "acne", label: "Acne", description: "Breakouts and blemishes", icon: "CircleDot" },
  { value: "pigmentation", label: "Dark spots", description: "Uneven tone and marks", icon: "Sun" },
  { value: "dryness", label: "Dryness", description: "Tightness and flaking", icon: "Wind" },
  { value: "fine lines", label: "Fine lines", description: "Early signs of ageing", icon: "Hourglass" },
  { value: "dullness", label: "Dullness", description: "Skin that looks tired", icon: "Moon" },
  { value: "large pores", label: "Large pores", description: "Visible pores and texture", icon: "Circle" },
  { value: "dark circles", label: "Dark circles", description: "Shadows under the eyes", icon: "Eye" },
  { value: "redness", label: "Redness", description: "Flushing and irritation", icon: "Flame" },
];
export const MAX_CONCERNS = 3;

export const ACNE_TYPE_OPTIONS: Option[] = [
  { value: "occasional", label: "Occasional breakouts", description: "A pimple now and then", icon: "CircleDot" },
  { value: "hormonal", label: "Hormonal", description: "Around the jawline, tied to my cycle", icon: "Activity" },
  { value: "cystic", label: "Deep, painful bumps", description: "Cystic acne", icon: "Flame" },
  { value: "blackheads", label: "Blackheads and whiteheads", description: "Clogged pores", icon: "Circle" },
];

export const SENSITIVITY_OPTIONS: Option[] = [
  { value: "fragrance", label: "Fragrance", icon: "Flower2" },
  { value: "alcohol", label: "Drying alcohol", icon: "Droplet" },
  { value: "sulfates", label: "Sulfates", icon: "Cloud" },
  { value: "essential oils", label: "Essential oils", icon: "Leaf" },
  { value: "parabens", label: "Parabens", icon: "Pill" },
  { value: "silicones", label: "Silicones", icon: "Layers" },
];
export const MAX_AVOID_INGREDIENTS = 10;

export const SITUATION_OPTIONS: Option[] = [
  { value: "pregnant", label: "Pregnant", icon: "Baby" },
  { value: "breastfeeding", label: "Breastfeeding", icon: "Heart" },
  { value: "trying to conceive", label: "Trying to conceive", icon: "Sprout" },
  { value: "isotretinoin", label: "Taking isotretinoin", description: "Accutane or similar", icon: "Pill" },
  { value: "prescription retinoid", label: "Using a prescription retinoid", description: "Tretinoin, adapalene (Rx)", icon: "Stethoscope" },
];

/** Fitzpatrick scale, in plain words. `swatch` is a fixed colour (not themed). */
export const SKIN_TONE_OPTIONS: { value: number; label: string; description: string; swatch: string }[] = [
  { value: 1, label: "Very fair", description: "Always burns, never tans", swatch: "#F6DCCB" },
  { value: 2, label: "Fair", description: "Burns easily, tans a little", swatch: "#EBC4A4" },
  { value: 3, label: "Medium", description: "Sometimes burns, tans slowly", swatch: "#D9A57B" },
  { value: 4, label: "Olive", description: "Rarely burns, tans easily", swatch: "#BC8556" },
  { value: 5, label: "Brown", description: "Very rarely burns", swatch: "#8D5A3B" },
  { value: 6, label: "Deep brown", description: "Almost never burns", swatch: "#5A3826" },
];

export const AGE_RANGE_OPTIONS: Option[] = [
  { value: "under 18", label: "Under 18", icon: "Calendar" },
  { value: "18-24", label: "18 to 24", icon: "Calendar" },
  { value: "25-34", label: "25 to 34", icon: "Calendar" },
  { value: "35-44", label: "35 to 44", icon: "Calendar" },
  { value: "45-54", label: "45 to 54", icon: "Calendar" },
  { value: "55+", label: "55 and over", icon: "Calendar" },
];

export const GOAL_OPTIONS: Option[] = [
  { value: "clear skin", label: "Clear skin", description: "Fewer breakouts", icon: "ShieldCheck" },
  { value: "even tone", label: "Even tone", description: "Fade marks and spots", icon: "Sun" },
  { value: "anti-aging", label: "Anti-ageing", description: "Smooth fine lines", icon: "Hourglass" },
  { value: "hydration", label: "Hydration", description: "Plump, comfortable skin", icon: "Droplets" },
  { value: "oil control", label: "Oil control", description: "Less shine", icon: "Gauge" },
];

export const BUDGET_PRESETS = [500, 1000, 2000, 5000];

// ---- Steps ------------------------------------------------------------------

export type StepId =
  | "skinType"
  | "quiz"
  | "sensitivity"
  | "concerns"
  | "acneType"
  | "sensitivities"
  | "situations"
  | "skinTone"
  | "ageRange"
  | "goals"
  | "budget"
  | "summary";

export interface StepDef {
  id: StepId;
  section: Section | null; // null for the summary
  title: string;
  /** The "why we ask" line shown under every question. */
  why: string;
  optional: boolean;
}

const STEPS: Record<StepId, StepDef> = {
  skinType: {
    id: "skinType",
    section: "skin",
    title: "What's your skin type?",
    why: "It shapes almost every recommendation we make, from textures to the ingredients we flag.",
    optional: false,
  },
  quiz: {
    id: "quiz",
    section: "skin",
    title: "Let's work it out",
    why: "Four quick questions about how your skin behaves. You can always change the answer.",
    optional: false,
  },
  sensitivity: {
    id: "sensitivity",
    section: "skin",
    title: "Does your skin react easily?",
    why: "Skin of any type can be sensitive. This tells us when to be extra gentle.",
    optional: true,
  },
  concerns: {
    id: "concerns",
    section: "skin",
    title: "What bothers you most?",
    why: `Pick up to ${MAX_CONCERNS}, most important first. Your face scan and product matches focus on these.`,
    optional: false,
  },
  acneType: {
    id: "acneType",
    section: "skin",
    title: "What kind of breakouts?",
    why: "Different breakouts need different ingredients, so we can match products more precisely.",
    optional: true,
  },
  sensitivities: {
    id: "sensitivities",
    section: "safety",
    title: "Anything your skin dislikes?",
    why: "We'll flag every product that contains these, and keep them out of your suggestions.",
    optional: true,
  },
  situations: {
    id: "situations",
    section: "safety",
    title: "Anything we should be careful about?",
    why: "Some ingredients, like retinoids, are commonly advised against in certain situations. This stays private and only changes the warnings you see.",
    optional: true,
  },
  skinTone: {
    id: "skinTone",
    section: "you",
    title: "How does your skin handle the sun?",
    why: "It tunes our sun-protection reminders and how we read pigmentation.",
    optional: true,
  },
  ageRange: {
    id: "ageRange",
    section: "you",
    title: "How old are you?",
    why: "Skin needs change with age, so we only use this to fit ageing advice to you.",
    optional: true,
  },
  goals: {
    id: "goals",
    section: "you",
    title: "What do you want to achieve?",
    why: "Your goals decide what your daily brief puts first. Tap in order of importance.",
    optional: true,
  },
  budget: {
    id: "budget",
    section: "you",
    title: "What's your monthly skincare budget?",
    why: "We'll only suggest products that fit, and plan a routine around it.",
    optional: true,
  },
  summary: {
    id: "summary",
    section: null,
    title: "Your skin profile",
    why: "Here's what we know. Tap any section to change it.",
    optional: false,
  },
};

/**
 * The steps to show for these answers, in order. Follow-up questions only
 * appear when they apply. With `section`, only that section's steps are
 * returned (for editing one part of an existing profile, with no summary).
 */
export function getStepPlan(answers: Answers, section?: Section): StepDef[] {
  const ids: StepId[] = ["skinType"];
  if (answers.skinType === UNSURE) ids.push("quiz");
  ids.push("sensitivity", "concerns");
  if (answers.concerns.includes("acne")) ids.push("acneType");
  ids.push("sensitivities", "situations", "skinTone", "ageRange", "goals", "budget");

  const steps = ids.map((id) => STEPS[id]);
  if (section) return steps.filter((s) => s.section === section);
  return [...steps, STEPS.summary];
}

export function getStep(id: StepId): StepDef {
  return STEPS[id];
}

/** Whether the person can move on from this step with the answers so far. */
export function canContinue(id: StepId, a: Answers): boolean {
  switch (id) {
    case "skinType":
      return !!a.skinType; // choosing "Not sure" is allowed: the quiz decides
    case "quiz":
      return !!a.skinType && a.skinType !== UNSURE;
    case "concerns":
      return a.concerns.length >= 1;
    case "acneType":
    case "sensitivity":
      return true; // skippable
    default:
      return true;
  }
}

/** The step after `current`, or null at the end. Computed on a plan from before the answer changed. */
export function nextStepId(plan: StepDef[], current: StepId): StepId | null {
  const i = plan.findIndex((s) => s.id === current);
  return i >= 0 && i + 1 < plan.length ? plan[i + 1]!.id : null;
}

export function previousStepId(plan: StepDef[], current: StepId): StepId | null {
  const i = plan.findIndex((s) => s.id === current);
  return i > 0 ? plan[i - 1]!.id : null;
}

// ---- Skin type quiz ---------------------------------------------------------

export interface QuizQuestion {
  question: string;
  options: { label: string; type: "oily" | "dry" | "combination" | "normal" }[];
}

export const SKIN_QUIZ: QuizQuestion[] = [
  {
    question: "An hour after washing your face, it feels...",
    options: [
      { label: "Tight or rough", type: "dry" },
      { label: "Comfortable and smooth", type: "normal" },
      { label: "A bit shiny on my nose and forehead", type: "combination" },
      { label: "Shiny all over", type: "oily" },
    ],
  },
  {
    question: "By the afternoon, your skin usually looks...",
    options: [
      { label: "Flat, dull or flaky", type: "dry" },
      { label: "Fresh, much like the morning", type: "normal" },
      { label: "Shiny in the middle, fine on the cheeks", type: "combination" },
      { label: "Greasy, and I blot it", type: "oily" },
    ],
  },
  {
    question: "Your pores are...",
    options: [
      { label: "Hardly visible", type: "dry" },
      { label: "Small and even", type: "normal" },
      { label: "Visible on my nose and cheeks", type: "combination" },
      { label: "Large and visible in many places", type: "oily" },
    ],
  },
  {
    question: "When you put on moisturiser, it...",
    options: [
      { label: "Soaks in and my skin still wants more", type: "dry" },
      { label: "Absorbs nicely", type: "normal" },
      { label: "Sits greasy on my T-zone but not elsewhere", type: "combination" },
      { label: "Feels heavy and I rarely need it", type: "oily" },
    ],
  },
];

// A tie goes to the type that's trickier to care for, so we err toward gentleness.
const QUIZ_TIE_ORDER = ["combination", "oily", "dry", "normal"] as const;

/** Picks the skin type with the most votes. `picks` holds the chosen option index for each question. */
export function scoreSkinQuiz(picks: number[]): (typeof QUIZ_TIE_ORDER)[number] {
  const votes: Record<string, number> = { oily: 0, dry: 0, combination: 0, normal: 0 };
  picks.forEach((pick, q) => {
    const option = SKIN_QUIZ[q]?.options[pick];
    if (option) votes[option.type] = (votes[option.type] ?? 0) + 1;
  });
  return [...QUIZ_TIE_ORDER].sort((a, b) => (votes[b] ?? 0) - (votes[a] ?? 0))[0]!;
}

// ---- Answers <-> API --------------------------------------------------------

const SECTION_FIELDS: Record<Section, (keyof Answers)[]> = {
  skin: ["skinType", "sensitiveSkin", "concerns", "acneType"],
  safety: ["sensitivities", "avoidIngredients", "specialSituations"],
  you: ["skinTone", "ageRange", "goals"],
};

/** What to send to the API. Unanswered optional questions are left out, never sent as blanks. */
export function buildPayload(a: Answers, section?: Section): Record<string, unknown> {
  const fields: (keyof Answers)[] = section
    ? SECTION_FIELDS[section]
    : (Object.values(SECTION_FIELDS).flat() as (keyof Answers)[]);
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = a[field];
    if (value === null) continue;
    if (field === "skinType" && value === UNSURE) continue;
    payload[field] = value;
  }
  // Without the acne follow-up there is nothing to send for it.
  if (!a.concerns.includes("acne")) delete payload.acneType;
  return payload;
}

/** Turns a saved profile back into answers, so editing starts from what's already known. */
export function answersFromProfile(p: Partial<Record<keyof Answers, unknown>> | null | undefined): Answers {
  if (!p) return { ...EMPTY_ANSWERS };
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const legacySensitive = p.skinType === "sensitive"; // older builds saved this as a skin type
  return {
    skinType: legacySensitive ? null : str(p.skinType),
    sensitiveSkin: str(p.sensitiveSkin) ?? (legacySensitive ? "often" : null),
    concerns: list(p.concerns),
    acneType: str(p.acneType),
    sensitivities: list(p.sensitivities).filter((s) => !/none/i.test(s)),
    avoidIngredients: list(p.avoidIngredients),
    specialSituations: list(p.specialSituations),
    skinTone: typeof p.skinTone === "number" ? p.skinTone : null,
    ageRange: str(p.ageRange),
    goals: list(p.goals),
    monthlyBudget: typeof p.monthlyBudget === "number" ? p.monthlyBudget : null,
  };
}

/** Same rule as the API: lowercase, letters/digits/spaces and . - ( ) % only, 2-40 characters. */
export function cleanAvoidToken(raw: string): string | null {
  const token = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 .\-()%]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return token.length >= 2 && token.length <= 40 ? token : null;
}

/** Answers that are kept in memory only: the resume draft never writes these to the device. */
export const PRIVATE_FIELDS: (keyof Answers)[] = ["specialSituations"];
