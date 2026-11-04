import React from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Check } from "lucide-react-native";
import { Text } from "../ui/Text";
import { useTheme } from "../../src/theme/ThemeContext";
import { selectionHaptic } from "../../src/lib/haptics";
import { iconFor } from "./icons";

interface Props {
  label: string;
  description?: string;
  /** A lucide icon name from onboardingSteps.ts. */
  icon?: string;
  selected: boolean;
  /** radio: pick one. checkbox: pick any. rank: pick in order, shows 1, 2, 3. */
  mode: "radio" | "checkbox" | "rank";
  /** Position in the ranking (1-based) when mode is "rank" and selected. */
  rank?: number;
  disabled?: boolean;
  onPress: () => void;
}

/** A large, tappable answer card with an icon, a springy press and a clear selected state. */
export function OptionCard({ label, description, icon, selected, mode, rank, disabled, onPress }: Props) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const Icon = iconFor(icon);
  const isRadio = mode === "radio";

  const press = (to: number) => {
    if (!reduceMotion) scale.value = withSpring(to, { damping: 18, stiffness: 320 });
  };

  return (
    <Animated.View style={[animated, { opacity: disabled ? 0.45 : 1 }]}>
      <Pressable
        onPress={() => {
          selectionHaptic();
          onPress();
        }}
        onPressIn={() => press(0.98)}
        onPressOut={() => press(1)}
        disabled={disabled}
        accessibilityRole={isRadio ? "radio" : "checkbox"}
        accessibilityState={isRadio ? { selected, disabled } : { checked: selected, disabled }}
        accessibilityLabel={description ? `${label}. ${description}` : label}
        className="rounded-2xl px-4 py-3.5 flex-row items-center"
        style={{
          minHeight: 64,
          borderWidth: selected ? 1.5 : 1,
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? theme.primaryLight : theme.card,
        }}
      >
        {Icon && (
          <View
            className="items-center justify-center rounded-xl mr-3"
            style={{
              width: 40,
              height: 40,
              backgroundColor: selected ? theme.card : theme.background,
            }}
          >
            <Icon size={20} color={selected ? theme.primary : theme.muted} />
          </View>
        )}

        <View className="flex-1 mr-3">
          <Text
            className="text-[15px] font-semibold"
            style={{ color: selected ? theme.primary : theme.foreground }}
          >
            {label}
          </Text>
          {!!description && (
            <Text className="text-xs mt-0.5" style={{ color: theme.muted }}>
              {description}
            </Text>
          )}
        </View>

        <View
          className="items-center justify-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: isRadio || mode === "rank" ? 12 : 7,
            borderWidth: 2,
            borderColor: selected ? theme.primary : theme.border,
            backgroundColor: selected && mode !== "radio" ? theme.primary : "transparent",
          }}
        >
          {selected && isRadio && (
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />
          )}
          {selected && mode === "checkbox" && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
          {selected && mode === "rank" && (
            <Text className="text-xs font-bold" style={{ color: "#FFFFFF" }}>
              {rank}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
