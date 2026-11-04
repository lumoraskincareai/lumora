import React, { useState } from "react";
import { Pressable, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { TextInput } from "./Text";
import { useTheme } from "../../src/theme/ThemeContext";

interface PasswordInputProps extends Omit<TextInputProps, "secureTextEntry"> {
  hasError?: boolean;
}

/** A password field with a show/hide toggle. Pass autoComplete="new-password" when choosing a password. */
export function PasswordInput({ hasError, style, ...rest }: PasswordInputProps) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View className="justify-center">
      <TextInput
        {...rest}
        className="rounded-xl pl-3.5 pr-12 py-3 text-[15px]"
        style={[
          {
            borderWidth: 1,
            borderColor: hasError ? "#EF4444" : theme.border,
            backgroundColor: theme.background,
            color: theme.foreground,
          },
          style,
        ]}
        placeholderTextColor={theme.muted}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        className="absolute right-3.5 h-8 w-8 items-center justify-center"
      >
        {visible ? (
          <EyeOff size={18} color={theme.muted} />
        ) : (
          <Eye size={18} color={theme.muted} />
        )}
      </Pressable>
    </View>
  );
}
