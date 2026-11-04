import React from "react";
import {
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Text, TextInput } from "../../components/ui/Text";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { signupSchema, SignupInput } from "../../src/lib/validation/auth";
import { signupUser } from "../../src/api/auth";
import { useTheme } from "../../src/theme/ThemeContext";
import { useGoogleSignIn } from "../../src/lib/useGoogleSignIn";
import { GoogleIcon } from "../../components/ui/GoogleIcon";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { PasswordStrength } from "../../components/PasswordStrength";

const ERROR_COLOR = "#EF4444";

function FieldLabel({ children }: { children: string }) {
  const { theme } = useTheme();
  return (
    <Text
      className="text-sm font-medium mb-1.5 mt-3.5"
      style={{ color: theme.foreground }}
    >
      {children}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text
      className="text-[13px] mt-1 ml-0.5"
      style={{ color: ERROR_COLOR }}
      accessibilityRole="alert"
    >
      {message}
    </Text>
  );
}

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

  const inputStyle = (hasError: boolean) => ({
    borderWidth: 1,
    borderColor: hasError ? ERROR_COLOR : theme.border,
    backgroundColor: theme.background,
    color: theme.foreground,
  });

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
          className="flex-row items-center self-center rounded-full px-3 py-1.5 mb-4"
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View
            className="w-1.5 h-1.5 rounded-full mr-2"
            style={{ backgroundColor: theme.primary }}
          />
          <Text className="text-xs" style={{ color: theme.muted }}>
            Lumora • AI Beauty Companion
          </Text>
        </View>

        <Text
          className="text-2xl font-bold text-center"
          style={{ color: theme.foreground }}
          accessibilityRole="header"
        >
          Create your account
        </Text>
        <Text
          className="text-sm text-center mt-1 mb-6"
          style={{ color: theme.muted }}
        >
          Get your first AI Beauty Brief in minutes.
        </Text>

        <View
          className="rounded-2xl p-5"
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl py-3 mb-4"
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              opacity: isGoogleLoading ? 0.6 : 1,
            }}
            onPress={signInWithGoogle}
            disabled={isGoogleLoading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <GoogleIcon size={18} />
            <Text
              className="text-sm font-medium"
              style={{ color: theme.foreground }}
            >
              {isGoogleLoading ? "Connecting..." : "Continue with Google"}
            </Text>
          </Pressable>

          <View className="flex-row items-center mb-1">
            <View
              className="flex-1 h-px"
              style={{ backgroundColor: theme.border }}
            />
            <Text className="mx-2.5 text-xs" style={{ color: theme.muted }}>
              or sign up with email
            </Text>
            <View
              className="flex-1 h-px"
              style={{ backgroundColor: theme.border }}
            />
          </View>

          <FieldLabel>Name</FieldLabel>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="rounded-xl px-3.5 py-3 text-[15px]"
                style={inputStyle(!!errors.name)}
                placeholder="Your name"
                placeholderTextColor={theme.muted}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                accessibilityLabel="Name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <FieldError message={errors.name?.message} />

          <FieldLabel>Email</FieldLabel>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="rounded-xl px-3.5 py-3 text-[15px]"
                style={inputStyle(!!errors.email)}
                placeholder="you@example.com"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="next"
                accessibilityLabel="Email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <FieldError message={errors.email?.message} />

          <FieldLabel>Password</FieldLabel>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <PasswordInput
                hasError={!!errors.password}
                placeholder="Create a password"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                accessibilityLabel="Password"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={disabled ? undefined : handleSubmit(onSubmit)}
                value={value}
              />
            )}
          />
          <PasswordStrength password={password ?? ""} />
          {/* The checklist above already explains the rules; only surface the
              schema's message for the cases it doesn't cover (e.g. too long). */}
          {errors.password?.message === "Password is too long" && (
            <FieldError message={errors.password.message} />
          )}

          <Pressable
            className="rounded-xl py-3.5 items-center mt-6"
            style={{
              backgroundColor: disabled ? theme.primaryLight : theme.primary,
            }}
            onPress={handleSubmit(onSubmit)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled, busy: isSubmitting }}
          >
            <Text
              className="text-[15px] font-semibold"
              style={{ color: disabled ? theme.primary : "#FFFFFF" }}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Text>
          </Pressable>

          <View className="flex-row justify-center mt-5">
            <Text className="text-[13px]" style={{ color: theme.muted }}>
              Already have an account?{" "}
            </Text>
            <Link
              href="/(auth)/login"
              style={{ color: theme.primary, fontWeight: "500", fontSize: 13 }}
            >
              Log in
            </Link>
          </View>

          <Text
            className="text-[13px] text-center mt-5 leading-4"
            style={{ color: theme.muted }}
          >
            By continuing, you agree to our Terms & Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
