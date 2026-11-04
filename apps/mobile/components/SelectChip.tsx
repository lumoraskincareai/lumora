import React from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { Text } from "./ui/Text";
import { useTheme } from "../src/theme/ThemeContext";

/**
 * A selectable option row.
 * - mode="radio": pick exactly one (round indicator with a dot).
 * - mode="checkbox" (default): pick any number (square indicator with a check).
 */
export function SelectChip({
  label,
  selected,
  onPress,
  mode = "checkbox",
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  mode?: "radio" | "checkbox";
}) {
  const { theme } = useTheme();
  const isRadio = mode === "radio";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={isRadio ? "radio" : "checkbox"}
      accessibilityState={isRadio ? { selected } : { checked: selected }}
      accessibilityLabel={label}
      className="rounded-xl px-4 py-3.5 flex-row items-center"
      style={{
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? theme.primary : theme.border,
        backgroundColor: selected ? theme.primaryLight : theme.card,
      }}
    >
      <View
        className="items-center justify-center mr-3"
        style={{
          width: 22,
          height: 22,
          borderRadius: isRadio ? 11 : 6,
          borderWidth: 2,
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: !isRadio && selected ? theme.primary : "transparent",
        }}
      >
        {isRadio && selected && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: theme.primary,
            }}
          />
        )}
        {!isRadio && selected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
      </View>
      <Text
        className="text-sm font-medium flex-1"
        style={{ color: selected ? theme.primary : theme.foreground }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
