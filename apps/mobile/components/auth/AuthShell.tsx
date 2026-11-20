import React from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles } from "lucide-react-native";
import { Text } from "../ui/Text";
import { HeroArt } from "../home/art/HeroArt";
import { useTheme } from "../../src/theme/ThemeContext";

/** Shared frame for the sign-in screens: colour wash, brand, title, and the form card. */
export function AuthShell({
  title,
  subtitle,
  showArt = true,
  children,
}: {
  title: string;
  subtitle: string;
  showArt?: boolean;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={[theme.primaryLight, theme.background]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 380 }}
      />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          <View className="flex-row items-start">
            <Text style={{ color: theme.foreground, fontSize: 34, fontWeight: "800", letterSpacing: -0.5 }}>
              Lumora
            </Text>
            <Sparkles size={15} color={theme.primary} style={{ marginTop: 7, marginLeft: 2 }} />
          </View>

          {showArt ? (
            <View
              className="items-center justify-center rounded-full mt-5"
              style={{ width: 118, height: 118, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
            >
              <HeroArt accent={theme.primary} width={82} height={97} />
            </View>
          ) : null}

          <Text
            accessibilityRole="header"
            style={{ color: theme.foreground, fontSize: 26, fontWeight: "800", marginTop: 20, textAlign: "center" }}
          >
            {title}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 14, marginTop: 4, textAlign: "center", lineHeight: 20 }}>
            {subtitle}
          </Text>
        </View>

        <View
          className="mt-6"
          style={{
            backgroundColor: theme.card,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 20,
            shadowColor: theme.primary,
            shadowOpacity: 0.1,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 3,
          }}
        >
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
