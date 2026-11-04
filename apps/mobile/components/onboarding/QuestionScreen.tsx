import React, { useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Info } from "lucide-react-native";
import { Text } from "../ui/Text";
import { useTheme } from "../../src/theme/ThemeContext";
import { tapHaptic } from "../../src/lib/haptics";

interface Props {
  sectionLabel?: string;
  /** 1-based position and the total in the current plan. */
  step: number;
  totalSteps: number;
  title: string;
  /** The "why we ask" line. */
  why: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Shown for optional questions. */
  onSkip?: () => void;
  skipLabel?: string;
  busy?: boolean;
}

/** One question per screen: animated progress, a "why we ask" line, and a sticky Continue. */
export function QuestionScreen({
  sectionLabel,
  step,
  totalSteps,
  title,
  why,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  onSkip,
  skipLabel = "Skip",
  busy,
}: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();

  const progress = useSharedValue(step / Math.max(totalSteps, 1));
  useEffect(() => {
    const target = step / Math.max(totalSteps, 1);
    progress.value = reduceMotion ? target : withTiming(target, { duration: 320 });
  }, [step, totalSteps, reduceMotion, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.min(progress.value, 1) * 100}%` }));

  const disabled = nextDisabled || busy;

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: theme.background,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 12,
      }}
    >
      <View className="px-6">
        <View className="flex-row items-center justify-between mb-4">
          <View style={{ width: 40, height: 40 }}>
            {onBack && (
              <Pressable
                onPress={() => {
                  tapHaptic();
                  onBack();
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                className="items-center justify-center rounded-full"
                style={{ width: 40, height: 40, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
              >
                <ChevronLeft size={20} color={theme.foreground} />
              </Pressable>
            )}
          </View>
          <Text className="text-xs font-semibold tracking-wide" style={{ color: theme.muted }}>
            {sectionLabel ? sectionLabel.toUpperCase() : ""}
          </Text>
          <Text className="text-xs" style={{ color: theme.muted, width: 40, textAlign: "right" }}>
            {step}/{totalSteps}
          </Text>
        </View>

        <View
          className="rounded-full overflow-hidden"
          style={{ height: 6, backgroundColor: theme.border }}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: totalSteps, now: step }}
        >
          <Animated.View className="h-full rounded-full" style={[{ backgroundColor: theme.primary }, barStyle]} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-[26px] font-bold"
          style={{ color: theme.foreground, lineHeight: 32 }}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <View className="flex-row mt-2 mb-6">
          <Info size={14} color={theme.muted} style={{ marginTop: 2, marginRight: 6 }} />
          <Text className="text-[13px] flex-1" style={{ color: theme.muted, lineHeight: 18 }}>
            {why}
          </Text>
        </View>
        <View className="gap-3">{children}</View>
      </ScrollView>

      <View className="px-6 pt-3">
        <Pressable
          onPress={onNext}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!disabled, busy: !!busy }}
          className="rounded-2xl items-center justify-center"
          style={{ height: 54, backgroundColor: disabled ? theme.primaryLight : theme.primary }}
        >
          <Text className="text-[16px] font-semibold" style={{ color: disabled ? theme.primary : "#FFFFFF" }}>
            {busy ? "Saving..." : nextLabel}
          </Text>
        </Pressable>
        {onSkip && (
          <Pressable
            onPress={onSkip}
            disabled={busy}
            accessibilityRole="button"
            className="items-center justify-center mt-1"
            style={{ height: 44 }}
          >
            <Text className="text-sm font-medium" style={{ color: theme.muted }}>
              {skipLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
