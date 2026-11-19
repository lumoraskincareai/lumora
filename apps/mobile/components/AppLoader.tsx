import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./ui/Text";
import { useTheme } from "../src/theme/ThemeContext";

// Full-screen loader for app start: pulsing logo, three bouncing dots and a
// tagline. Uses core Animated; the native driver is off on web, where it
// isn't supported.
const useNative = Platform.OS !== "web";

function Dot({ delay, color }: { delay: number; color: string }) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, {
          toValue: -8,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: useNative,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: useNative,
        }),
        Animated.delay(450 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, y]);

  return (
    <Animated.View
      style={{
        width: 9,
        height: 9,
        borderRadius: 5,
        marginHorizontal: 4,
        backgroundColor: color,
        transform: [{ translateY: y }],
      }}
    />
  );
}

export function AppLoader({ message = "Getting things ready" }: { message?: string }) {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useNative,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useNative,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Lumora"
    >
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={{
            position: "absolute",
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: "#FFFFFF",
            opacity: glow,
            transform: [{ scale }],
          }}
        />
        <Animated.View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale }],
          }}
        >
          <Sparkles size={44} color={theme.primary} />
        </Animated.View>
      </View>

      <Text
        style={{
          marginTop: 28,
          fontSize: 26,
          fontWeight: "800",
          color: "#FFFFFF",
          letterSpacing: 1,
        }}
      >
        Lumora
      </Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: "#FFFFFF", opacity: 0.85 }}>
        {message}
      </Text>

      <View style={{ flexDirection: "row", marginTop: 22, height: 20, alignItems: "flex-end" }}>
        <Dot delay={0} color="#FFFFFF" />
        <Dot delay={150} color="#FFFFFF" />
        <Dot delay={300} color="#FFFFFF" />
      </View>
    </LinearGradient>
  );
}
