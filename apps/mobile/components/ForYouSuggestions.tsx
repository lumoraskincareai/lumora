import React from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Sparkles } from "lucide-react-native";
import { Text } from "./ui/Text";
import { Card } from "./ui/Card";
import { useTheme } from "../src/theme/ThemeContext";
import { iconColors } from "../src/theme/iconColors";
import type {
  ProfileSuggestionsResponse,
  SuggestedItem,
} from "../src/api/recommendations";

function ItemRow({ item }: { item: SuggestedItem }) {
  const { theme } = useTheme();
  const router = useRouter();

  const onPress = () => {
    if (item.tag === "owned") router.push("/(main)/my-products");
    else if (item.productId) router.push(`/(main)/product/${item.productId}`);
  };

  const badge =
    item.tag === "owned"
      ? { text: "You own this", color: iconColors.teal }
      : item.tag === "featured"
        ? { text: "Featured", color: iconColors.amber }
        : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-xl p-3 mb-2"
      style={{ borderWidth: 1, borderColor: theme.border }}
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text
            className="text-sm font-semibold shrink"
            style={{ color: theme.foreground }}
          >
            {item.name}
          </Text>
          {badge && (
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: `${badge.color}22` }}
            >
              <Text
                className="text-[10px] font-semibold"
                style={{ color: badge.color }}
              >
                {badge.text}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-xs mt-0.5" style={{ color: theme.muted }}>
          {[item.brand, item.price != null ? `₹${item.price}` : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <Text className="text-xs mt-1.5 leading-4" style={{ color: theme.muted }}>
          {item.why}
        </Text>
      </View>
      <ChevronRight size={16} color={theme.muted} />
    </Pressable>
  );
}

export function ForYouSuggestions({
  data,
}: {
  data: ProfileSuggestionsResponse;
}) {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <Card
      className="mt-4 p-4"
      style={{ backgroundColor: theme.card, borderColor: theme.border }}
    >
      <View className="flex-row items-center gap-2 mb-1">
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.primaryLight }}
        >
          <Sparkles size={15} color={theme.primary} />
        </View>
        <Text
          className="text-sm font-semibold"
          style={{ color: theme.foreground }}
        >
          Suggested for you
        </Text>
      </View>
      <Text className="text-xs mb-3" style={{ color: theme.muted }}>
        Picked from the answers you gave when you joined.
      </Text>

      {data.basedOn.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mb-4">
          {data.basedOn.map((chip) => (
            <View
              key={chip}
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: theme.primaryLight }}
            >
              <Text
                className="text-[11px] font-semibold"
                style={{ color: theme.primary }}
              >
                {chip}
              </Text>
            </View>
          ))}
        </View>
      )}

      {data.areas.map((area) => (
        <View key={area.key} className="mb-3">
          <Text
            className="text-sm font-bold mb-2"
            style={{ color: theme.foreground }}
          >
            {area.label}
          </Text>
          {area.items.length > 0 ? (
            area.items.map((item, i) => (
              <ItemRow key={`${item.productId ?? item.name}-${i}`} item={item} />
            ))
          ) : (
            <View
              className="rounded-xl p-3 mb-2"
              style={{ backgroundColor: theme.primaryLight }}
            >
              <Text className="text-xs leading-4" style={{ color: theme.foreground }}>
                {area.emptyReason}
              </Text>
            </View>
          )}
          {area.tips.slice(0, 1).map((tip) => (
            <View key={tip} className="flex-row gap-2">
              <Text style={{ color: iconColors.green }}>{"•"}</Text>
              <Text className="text-xs flex-1 leading-4" style={{ color: theme.muted }}>
                Free tip: {tip}
              </Text>
            </View>
          ))}
        </View>
      ))}

      <Pressable
        onPress={() => router.push("/(main)/edit-profile")}
        accessibilityRole="button"
        className="items-center pt-1"
      >
        <Text className="text-xs font-semibold" style={{ color: theme.primary }}>
          Not quite right? Update your skin details
        </Text>
      </Pressable>
    </Card>
  );
}
