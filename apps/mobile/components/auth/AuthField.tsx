import React, { useState } from "react";
import { View, Pressable, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Text, TextInput } from "../ui/Text";
import { useTheme } from "../../src/theme/ThemeContext";

const ERROR_COLOR = "#EF4444";

type IconType = React.ComponentType<{ size?: number; color?: string }>;

interface AuthFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  icon: IconType;
  error?: string | undefined;
  /** Adds a show/hide toggle and hides the text. */
  secure?: boolean;
}

/** Label, icon, input and error in one piece, with a coloured border on focus. */
export function AuthField({ label, icon: Icon, error, secure, ...input }: AuthFieldProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  const borderColor = error ? ERROR_COLOR : focused ? theme.primary : theme.border;
  const iconColor = error ? ERROR_COLOR : focused ? theme.primary : theme.muted;

  return (
    <View className="mt-4">
      <Text style={{ color: theme.foreground, fontSize: 13.5, fontWeight: "700", marginBottom: 6 }}>{label}</Text>
      <View
        className="flex-row items-center rounded-2xl px-3.5"
        style={{
          height: 52,
          backgroundColor: theme.background,
          borderWidth: focused ? 1.5 : 1,
          borderColor,
        }}
      >
        <Icon size={18} color={iconColor} />
        <TextInput
          {...input}
          accessibilityLabel={input.accessibilityLabel ?? label}
          placeholderTextColor={theme.muted}
          secureTextEntry={secure ? !visible : false}
          autoCapitalize={secure ? "none" : input.autoCapitalize}
          autoCorrect={secure ? false : input.autoCorrect}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={{ flex: 1, marginLeft: 10, fontSize: 15, color: theme.foreground, paddingVertical: 0 }}
        />
        {secure ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff size={18} color={theme.muted} /> : <Eye size={18} color={theme.muted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: ERROR_COLOR, fontSize: 12.5, marginTop: 5, marginLeft: 2 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
