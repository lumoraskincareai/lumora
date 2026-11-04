import React, { useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import Animated, { FadeInRight, useReducedMotion } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { Lock } from "lucide-react-native";
import { Text, TextInput } from "../../components/ui/Text";
import { QuestionScreen } from "../../components/onboarding/QuestionScreen";
import { OptionCard } from "../../components/onboarding/OptionCard";
import { ChoiceChip } from "../../components/onboarding/ChoiceChip";
import { ChipInput } from "../../components/onboarding/ChipInput";
import { SwatchPicker } from "../../components/onboarding/SwatchPicker";
import { SkinQuiz } from "../../components/onboarding/SkinQuiz";
import { SummaryCard, SummaryRow } from "../../components/onboarding/SummaryCard";
import { useOnboardingStore } from "../../src/store/useOnboardingStore";
import { useTheme } from "../../src/theme/ThemeContext";
import {
  getMySkinProfile,
  patchSkinProfile,
  saveSkinProfile,
  updateMonthlyBudget,
} from "../../src/api/skinProfile";
import { successHaptic } from "../../src/lib/haptics";
import {
  ACNE_TYPE_OPTIONS,
  AGE_RANGE_OPTIONS,
  BUDGET_PRESETS,
  CONCERN_OPTIONS,
  GOAL_OPTIONS,
  MAX_AVOID_INGREDIENTS,
  MAX_CONCERNS,
  SECTION_LABELS,
  SENSITIVITY_LEVEL_OPTIONS,
  SENSITIVITY_OPTIONS,
  SITUATION_OPTIONS,
  SKIN_QUIZ,
  SKIN_TONE_OPTIONS,
  SKIN_TYPE_OPTIONS,
  UNSURE,
  answersFromProfile,
  buildPayload,
  canContinue,
  getStep,
  getStepPlan,
  nextStepId,
  previousStepId,
  scoreSkinQuiz,
  type Answers,
  type Option,
  type Section,
  type StepId,
} from "../../src/lib/onboardingSteps";

const SECTIONS: Section[] = ["skin", "safety", "you"];
const isSection = (v: unknown): v is Section => typeof v === "string" && (SECTIONS as string[]).includes(v);

const labelOf = (options: Option[], value: string | null) => options.find((o) => o.value === value)?.label ?? "";
const labelsOf = (options: Option[], values: string[]) => values.map((v) => labelOf(options, v) || v).join(", ");

/**
 * The whole onboarding, on the entry route the app already links to. One
 * question per screen; the steps come from getStepPlan(), so follow-ups only
 * appear when they apply. With ?section=skin|safety|you it edits just that
 * part of an existing profile. Answers are saved as a resumable draft.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const params = useLocalSearchParams<{ section?: string }>();
  const editSection = isSection(params.section) ? params.section : undefined;

  const { answers, stepId, setAnswers, setStep, startFrom, loadDraft, reset } = useOnboardingStore();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quizPicks, setQuizPicks] = useState<number[]>([]);
  // Set when a summary card sent the person back to change one section.
  const [fromSummary, setFromSummary] = useState(false);
  const [budgetText, setBudgetText] = useState("");

  // ---- Start: prefill from a saved profile, or resume a draft ------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let profile = null;
      try {
        profile = await getMySkinProfile();
      } catch {
        // No profile yet (first run), or offline: carry on with a blank form.
      }
      if (cancelled) return;

      if (editSection && !profile) {
        router.replace("/(onboarding)/skin-type");
        return;
      }

      if (profile) {
        const prefilled = answersFromProfile(profile);
        const first = getStepPlan(prefilled, editSection)[0]?.id ?? "skinType";
        startFrom(prefilled, first);
        if (prefilled.monthlyBudget != null) setBudgetText(String(prefilled.monthlyBudget));
      } else {
        const resumed = await loadDraft();
        if (resumed) {
          // The private "be careful about" answers are never saved to the device,
          // so someone resuming past that question is asked it again.
          const { answers: a, stepId: s } = useOnboardingStore.getState();
          const ids = getStepPlan(a).map((x) => x.id);
          if (ids.indexOf(s) > ids.indexOf("situations") && a.specialSituations.length === 0) {
            setStep("situations");
          }
          if (a.monthlyBudget != null) setBudgetText(String(a.monthlyBudget));
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = getStepPlan(answers, editSection);
  const step = getStep(stepId);
  const stepIndex = Math.max(plan.findIndex((s) => s.id === stepId), 0);
  const isLast = nextStepId(plan, stepId) === null;
  const prevId = previousStepId(plan, stepId);

  // ---- Moving around ----------------------------------------------------------
  const goBack = () => {
    if (stepId === "quiz" && quizPicks.length > 0) {
      setQuizPicks((p) => p.slice(0, -1));
      return true;
    }
    if (fromSummary && stepId !== "summary") {
      setFromSummary(false);
      setStep("summary");
      return true;
    }
    if (prevId) {
      setStep(prevId);
      return true;
    }
    if (editSection && router.canGoBack()) {
      router.back();
      return true;
    }
    return false;
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => sub.remove();
  });

  const advance = () => {
    const next = nextStepId(plan, stepId);
    if (!next) return void finish();
    // Coming from the summary: after this section's last question, return to the recap.
    if (fromSummary && getStep(next).section !== step.section) {
      setFromSummary(false);
      setStep("summary");
      return;
    }
    setStep(next);
  };

  const finish = async () => {
    setSaving(true);
    try {
      if (editSection) {
        await patchSkinProfile(buildPayload(answers, editSection));
      } else {
        await saveSkinProfile(buildPayload(answers));
      }
      if (answers.monthlyBudget != null && (!editSection || editSection === "you")) {
        await updateMonthlyBudget(answers.monthlyBudget);
      }
      await reset();
      successHaptic();
      Toast.show({ type: "success", text1: editSection ? "Profile updated" : "Your skin profile is ready!" });
      if (editSection) router.back();
      else router.replace("/(main)/(tabs)/home");
    } catch (err: any) {
      Toast.show({ type: "error", text1: err.message || "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  const confirmQuiz = () => {
    // The quiz step disappears from the plan once skinType is set, so work out
    // where to go next before changing the answer.
    const next = nextStepId(plan, "quiz");
    setAnswers({ skinType: scoreSkinQuiz(quizPicks) });
    setQuizPicks([]);
    if (next) setStep(next);
  };

  const pickMyself = () => {
    setQuizPicks([]);
    setAnswers({ skinType: null });
    setStep("skinType");
  };

  const jumpToSection = (section: Section) => {
    const first = getStepPlan(answers).find((s) => s.section === section);
    if (first) {
      setFromSummary(true);
      setStep(first.id);
    }
  };

  // ---- Answer helpers ---------------------------------------------------------
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const body = (id: StepId): React.ReactNode => {
    switch (id) {
      case "skinType":
        return SKIN_TYPE_OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            label={o.label}
            description={o.description}
            icon={o.icon}
            mode="radio"
            selected={answers.skinType === o.value}
            onPress={() => setAnswers({ skinType: o.value })}
          />
        ));

      case "quiz":
        return <SkinQuiz picks={quizPicks} onPick={(i) => setQuizPicks((p) => [...p, i])} />;

      case "sensitivity":
        return SENSITIVITY_LEVEL_OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            label={o.label}
            description={o.description}
            icon={o.icon}
            mode="radio"
            selected={answers.sensitiveSkin === o.value}
            onPress={() => setAnswers({ sensitiveSkin: o.value })}
          />
        ));

      case "concerns":
        return CONCERN_OPTIONS.map((o) => {
          const index = answers.concerns.indexOf(o.value);
          const selected = index >= 0;
          return (
            <OptionCard
              key={o.value}
              label={o.label}
              description={o.description}
              icon={o.icon}
              mode="rank"
              rank={index + 1}
              selected={selected}
              disabled={!selected && answers.concerns.length >= MAX_CONCERNS}
              onPress={() => setAnswers({ concerns: toggle(answers.concerns, o.value) })}
            />
          );
        });

      case "acneType":
        return ACNE_TYPE_OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            label={o.label}
            description={o.description}
            icon={o.icon}
            mode="radio"
            selected={answers.acneType === o.value}
            onPress={() => setAnswers({ acneType: o.value })}
          />
        ));

      case "sensitivities":
        return (
          <View className="gap-5">
            <View className="flex-row flex-wrap gap-2">
              {SENSITIVITY_OPTIONS.map((o) => (
                <ChoiceChip
                  key={o.value}
                  label={o.label}
                  icon={o.icon}
                  selected={answers.sensitivities.includes(o.value)}
                  onPress={() => setAnswers({ sensitivities: toggle(answers.sensitivities, o.value) })}
                />
              ))}
            </View>
            <View>
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.foreground }}>
                Something else? Type it in
              </Text>
              <ChipInput
                value={answers.avoidIngredients}
                onChange={(avoidIngredients) => setAnswers({ avoidIngredients })}
                max={MAX_AVOID_INGREDIENTS}
              />
            </View>
            <Text className="text-xs" style={{ color: theme.muted }}>
              Nothing bothers you? Just continue.
            </Text>
          </View>
        );

      case "situations":
        return (
          <View className="gap-3">
            <View
              className="flex-row items-center rounded-xl px-3.5 py-3"
              style={{ backgroundColor: theme.primaryLight }}
            >
              <Lock size={16} color={theme.primary} />
              <Text className="text-[13px] flex-1 ml-2.5" style={{ color: theme.primary }}>
                Private. This only changes the warnings you see. It isn&apos;t shown to anyone and isn&apos;t saved on this
                device.
              </Text>
            </View>
            {SITUATION_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                label={o.label}
                description={o.description}
                icon={o.icon}
                mode="checkbox"
                selected={answers.specialSituations.includes(o.value)}
                onPress={() => setAnswers({ specialSituations: toggle(answers.specialSituations, o.value) })}
              />
            ))}
            <Text className="text-xs" style={{ color: theme.muted }}>
              General information only, not medical advice. Ask your doctor about ingredients if you&apos;re unsure.
            </Text>
          </View>
        );

      case "skinTone":
        return <SwatchPicker value={answers.skinTone} onChange={(skinTone) => setAnswers({ skinTone })} />;

      case "ageRange":
        return AGE_RANGE_OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            label={o.label}
            mode="radio"
            selected={answers.ageRange === o.value}
            onPress={() => setAnswers({ ageRange: o.value })}
          />
        ));

      case "goals":
        return GOAL_OPTIONS.map((o) => {
          const index = answers.goals.indexOf(o.value);
          return (
            <OptionCard
              key={o.value}
              label={o.label}
              description={o.description}
              icon={o.icon}
              mode="rank"
              rank={index + 1}
              selected={index >= 0}
              onPress={() => setAnswers({ goals: toggle(answers.goals, o.value) })}
            />
          );
        });

      case "budget":
        return (
          <View className="gap-4">
            <View className="flex-row flex-wrap gap-2">
              {BUDGET_PRESETS.map((amount) => (
                <ChoiceChip
                  key={amount}
                  label={`₹${amount}`}
                  selected={answers.monthlyBudget === amount}
                  onPress={() => {
                    setBudgetText(String(amount));
                    setAnswers({ monthlyBudget: amount });
                  }}
                />
              ))}
            </View>
            <View>
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.foreground }}>
                Or enter your own
              </Text>
              <TextInput
                className="rounded-xl px-3.5 py-3 text-[17px]"
                style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, color: theme.foreground }}
                placeholder="₹ per month"
                placeholderTextColor={theme.muted}
                keyboardType="number-pad"
                maxLength={7}
                value={budgetText}
                accessibilityLabel="Monthly skincare budget in rupees"
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, "");
                  setBudgetText(digits);
                  setAnswers({ monthlyBudget: digits ? Number(digits) : null });
                }}
              />
            </View>
          </View>
        );

      case "summary":
        return <Summary answers={answers} onEdit={jumpToSection} />;
    }
  };

  if (!ready) {
    return <View className="flex-1" style={{ backgroundColor: theme.background }} />;
  }

  // ---- Per-step buttons -------------------------------------------------------
  const isQuiz = stepId === "quiz";
  const quizDone = quizPicks.length >= SKIN_QUIZ.length;
  const nextLabel = isQuiz
    ? quizDone
      ? "Use this skin type"
      : "Answer to continue"
    : stepId === "summary"
      ? editSection
        ? "Save"
        : "Looks good"
      : isLast
        ? "Save"
        : "Continue";

  return (
    <QuestionScreen
      sectionLabel={step.section ? SECTION_LABELS[step.section] : "All done"}
      step={stepIndex + 1}
      totalSteps={plan.length}
      title={step.title}
      why={step.why}
      onBack={prevId || editSection || (fromSummary && stepId !== "summary") || (isQuiz && quizPicks.length) ? goBack : undefined}
      onNext={isQuiz ? confirmQuiz : advance}
      nextLabel={nextLabel}
      nextDisabled={isQuiz ? !quizDone : !canContinue(stepId, answers)}
      onSkip={isQuiz ? (quizDone ? pickMyself : undefined) : step.optional ? advance : undefined}
      skipLabel={isQuiz ? "I'll pick it myself" : stepId === "situations" ? "Prefer not to say" : "Skip"}
      busy={saving}
    >
      <Animated.View key={stepId} entering={reduceMotion ? undefined : FadeInRight.duration(260)} className="gap-3">
        {body(stepId)}
      </Animated.View>
    </QuestionScreen>
  );
}

function Summary({ answers, onEdit }: { answers: Answers; onEdit: (s: Section) => void }) {
  const tone = SKIN_TONE_OPTIONS.find((o) => o.value === answers.skinTone);
  const rows: Record<Section, SummaryRow[]> = {
    skin: [
      { label: "Skin type", value: labelOf(SKIN_TYPE_OPTIONS, answers.skinType === UNSURE ? null : answers.skinType) },
      { label: "Reacts easily", value: labelOf(SENSITIVITY_LEVEL_OPTIONS, answers.sensitiveSkin) },
      { label: "Concerns", value: labelsOf(CONCERN_OPTIONS, answers.concerns) },
      ...(answers.concerns.includes("acne")
        ? [{ label: "Breakouts", value: labelOf(ACNE_TYPE_OPTIONS, answers.acneType) }]
        : []),
    ],
    safety: [
      { label: "Dislikes", value: [labelsOf(SENSITIVITY_OPTIONS, answers.sensitivities), ...answers.avoidIngredients].filter(Boolean).join(", ") },
      { label: "Be careful", value: answers.specialSituations.length ? "Added (private)" : "" },
    ],
    you: [
      { label: "Skin tone", value: tone ? tone.label : "" },
      { label: "Age", value: labelOf(AGE_RANGE_OPTIONS, answers.ageRange) },
      { label: "Goals", value: labelsOf(GOAL_OPTIONS, answers.goals) },
      { label: "Budget", value: answers.monthlyBudget != null ? `₹${answers.monthlyBudget} a month` : "" },
    ],
  };
  return (
    <View className="gap-3">
      {SECTIONS.map((section) => (
        <SummaryCard key={section} title={SECTION_LABELS[section]} rows={rows[section]} onEdit={() => onEdit(section)} />
      ))}
    </View>
  );
}
