import React from "react";
import { View, Pressable, ActivityIndicator, Linking } from "react-native";
import { Text } from "../ui/Text";
import { GoogleIcon } from "../ui/GoogleIcon";
import { useTheme } from "../../src/theme/ThemeContext";
import { legalParts } from "../../src/lib/legal";

export function GoogleButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      className="flex-row items-center justify-center gap-2.5 rounded-full"
      style={{
        height: 52,
        backgroundColor: theme.background,
        borderWidth: 1,
        borderColor: theme.border,
        opacity: loading ? 0.6 : 1,
      }}
    >
      <GoogleIcon size={19} />
      <Text style={{ color: theme.foreground, fontSize: 14.5, fontWeight: "700" }}>
        {loading ? "Connecting..." : "Continue with Google"}
      </Text>
    </Pressable>
  );
}

export function OrDivider({ label = "or" }: { label?: string }) {
  const { theme } = useTheme();
  return (
    <View className="flex-row items-center mt-5">
      <View className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
      <Text style={{ color: theme.muted, fontSize: 12, marginHorizontal: 12 }}>{label}</Text>
      <View className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
    </View>
  );
}

export function PrimaryButton({
  label,
  busyLabel,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  busyLabel: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      className="flex-row items-center justify-center gap-2 rounded-full mt-6"
      style={{
        height: 54,
        backgroundColor: off ? theme.primaryLight : theme.primary,
        shadowColor: theme.primary,
        shadowOpacity: off ? 0 : 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: off ? 0 : 4,
      }}
    >
      {busy ? <ActivityIndicator size="small" color={theme.primary} /> : null}
      <Text style={{ color: off ? theme.primary : "#FFFFFF", fontSize: 15.5, fontWeight: "800" }}>
        {busy ? busyLabel : label}
      </Text>
    </Pressable>
  );
}

/** "By continuing, you agree to our Terms and Privacy Policy." Links only the pages that exist. */
export function LegalText() {
  const { theme } = useTheme();
  return (
    <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 20 }}>
      {legalParts().map((part, i) =>
        part.url ? (
          <Text
            key={i}
            accessibilityRole="link"
            onPress={() => Linking.openURL(part.url as string)}
            style={{ color: theme.primary, fontWeight: "700", fontSize: 12 }}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={i} style={{ color: theme.muted, fontSize: 12 }}>
            {part.text}
          </Text>
        ),
      )}
    </Text>
  );
}
