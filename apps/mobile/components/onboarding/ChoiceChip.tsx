import React from "react";
import { Pressable } from "react-native";
import { Check } from "lucide-react-native";
import { Text } from "../ui/Text";
import { useTheme } from "../../src/theme/ThemeContext";
import { selectionHaptic } from "../../src/lib/haptics";
import { iconFor } from "./icons";

interface Props {
  label: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
}

/** A compact multi-select pill, for short lists where a full card would be too tall. */
export function ChoiceChip({ label, icon, selected, onPress }: Props) {
  const { theme } = useTheme();
  const Icon = iconFor(icon);
  const color = selected ? theme.primary : theme.foreground;

  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      className="flex-row items-center rounded-full px-3.5"
      style={{
        height: 44,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? theme.primary : theme.border,
        backgroundColor: selected ? theme.primaryLight : theme.card,
      }}
    >
      {selected ? (
        <Check size={16} color={theme.primary} strokeWidth={3} />
      ) : Icon ? (
        <Icon size={16} color={theme.muted} />
      ) : null}
      <Text className="text-sm font-medium ml-2" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}
