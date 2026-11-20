import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "../../components/ui/Text";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { Lock, Mail } from "lucide-react-native";
import { loginSchema, LoginInput } from "../../src/lib/validation/auth";
import { loginUser } from "../../src/api/auth";
import { ApiError } from "../../src/api/client";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useTheme } from "../../src/theme/ThemeContext";
import { useGoogleSignIn } from "../../src/lib/useGoogleSignIn";
import { AuthShell } from "../../components/auth/AuthShell";
import { AuthField } from "../../components/auth/AuthField";
import { GoogleButton, OrDivider, PrimaryButton, LegalText } from "../../components/auth/AuthParts";

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { signInWithGoogle, isLoading: isGoogleLoading } = useGoogleSignIn();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const response = await loginUser(data);
      await setAuth(response.user, response.accessToken, response.refreshToken);
      Toast.show({ type: "success", text1: "Welcome back!" });
      // The start screen sends people without a skin profile to onboarding.
      router.replace("/");
    } catch (err: any) {
      // The password was right but the email was never verified: the API has
      // just sent a fresh code, so take the person to enter it.
      if (err instanceof ApiError && err.data?.needsVerification) {
        router.push({
          pathname: "/(auth)/verify-email",
          params: { email: String(err.data.email ?? data.email) },
        });
        return;
      }
      Toast.show({
        type: "error",
        text1: err.message || "Invalid email or password",
      });
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to see your personalized routine and daily brief.">
      <GoogleButton onPress={signInWithGoogle} loading={isGoogleLoading} />
      <OrDivider label="or log in with email" />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <AuthField
            label="Email"
            icon={Mail}
            error={errors.email?.message}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="next"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <AuthField
            label="Password"
            icon={Lock}
            secure
            error={errors.password?.message}
            placeholder="Your password"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onBlur={onBlur}
            onChangeText={onChange}
            onSubmitEditing={!isValid || isSubmitting ? undefined : handleSubmit(onSubmit)}
            value={value}
          />
        )}
      />

      <Pressable
        onPress={() => router.push("/(auth)/forgot-password")}
        accessibilityRole="button"
        hitSlop={8}
        className="self-end mt-3"
      >
        <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "700" }}>Forgot password?</Text>
      </Pressable>

      <PrimaryButton
        label="Log in"
        busyLabel="Logging in..."
        busy={isSubmitting}
        disabled={!isValid}
        onPress={handleSubmit(onSubmit)}
      />

      <View className="flex-row justify-center mt-5">
        <Text style={{ color: theme.muted, fontSize: 14 }}>New to Lumora? </Text>
        <Link href="/(auth)/signup" style={{ color: theme.primary, fontWeight: "800", fontSize: 14 }}>
          Create an account
        </Link>
      </View>

      <LegalText />
    </AuthShell>
  );
}
