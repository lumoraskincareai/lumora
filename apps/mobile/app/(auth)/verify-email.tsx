import React, { useEffect, useState } from "react";
import {
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Text, TextInput } from "../../components/ui/Text";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { MailCheck } from "lucide-react-native";
import {
  verifyEmailSchema,
  VerifyEmailInput,
} from "../../src/lib/validation/auth";
import { verifyEmail, resendVerification } from "../../src/api/auth";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useTheme } from "../../src/theme/ThemeContext";

// Matches the API's resend cooldown (VERIFY_RESEND_COOLDOWN_MS).
const RESEND_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [isResending, setIsResending] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    mode: "onChange",
    defaultValues: { code: "" },
  });

  // A code was just sent to get here, so the resend button starts on cooldown.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onSubmit = async ({ code }: VerifyEmailInput) => {
    if (!email) {
      Toast.show({ type: "error", text1: "Missing email — start over" });
      return;
    }
    try {
      const response = await verifyEmail({ email, code });
      await setAuth(response.user, response.accessToken, response.refreshToken);
      Toast.show({ type: "success", text1: "Email verified. Welcome to Lumora!" });
      router.replace("/(onboarding)/skin-type");
    } catch (err: any) {
      reset({ code: "" });
      Toast.show({
        type: "error",
        text1: err.message || "Invalid or expired code",
      });
    }
  };

  const onResend = async () => {
    if (!email || secondsLeft > 0) return;
    setIsResending(true);
    try {
      await resendVerification(email);
      setSecondsLeft(RESEND_SECONDS);
      Toast.show({ type: "success", text1: "New code sent" });
    } catch (err: any) {
      Toast.show({ type: "error", text1: err.message || "Could not resend code" });
    } finally {
      setIsResending(false);
    }
  };

  const disabled = !isValid || isSubmitting;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="self-center items-center justify-center rounded-full mb-4"
          style={{
            width: 56,
            height: 56,
            backgroundColor: theme.primaryLight,
          }}
        >
          <MailCheck size={26} color={theme.primary} />
        </View>

        <Text
          className="text-2xl font-bold text-center"
          style={{ color: theme.foreground }}
          accessibilityRole="header"
        >
          Verify your email
        </Text>
        <Text
          className="text-sm text-center mt-1 mb-6"
          style={{ color: theme.muted }}
        >
          {email
            ? `We sent a 6-digit code to ${email}.`
            : "Enter the 6-digit code from your email."}
        </Text>

        <View
          className="rounded-2xl p-5"
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            className="text-sm font-medium mb-1.5"
            style={{ color: theme.foreground }}
          >
            Verification code
          </Text>
          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="rounded-xl px-3.5 py-3.5"
                style={{
                  borderWidth: 1,
                  borderColor: errors.code ? "#EF4444" : theme.border,
                  backgroundColor: theme.background,
                  color: theme.foreground,
                  fontSize: 26,
                  fontWeight: "600",
                  letterSpacing: 10,
                  textAlign: "center",
                }}
                placeholder="000000"
                placeholderTextColor={theme.border}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                accessibilityLabel="Verification code"
                onBlur={onBlur}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, "");
                  onChange(digits);
                  // Submit as soon as the sixth digit is in.
                  if (digits.length === 6 && !isSubmitting) {
                    void onSubmit({ code: digits });
                  }
                }}
                value={value}
              />
            )}
          />
          {errors.code && (
            <Text
              className="text-[13px] mt-1 ml-0.5"
              style={{ color: "#EF4444" }}
              accessibilityRole="alert"
            >
              {errors.code.message}
            </Text>
          )}

          <Pressable
            className="rounded-xl py-3.5 items-center mt-5"
            style={{
              backgroundColor: disabled ? theme.primaryLight : theme.primary,
            }}
            onPress={handleSubmit(onSubmit)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Verify email"
            accessibilityState={{ disabled, busy: isSubmitting }}
          >
            <Text
              className="text-[15px] font-semibold"
              style={{ color: disabled ? theme.primary : "#FFFFFF" }}
            >
              {isSubmitting ? "Verifying..." : "Verify email"}
            </Text>
          </Pressable>

          <Pressable
            className="items-center mt-5"
            onPress={onResend}
            disabled={isResending || secondsLeft > 0 || !email}
            accessibilityRole="button"
          >
            <Text
              className="text-[13px]"
              style={{
                color: secondsLeft > 0 || isResending ? theme.muted : theme.primary,
                fontWeight: secondsLeft > 0 || isResending ? "400" : "500",
              }}
            >
              {isResending
                ? "Sending..."
                : secondsLeft > 0
                  ? `Resend code in ${secondsLeft}s`
                  : "Didn't get a code? Resend"}
            </Text>
          </Pressable>

          <View className="flex-row justify-center mt-4">
            <Text className="text-[13px]" style={{ color: theme.muted }}>
              Wrong email?{" "}
            </Text>
            <Link
              href="/(auth)/signup"
              style={{ color: theme.primary, fontWeight: "500", fontSize: 13 }}
            >
              Start over
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
