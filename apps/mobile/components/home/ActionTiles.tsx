import React from "react";
import { View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../ui/Text";
import type { Palette } from "../../src/theme/palettes";
import { iconColors } from "../../src/theme/iconColors";
import { TileArt, type TileKind } from "./art/TileArt";

type Tile = {
  key: TileKind;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
};

// A 2x2 grid of wide cards: text on the left, illustration on the right. Each card is the same
// size, and the wider layout keeps titles like "Product Match" on one line.
export function ActionTiles({
  theme,
  onRoutine,
  onProductMatch,
  onReview,
  onCommunity,
}: {
  theme: Palette;
  onRoutine: () => void;
  onProductMatch: () => void;
  onReview: () => void;
  onCommunity: () => void;
}) {
  const tiles: Tile[] = [
    { key: "routine", title: "My Routine", subtitle: "Personalized for you", color: iconColors.pink, onPress: onRoutine },
    { key: "match", title: "Product Match", subtitle: "Is it right for me?", color: iconColors.teal, onPress: onProductMatch },
    { key: "review", title: "Write a Review", subtitle: "Share your experience", color: iconColors.amber, onPress: onReview },
    { key: "community", title: "Community", subtitle: "Ask, discuss, learn", color: iconColors.purple, onPress: onCommunity },
  ];

  return (
    <View className="flex-row flex-wrap" style={{ gap: 12 }}>
      {tiles.map((t) => (
        <Pressable
          key={t.key}
          onPress={t.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${t.title}. ${t.subtitle}`}
          style={{ width: "48%", flexGrow: 1 }}
        >
          {({ pressed }) => (
            <LinearGradient
              colors={[`${t.color}30`, `${t.color}0D`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 104,
                borderRadius: 24,
                paddingLeft: 14,
                paddingRight: 8,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: `${t.color}2E`,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              }}
            >
              <View className="flex-1 pr-1">
                <Text numberOfLines={2} style={{ color: theme.foreground, fontSize: 14.5, fontWeight: "800", lineHeight: 18 }}>
                  {t.title}
                </Text>
                <Text numberOfLines={2} style={{ color: theme.muted, fontSize: 11.5, lineHeight: 15, marginTop: 3 }}>
                  {t.subtitle}
                </Text>
              </View>
              <TileArt kind={t.key} size={54} />
            </LinearGradient>
          )}
        </Pressable>
      ))}
    </View>
  );
}
