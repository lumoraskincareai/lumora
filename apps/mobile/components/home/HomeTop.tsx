import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "../ui/Text";
import { Flame, Search, ScanLine, Sparkles, Sun } from "lucide-react-native";
import type { Palette } from "../../src/theme/palettes";
import type { WeatherData } from "../../src/api/weather";
import { iconColors } from "../../src/theme/iconColors";
import { greetingFor, firstName } from "../../src/lib/homeCopy";

export function HomeTop({
  theme,
  name,
  streak,
  weather,
  onSearch,
  onStreak,
}: {
  theme: Palette;
  name?: string | null;
  streak: number;
  weather: WeatherData | null;
  onSearch: () => void;
  onStreak: () => void;
}) {
  const first = firstName(name);
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-start">
          <Text style={{ color: theme.foreground, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 }}>
            Lumora
          </Text>
          <Sparkles size={14} color={theme.primary} style={{ marginTop: 6, marginLeft: 2 }} />
        </View>

        <Pressable
          onPress={onStreak}
          accessibilityRole="button"
          accessibilityLabel={`${streak} day streak`}
          className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
          style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
        >
          <Flame size={16} color={iconColors.morning} fill={streak > 0 ? iconColors.morning : "transparent"} />
          <Text style={{ color: theme.foreground, fontWeight: "700", fontSize: 13 }}>{streak}</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onSearch}
        accessibilityRole="search"
        accessibilityLabel="Search products and reviews"
        className="flex-row items-center gap-3 rounded-full px-4 mt-4"
        style={{
          height: 50,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: theme.primary,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        <Search size={18} color={theme.muted} />
        <Text style={{ color: theme.muted, fontSize: 14, flex: 1 }} numberOfLines={1}>
          Search products, reviews...
        </Text>
        <ScanLine size={20} color={theme.muted} />
      </Pressable>

      <Text style={{ color: theme.foreground, fontSize: 26, fontWeight: "800", marginTop: 22 }}>
        {first ? `Hi ${first} 👋` : "Hi there 👋"}
      </Text>
      <View className="flex-row items-center flex-wrap gap-x-2 gap-y-1.5 mt-1">
        <Text style={{ color: theme.muted, fontSize: 14 }}>
          {greetingFor()}. Your personalized skincare companion
        </Text>
      </View>

      {weather ? (
        <View
          className="flex-row items-center self-start gap-1.5 rounded-full px-3 py-1.5 mt-3"
          style={{ backgroundColor: `${iconColors.amber}22` }}
        >
          <Sun size={14} color={iconColors.amber} />
          <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: "600" }}>
            {weather.temp}°C · {weather.condition} · {weather.humidity}% humidity
          </Text>
        </View>
      ) : null}
    </View>
  );
}
