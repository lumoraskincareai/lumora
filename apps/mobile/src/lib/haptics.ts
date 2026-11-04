import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Haptics are a nicety: never let a device without a motor (or the web) throw.
const supported = Platform.OS === "ios" || Platform.OS === "android";

export function tapHaptic() {
  if (!supported) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function selectionHaptic() {
  if (!supported) return;
  Haptics.selectionAsync().catch(() => {});
}

export function successHaptic() {
  if (!supported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
