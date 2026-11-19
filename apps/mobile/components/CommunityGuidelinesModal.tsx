import React, { useState } from "react";
import { View, ScrollView, Pressable, Modal } from "react-native";
import { Check, ShieldCheck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./ui/Text";
import { GUIDELINES } from "../src/lib/communityGuidelines";

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  theme: any;
};

// Shown before a user enters the community. The user has to tick the
// confirmation box before "I agree" unlocks, so it can't be tapped through.
export function CommunityGuidelinesModal({
  visible,
  onAccept,
  onDecline,
  theme,
}: Props) {
  const insets = useSafeAreaInsets();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDecline}
    >
      <View
        className="flex-1 items-center justify-center px-5"
        style={{
          backgroundColor: "rgba(0,0,0,0.55)",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View
          className="w-full rounded-3xl p-5"
          style={{
            backgroundColor: theme.background,
            maxHeight: "90%",
            maxWidth: 480,
          }}
        >
          <View className="items-center mb-3">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: theme.primaryLight }}
            >
              <ShieldCheck size={26} color={theme.primary} />
            </View>
            <Text
              className="text-xl font-bold text-center"
              style={{ color: theme.foreground }}
            >
              Keep our community kind
            </Text>
            <Text
              className="text-sm text-center mt-1"
              style={{ color: theme.muted }}
            >
              Lumora Community is a supportive space for skincare. Please
              read and follow these guidelines.
            </Text>
          </View>

          <ScrollView
            style={{ flexGrow: 0 }}
            showsVerticalScrollIndicator={false}
          >
            {GUIDELINES.map((g, i) => (
              <View
                key={g.id}
                className="flex-row gap-3 py-2.5"
                style={{
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.border,
                }}
              >
                <View
                  className="w-6 h-6 rounded-full items-center justify-center mt-0.5"
                  style={{ backgroundColor: theme.primaryLight }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: theme.primary }}
                  >
                    {i + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: theme.foreground }}
                  >
                    {g.title}
                  </Text>
                  <Text
                    className="text-xs leading-5 mt-0.5"
                    style={{ color: theme.muted }}
                  >
                    {g.body}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <Text
            className="text-[11px] text-center mt-1"
            style={{ color: theme.muted }}
          >
            Scroll to read all {GUIDELINES.length} guidelines
          </Text>

          <Pressable
            onPress={() => setConfirmed((c) => !c)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmed }}
            accessibilityLabel="I have read and agree to follow the community guidelines"
            className="flex-row items-center gap-3 mt-3 py-2"
          >
            <View
              className="w-5 h-5 rounded items-center justify-center"
              style={{
                borderWidth: 1.5,
                borderColor: confirmed ? theme.primary : theme.border,
                backgroundColor: confirmed ? theme.primary : "transparent",
              }}
            >
              {confirmed && <Check size={13} color="#fff" strokeWidth={3} />}
            </View>
            <Text
              className="flex-1 text-xs"
              style={{ color: theme.foreground }}
            >
              I have read and agree to follow the community guidelines.
            </Text>
          </Pressable>

          <Pressable
            onPress={onAccept}
            disabled={!confirmed}
            accessibilityRole="button"
            accessibilityState={{ disabled: !confirmed }}
            className="rounded-xl py-3 items-center mt-2"
            style={{
              backgroundColor: confirmed ? theme.primary : theme.primaryLight,
            }}
          >
            <Text className="text-white text-sm font-semibold">
              I agree, enter community
            </Text>
          </Pressable>
          <Pressable
            onPress={onDecline}
            accessibilityRole="button"
            className="py-3 items-center"
          >
            <Text
              className="text-sm font-medium"
              style={{ color: theme.muted }}
            >
              Not now
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
