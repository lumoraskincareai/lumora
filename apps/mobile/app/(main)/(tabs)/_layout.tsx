import { Tabs, useRouter } from "expo-router";
import {
  Compass,
  House,
  User,
  Users,
  Plus,
  ListChecks,
  PackagePlus,
  Star,
  ScanLine,
  ScanFace,
  Camera,
  ChevronRight,
} from "lucide-react-native";
import React, { useState } from "react";
import { View, Pressable, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../../components/ui/Text";
import { useTheme } from "../../../src/theme/ThemeContext";
import { iconColors } from "../../../src/theme/iconColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function QuickActionSheet({ visible, onClose, theme }: any) {
  const router = useRouter();

  const actions = [
    {
      label: "Log a skin check-in",
      route: "/(main)/(tabs)/home",
      icon: Camera,
      color: iconColors.purple,
    },
    {
      label: "Scan your face",
      route: "/(main)/face-scan",
      icon: ScanFace,
      color: iconColors.pink,
    },
    {
      label: "Create routine",
      route: "/(main)/routine-builder",
      icon: ListChecks,
      color: iconColors.blue,
    },
    {
      label: "Add product",
      route: "/(main)/add-my-product",
      icon: PackagePlus,
      color: iconColors.teal,
    },
    {
      label: "Write a review",
      route: "/(main)/share-review",
      icon: Star,
      color: iconColors.pink,
    },
    {
      label: "Is this right for me?",
      route: "/(main)/scan-product",
      icon: ScanLine,
      color: iconColors.purple,
    },
  ];
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
      >
        <View
          className="rounded-t-3xl p-5"
          style={{ backgroundColor: theme.background }}
        >
          <Text
            className="text-base font-semibold mb-4"
            style={{ color: theme.foreground }}
          >
            Quick actions
          </Text>
          {actions.map((a) => (
            <Pressable
              key={a.route}
              onPress={() => {
                onClose();
                router.push(a.route as any);
              }}
              className="flex-row items-center gap-3 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: `${a.color}22` }}
              >
                <a.icon size={18} color={a.color} />
              </View>
              <Text
                className="flex-1 text-sm font-medium"
                style={{ color: theme.foreground }}
              >
                {a.label}
              </Text>
              <ChevronRight size={16} color={theme.muted} />
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

// A tab icon with a soft pill behind it when its tab is active.
function TabIcon({
  Icon,
  color,
  focused,
  tint,
}: {
  Icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  color: string;
  focused: boolean;
  tint: string;
}) {
  return (
    <View
      style={{
        width: 52,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? tint : "transparent",
      }}
    >
      <Icon color={color} size={22} strokeWidth={focused ? 2.3 : 1.9} />
    </View>
  );
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.muted,
          tabBarStyle: {
            borderTopColor: theme.border,
            backgroundColor: theme.card,
            height: 66 + insets.bottom,
            paddingBottom: insets.bottom + 6,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            marginTop: 2,
          },
          tabBarIconStyle: {
            width: 52,
            height: 30,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={House} color={color} focused={focused} tint={theme.primaryLight} />
            ),
          }}
        />

        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={Compass} color={color} focused={focused} tint={theme.primaryLight} />
            ),
          }}
        />

           <Tabs.Screen
          name="add-action"
          options={{
            title: "",
            tabBarIcon: () => (
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  marginBottom: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  // A ring in the bar colour makes the button look cut out of the bar.
                  backgroundColor: theme.card,
                  shadowColor: theme.primary,
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                }}
              >
                <LinearGradient
                  colors={theme.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={26} color="#fff" strokeWidth={2.4} />
                </LinearGradient>
              </View>
            ),
            tabBarButton: (props) => (
              <Pressable
                onPress={() => setSheetOpen(true)}
                style={props.style}
                accessibilityRole={props.accessibilityRole}
                accessibilityState={props.accessibilityState}
              >
                {props.children}
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Community",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={Users} color={color} focused={focused} tint={theme.primaryLight} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={User} color={color} focused={focused} tint={theme.primaryLight} />
            ),
          }}
        />

        <Tabs.Screen
          name="routine"
          options={{
            href: null, // hides from tab bar, but route still works
          }}
        />
      </Tabs>

      <QuickActionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        theme={theme}
      />
    </>
  );
}
