import React, { useState } from "react";
import { Modal, Pressable, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { Trash2, Lock } from "lucide-react-native";
import { Text, TextInput } from "./ui/Text";
import { Card } from "./ui/Card";
import { useTheme } from "../src/theme/ThemeContext";
import { useAuthStore } from "../src/store/useAuthStore";
import { deleteMyAccount, getMyProfile } from "../src/api/users";

const DANGER = "#DC2626";

/** Settings card that permanently deletes the account, after a password (or "DELETE") confirmation. */
export function DeleteAccountCard() {
  const { theme } = useTheme();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const [open, setOpen] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setValue("");
    setError(null);
    // If this lookup fails, ask for a password. The server still decides what is accepted.
    const profile = await getMyProfile().catch(() => null);
    setHasPassword(profile?.hasPassword !== false);
    setOpen(true);
  };

  const confirmed = hasPassword ? value.length > 0 : value.trim() === "DELETE";

  const submit = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount(hasPassword ? { password: value } : { confirm: "DELETE" });
      setOpen(false);
      await logout();
      Toast.show({ type: "success", text1: "Your account has been deleted" });
      router.replace("/(auth)/login");
    } catch (err: any) {
      setError(err.message || "Could not delete your account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="p-4" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
        <Text className="text-xs font-semibold uppercase mb-1" style={{ color: theme.muted }}>
          Account
        </Text>
        <Text className="text-sm font-medium" style={{ color: theme.foreground }}>
          Delete account
        </Text>
        <Text className="text-xs mt-0.5 mb-3" style={{ color: theme.muted }}>
          Permanently deletes your profile, check-ins, photos, routines, reviews and posts. This
          can&apos;t be undone.
        </Text>
        <Pressable
          onPress={start}
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
          className="flex-row items-center justify-center gap-2 rounded-full"
          style={{ height: 46, borderWidth: 1.5, borderColor: DANGER }}
        >
          <Trash2 size={16} color={DANGER} />
          <Text style={{ color: DANGER, fontWeight: "700", fontSize: 14 }}>Delete my account</Text>
        </Pressable>
      </Card>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => !busy && setOpen(false)}>
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
          <View className="w-full rounded-3xl p-5" style={{ backgroundColor: theme.card }}>
            <View
              className="items-center justify-center self-center rounded-full mb-3"
              style={{ width: 52, height: 52, backgroundColor: `${DANGER}1A` }}
            >
              <Trash2 size={24} color={DANGER} />
            </View>
            <Text style={{ color: theme.foreground, fontSize: 18, fontWeight: "800", textAlign: "center" }}>
              Delete your account?
            </Text>
            <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 }}>
              {hasPassword
                ? "Enter your password to confirm. Everything you've added to Lumora will be removed for good."
                : 'Type DELETE to confirm. Everything you\'ve added to Lumora will be removed for good.'}
            </Text>

            <View
              className="flex-row items-center rounded-2xl px-3.5 mt-4"
              style={{ height: 50, backgroundColor: theme.background, borderWidth: 1, borderColor: error ? DANGER : theme.border }}
            >
              <Lock size={17} color={theme.muted} />
              <TextInput
                value={value}
                onChangeText={(t) => {
                  setValue(t);
                  setError(null);
                }}
                placeholder={hasPassword ? "Your password" : "DELETE"}
                placeholderTextColor={theme.muted}
                secureTextEntry={hasPassword}
                autoCapitalize={hasPassword ? "none" : "characters"}
                autoCorrect={false}
                accessibilityLabel={hasPassword ? "Password" : "Type DELETE to confirm"}
                onSubmitEditing={submit}
                style={{ flex: 1, marginLeft: 10, fontSize: 15, color: theme.foreground, paddingVertical: 0 }}
              />
            </View>
            {error ? (
              <Text accessibilityRole="alert" style={{ color: DANGER, fontSize: 12.5, marginTop: 6 }}>
                {error}
              </Text>
            ) : null}

            <View className="flex-row gap-3 mt-5">
              <Pressable
                onPress={() => setOpen(false)}
                disabled={busy}
                accessibilityRole="button"
                className="flex-1 items-center justify-center rounded-full"
                style={{ height: 48, borderWidth: 1, borderColor: theme.border }}
              >
                <Text style={{ color: theme.foreground, fontWeight: "700", fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={!confirmed || busy}
                accessibilityRole="button"
                accessibilityState={{ disabled: !confirmed || busy, busy }}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-full"
                style={{ height: 48, backgroundColor: DANGER, opacity: !confirmed || busy ? 0.45 : 1 }}
              >
                {busy ? <ActivityIndicator size="small" color="#fff" /> : null}
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Delete forever</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
