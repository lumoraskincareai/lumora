import React from "react";
import { View } from "react-native";
import { Text } from "../../components/ui/Text";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { Lock, Mail, User } from "lucide-react-native";
import { signupSchema, SignupInput } from "../../src/lib/validation/auth";
import { signupUser } from "../../src/api/auth";
import { useTheme } from "../../src/theme/ThemeContext";
import { useGoogleSignIn } from "../../src/lib/useGoogleSignIn";
import { PasswordStrength } from "../../components/PasswordStrength";
import { AuthShell } from "../../components/auth/AuthShell";
import { AuthField } from "../../components/auth/AuthField";
import { GoogleButton, OrDivider, PrimaryButton, LegalText } from "../../components/auth/AuthParts";

export default function SignupScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { signInWithGoogle, isLoading: isGoogleLoading } = useGoogleSignIn();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", password: "" },
  });

  const password = watch("password");

  const onSubmit = async (data: SignupInput) => {
    try {
      const response = await signupUser(data);
      Toast.show({ type: "success", text1: "We sent you a verification code" });
      router.replace({
        pathname: "/(auth)/verify-email",
        params: { email: response.email },
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: err.message || "Could not create account",
      });
    }
  };

  const disabled = !isValid;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Get your first AI Beauty Brief in minutes."
      showArt={false}
    >
      <GoogleButton onPress={signInWithGoogle} loading={isGoogleLoading} />
      <OrDivider label="or sign up with email" />

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <AuthField
            label="Name"
            icon={User}
            error={errors.name?.message}
            placeholder="Your name"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />

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
            // The checklist below already explains the rules; only surface the
            // schema's message for the cases it doesn't cover (e.g. too long).
            error={errors.password?.message === "Password is too long" ? errors.password.message : undefined}
            placeholder="Create a password"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onBlur={onBlur}
            onChangeText={onChange}
            onSubmitEditing={disabled || isSubmitting ? undefined : handleSubmit(onSubmit)}
            value={value}
          />
        )}
      />
      <PasswordStrength password={password ?? ""} />

      <PrimaryButton
        label="Create account"
        busyLabel="Creating account..."
        busy={isSubmitting}
        disabled={disabled}
        onPress={handleSubmit(onSubmit)}
      />

      <View className="flex-row justify-center mt-5">
        <Text style={{ color: theme.muted, fontSize: 14 }}>Already have an account? </Text>
        <Link href="/(auth)/login" style={{ color: theme.primary, fontWeight: "800", fontSize: 14 }}>
          Log in
        </Link>
      </View>

      <LegalText />
    </AuthShell>
  );
}
