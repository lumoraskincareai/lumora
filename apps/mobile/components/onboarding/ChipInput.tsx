import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Plus, X } from "lucide-react-native";
import { Text, TextInput } from "../ui/Text";
import { useTheme } from "../../src/theme/ThemeContext";
import { tapHaptic } from "../../src/lib/haptics";
import { cleanAvoidToken } from "../../src/lib/onboardingSteps";

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  max: number;
  placeholder?: string;
}

// A single throwaway text box, so this keeps its own state instead of using
// React Hook Form. Typed ingredients are cleaned the same way the API cleans them.
export function ChipInput({ value, onChange, max, placeholder = "e.g. benzyl alcohol" }: Props) {
  const { theme } = useTheme();
  const [draft, setDraft] = useState("");
  const full = value.length >= max;

  const add = () => {
    const token = cleanAvoidToken(draft);
    if (!token || full) return;
    if (!value.includes(token)) {
      tapHaptic();
      onChange([...value, token]);
    }
    setDraft("");
  };

  return (
    <View>
      <View className="flex-row items-center gap-2">
        <TextInput
          className="flex-1 rounded-xl px-3.5 py-3 text-[15px]"
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            color: theme.foreground,
          }}
          placeholder={full ? `You've added ${max}` : placeholder}
          placeholderTextColor={theme.muted}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          editable={!full}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={40}
          accessibilityLabel="Add an ingredient to avoid"
        />
        <Pressable
          onPress={add}
          disabled={full || !cleanAvoidToken(draft)}
          accessibilityRole="button"
          accessibilityLabel="Add ingredient"
          className="items-center justify-center rounded-xl"
          style={{
            width: 48,
            height: 48,
            backgroundColor: full || !cleanAvoidToken(draft) ? theme.primaryLight : theme.primary,
          }}
        >
          <Plus size={20} color={full || !cleanAvoidToken(draft) ? theme.primary : "#FFFFFF"} />
        </Pressable>
      </View>

      {value.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {value.map((token) => (
            <Pressable
              key={token}
              onPress={() => onChange(value.filter((t) => t !== token))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${token}`}
              className="flex-row items-center rounded-full pl-3.5 pr-2.5 py-2"
              style={{ backgroundColor: theme.primaryLight }}
            >
              <Text className="text-sm font-medium mr-1.5" style={{ color: theme.primary }}>
                {token}
              </Text>
              <X size={14} color={theme.primary} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
