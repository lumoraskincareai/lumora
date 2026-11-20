import React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "../ui/Text";
import { RefreshCw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react-native";
import { Card } from "../ui/Card";
import { DailyBrief } from "../DailyBrief";
import type { Palette } from "../../src/theme/palettes";
import type { RecommendationResponse } from "../../src/api/recommendations";

export function BriefSection({
  theme,
  recommendation,
  loading,
  error,
  needsAssessment,
  feedbackGiven,
  onFeedback,
  onRetry,
  onStartAssessment,
}: {
  theme: Palette;
  recommendation: RecommendationResponse | null;
  loading: boolean;
  error: string | null;
  needsAssessment: boolean;
  feedbackGiven: "helpful" | "not_helpful" | null;
  onFeedback: (helpful: boolean) => void;
  onRetry: () => void;
  onStartAssessment: () => void;
}) {
  const cardStyle = { backgroundColor: theme.card, borderColor: theme.border, borderRadius: 24 };

  if (loading && !recommendation) {
    return (
      <Card className="p-4 items-center py-8" style={cardStyle}>
        <ActivityIndicator color={theme.primary} />
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card className="px-5 py-7 items-center" style={cardStyle}>
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: theme.primaryLight }}
        >
          <Sparkles size={22} color={theme.primary} />
        </View>
        {needsAssessment ? (
          <>
            <Text className="text-base font-semibold text-center" style={{ color: theme.foreground }}>
              Let&apos;s set up your skin profile
            </Text>
            <Text className="text-[13px] text-center mt-1.5 leading-5" style={{ color: theme.muted }}>
              A few quick questions and Lumora will build your daily brief and product picks around your skin.
            </Text>
            <Pressable
              onPress={onStartAssessment}
              accessibilityRole="button"
              className="mt-5 rounded-full px-6 py-3"
              style={{ backgroundColor: theme.primary }}
            >
              <Text className="text-sm font-semibold text-white">Start assessment</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-base font-semibold text-center" style={{ color: theme.foreground }}>
              Couldn&apos;t load today&apos;s brief
            </Text>
            <Text className="text-[13px] text-center mt-1.5 leading-5" style={{ color: theme.muted }}>
              {error ?? "Check your connection and try again."}
            </Text>
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              className="mt-5 flex-row items-center gap-2 rounded-full px-6 py-3"
              style={{ backgroundColor: theme.primary }}
            >
              <RefreshCw size={14} color="#fff" />
              <Text className="text-sm font-semibold text-white">Try again</Text>
            </Pressable>
          </>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-4" style={cardStyle}>
      <DailyBrief brief={recommendation} />

      {!recommendation.id ? null : feedbackGiven ? (
        <View className="mt-4 rounded-lg py-2.5 items-center" style={{ backgroundColor: theme.primaryLight }}>
          <Text className="text-xs font-medium" style={{ color: theme.primary }}>
            {feedbackGiven === "helpful" ? "Glad it helped! ✓" : "Thanks — we'll adjust future picks."}
          </Text>
        </View>
      ) : (
        <View className="flex-row gap-2 mt-4">
          <Pressable
            onPress={() => onFeedback(true)}
            accessibilityRole="button"
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5"
            style={{ backgroundColor: theme.primaryLight }}
          >
            <ThumbsUp size={14} color={theme.primary} />
            <Text className="text-xs font-medium" style={{ color: theme.primary }}>Helpful</Text>
          </Pressable>
          <Pressable
            onPress={() => onFeedback(false)}
            accessibilityRole="button"
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5"
            style={{ borderWidth: 1, borderColor: theme.border }}
          >
            <ThumbsDown size={14} color={theme.muted} />
            <Text className="text-xs font-medium" style={{ color: theme.muted }}>Not for me</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}
