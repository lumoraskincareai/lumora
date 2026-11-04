import React from "react";
import { View } from "react-native";
import { Check } from "lucide-react-native";
import { Text } from "./ui/Text";
import { useTheme } from "../src/theme/ThemeContext";
import { passwordRules, passwordStrength } from "../src/lib/validation/password";

const SUCCESS = "#16A34A";
const SUCCESS_BG = "#DCFCE7";

const LEVELS = {
  empty: { filled: 0, label: "", color: "#9CA3AF" },
  weak: { filled: 1, label: "Weak", color: "#EF4444" },
  fair: { filled: 2, label: "Good", color: "#F59E0B" },
  strong: { filled: 3, label: "Strong", color: "#16A34A" },
} as const;

/** A strength bar plus one pill per password rule that turns green when met. */
export function PasswordStrength({ password }: { password: string }) {
  const { theme } = useTheme();
  const level = LEVELS[passwordStrength(password)];

  return (
    <View className="mt-3" accessibilityLiveRegion="polite">
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-xs" style={{ color: theme.muted }}>
          Password strength
        </Text>
        <Text
          className="text-xs font-semibold"
          style={{ color: level.filled ? level.color : theme.muted }}
        >
          {level.label || "—"}
        </Text>
      </View>

      <View className="flex-row gap-1.5">
        {[1, 2, 3].map((segment) => (
          <View
            key={segment}
            className="flex-1 rounded-full"
            style={{
              height: 5,
              backgroundColor: segment <= level.filled ? level.color : theme.border,
            }}
          />
        ))}
      </View>

      <View className="flex-row flex-wrap gap-2 mt-3">
        {passwordRules.map((rule) => {
          const met = rule.test(password);
          return (
            <View
              key={rule.key}
              className="flex-row items-center rounded-full px-2.5 py-1"
              style={{
                backgroundColor: met ? SUCCESS_BG : "transparent",
                borderWidth: 1,
                borderColor: met ? SUCCESS : theme.border,
              }}
              accessibilityLabel={`${rule.label}: ${met ? "met" : "not met"}`}
            >
              {met ? (
                <Check size={12} color={SUCCESS} strokeWidth={3} />
              ) : (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.border,
                  }}
                />
              )}
              <Text
                className="text-xs ml-1.5"
                style={{
                  color: met ? SUCCESS : theme.muted,
                  fontWeight: met ? "600" : "400",
                }}
              >
                {rule.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
