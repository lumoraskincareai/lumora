import React from "react";
import { Pressable, View } from "react-native";
import { Pencil } from "lucide-react-native";
import { Text } from "../ui/Text";
import { useTheme } from "../../src/theme/ThemeContext";

export interface SummaryRow {
  label: string;
  /** What was answered; empty when the question was skipped. */
  value: string;
}

interface Props {
  title: string;
  rows: SummaryRow[];
  onEdit: () => void;
}

/** One section of the final recap, with a button to go back and change it. */
export function SummaryCard({ title, rows, onEdit }: Props) {
  const { theme } = useTheme();
  return (
    <View
      className="rounded-2xl p-4"
      style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[15px] font-bold" style={{ color: theme.foreground }}>
          {title}
        </Text>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
          className="flex-row items-center"
        >
          <Pencil size={14} color={theme.primary} />
          <Text className="text-[13px] font-medium ml-1" style={{ color: theme.primary }}>
            Edit
          </Text>
        </Pressable>
      </View>

      {rows.map((row) => (
        <View key={row.label} className="flex-row py-1.5">
          <Text className="text-[13px]" style={{ color: theme.muted, width: 104 }}>
            {row.label}
          </Text>
          <Text
            className="text-[13px] flex-1 font-medium"
            style={{ color: row.value ? theme.foreground : theme.muted }}
          >
            {row.value || "Not answered"}
          </Text>
        </View>
      ))}
    </View>
  );
}
