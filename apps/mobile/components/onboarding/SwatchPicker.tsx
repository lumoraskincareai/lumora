import React from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { Text } from "../ui/Text";
import { useTheme } from "../../src/theme/ThemeContext";
import { selectionHaptic } from "../../src/lib/haptics";
import { SKIN_TONE_OPTIONS } from "../../src/lib/onboardingSteps";

interface Props {
  value: number | null;
  onChange: (value: number) => void;
}

/**
 * Six skin-tone swatches (the Fitzpatrick scale in plain words). The swatch
 * colours are fixed on purpose: they depict real skin tones, so they must not
 * change with the app theme. The text label is always shown, never colour alone.
 */
export function SwatchPicker({ value, onChange }: Props) {
  const { theme } = useTheme();
  const selected = SKIN_TONE_OPTIONS.find((o) => o.value === value);

  return (
    <View>
      <View className="flex-row flex-wrap justify-between gap-y-4">
        {SKIN_TONE_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                selectionHaptic();
                onChange(option.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${option.label}. ${option.description}`}
              className="items-center"
              style={{ width: "30%" }}
            >
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: option.swatch,
                  borderWidth: isSelected ? 3 : 1,
                  borderColor: isSelected ? theme.primary : theme.border,
                }}
              >
                {isSelected && <Check size={24} color={option.value >= 4 ? "#FFFFFF" : "#2A1620"} strokeWidth={3} />}
              </View>
              <Text
                className="text-xs mt-1.5 text-center font-medium"
                style={{ color: isSelected ? theme.primary : theme.foreground }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        className="rounded-xl px-4 py-3 mt-6"
        style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
      >
        <Text className="text-sm" style={{ color: selected ? theme.foreground : theme.muted }}>
          {selected ? `${selected.label}: ${selected.description}.` : "Pick the swatch that's closest to your natural skin."}
        </Text>
      </View>
    </View>
  );
}
