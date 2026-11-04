import React from "react";
import { View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { Text } from "../ui/Text";
import { OptionCard } from "./OptionCard";
import { useTheme } from "../../src/theme/ThemeContext";
import { SKIN_QUIZ, scoreSkinQuiz } from "../../src/lib/onboardingSteps";

const RESULT_TEXT: Record<string, string> = {
  oily: "Your skin makes plenty of oil, so lightweight, non-clogging formulas will suit you best.",
  dry: "Your skin is short on moisture, so rich hydrators and gentle cleansers will help most.",
  combination: "Oily in the middle and calmer on the cheeks, so we'll balance both zones.",
  normal: "Your skin is nicely balanced, so we can focus on your concerns and keeping it that way.",
};

interface Props {
  /** The option index picked for each question so far. */
  picks: number[];
  onPick: (option: number) => void;
}

/** Four tap-to-answer questions, then the result. The parent owns the answers. */
export function SkinQuiz({ picks, onPick }: Props) {
  const { theme } = useTheme();

  if (picks.length >= SKIN_QUIZ.length) {
    const type = scoreSkinQuiz(picks);
    return (
      <View
        className="rounded-3xl p-6 items-center"
        style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
      >
        <View
          className="items-center justify-center rounded-full mb-3"
          style={{ width: 56, height: 56, backgroundColor: theme.primaryLight }}
        >
          <Sparkles size={26} color={theme.primary} />
        </View>
        <Text className="text-xs font-semibold tracking-wide" style={{ color: theme.muted }}>
          YOUR SKIN LOOKS
        </Text>
        <Text className="text-3xl font-bold mt-1 capitalize" style={{ color: theme.primary }}>
          {type}
        </Text>
        <Text className="text-sm text-center mt-3" style={{ color: theme.foreground, lineHeight: 20 }}>
          {RESULT_TEXT[type]}
        </Text>
      </View>
    );
  }

  const question = SKIN_QUIZ[picks.length]!;
  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold" style={{ color: theme.muted }}>
        QUESTION {picks.length + 1} OF {SKIN_QUIZ.length}
      </Text>
      <Text className="text-lg font-semibold" style={{ color: theme.foreground }}>
        {question.question}
      </Text>
      {question.options.map((option, i) => (
        <OptionCard key={option.label} label={option.label} mode="radio" selected={false} onPress={() => onPick(i)} />
      ))}
    </View>
  );
}
