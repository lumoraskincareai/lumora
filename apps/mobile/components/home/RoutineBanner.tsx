import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "../ui/Text";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Sparkles } from "lucide-react-native";
import { RoutineArt } from "./art/RoutineArt";
import type { Palette } from "../../src/theme/palettes";
import type { Routine } from "../../src/api/routines";
import { iconColors } from "../../src/theme/iconColors";
import { pickRoutine, routineProgress } from "../../src/lib/homeCopy";

export function RoutineBanner({
  theme,
  routines,
  onOpen,
  onCreate,
}: {
  theme: Palette;
  routines: Routine[];
  onOpen: () => void;
  onCreate: () => void;
}) {
  const routine = pickRoutine(routines);
  const green = iconColors.green;
  const progress = routine ? routineProgress(routine) : null;
  const allDone = progress ? progress.total > 0 && progress.done === progress.total : false;

  return (
    <Pressable
      onPress={routine ? onOpen : onCreate}
      accessibilityRole="button"
      accessibilityLabel={routine ? `Open ${routine.name}` : "Build your routine"}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={[`${green}2E`, theme.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: `${green}33`,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          }}
        >
          <View className="flex-row items-center">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-1">
                <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }}>
                  TODAY&apos;S ROUTINE
                </Text>
                <Sparkles size={12} color={iconColors.amber} />
              </View>

              <Text style={{ color: theme.foreground, fontSize: 21, fontWeight: "800", marginTop: 4 }} numberOfLines={2}>
                {routine ? routine.name : "Build your skin routine"}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 13, marginTop: 3 }}>
                {routine && progress
                  ? allDone
                    ? "All steps done today. Nice work!"
                    : `${progress.done} of ${progress.total} steps done today`
                  : "Pick the products you use, we'll track your steps."}
              </Text>

              <View
                className="flex-row items-center self-start gap-2 rounded-full px-4 mt-4"
                style={{ height: 40, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
              >
                <Text style={{ color: theme.foreground, fontWeight: "700", fontSize: 13.5 }}>
                  {routine ? "View Routine" : "Create Routine"}
                </Text>
                <ArrowRight size={15} color={theme.foreground} />
              </View>
            </View>

            <RoutineArt green={green} />
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );
}
