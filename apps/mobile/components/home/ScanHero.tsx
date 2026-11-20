import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "../ui/Text";
import { LinearGradient } from "expo-linear-gradient";
import { HeroArt } from "./art/HeroArt";
import { ArrowRight } from "lucide-react-native";
import type { Palette } from "../../src/theme/palettes";

export function ScanHero({
  theme,
  onPress,
}: {
  theme: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Scan my face">
      {({ pressed }) => (
        <LinearGradient
          colors={[theme.primaryLight, theme.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 28,
            padding: 20,
            borderWidth: 1,
            borderColor: theme.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          }}
        >
          <View className="flex-row items-center">
            <View className="flex-1 pr-2">
              <Text style={{ color: theme.foreground, fontSize: 25, fontWeight: "800", lineHeight: 30 }}>
                Know Your Skin
              </Text>
              <Text style={{ color: theme.primary, fontSize: 25, fontWeight: "800", lineHeight: 30 }}>Better</Text>
              <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
                Scan your face, get an AI analysis and personalized product recommendations.
              </Text>
              <View
                className="flex-row items-center self-start gap-2 rounded-full px-5 mt-4"
                style={{ height: 44, backgroundColor: theme.primary }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Scan My Face</Text>
                <ArrowRight size={16} color="#fff" />
              </View>
            </View>

            <View style={{ width: 132 }}>
              <HeroArt accent={theme.primary} />
            </View>
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );
}
