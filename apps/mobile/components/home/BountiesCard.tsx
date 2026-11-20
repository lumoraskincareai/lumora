import React from "react";
import { View } from "react-native";
import { Text } from "../ui/Text";
import { Award, CheckCircle2 } from "lucide-react-native";
import { Card } from "../ui/Card";
import type { Palette } from "../../src/theme/palettes";
import type { Bounty } from "../../src/api/bounties";
import { iconColors } from "../../src/theme/iconColors";

export function BountiesCard({ theme, bounties, points }: { theme: Palette; bounties: Bounty[]; points: number }) {
  if (bounties.length === 0) return null;
  return (
    <Card className="p-4" style={{ backgroundColor: theme.card, borderColor: theme.border, borderRadius: 24 }}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: `${iconColors.amber}22` }}
          >
            <Award size={15} color={iconColors.amber} />
          </View>
          <Text className="text-sm font-semibold" style={{ color: theme.foreground }}>Bounties</Text>
        </View>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${iconColors.amber}22` }}>
          <Text className="text-xs font-semibold" style={{ color: iconColors.amber }}>{points} pts</Text>
        </View>
      </View>

      <View className="gap-2.5">
        {bounties.map((bounty) => (
          <View
            key={bounty.id}
            className="flex-row items-start gap-2.5 rounded-xl p-3"
            style={{
              backgroundColor: bounty.completed ? `${iconColors.green}18` : theme.background,
              borderWidth: 1,
              borderColor: bounty.completed ? iconColors.green : theme.border,
            }}
          >
            <CheckCircle2
              size={18}
              color={bounty.completed ? iconColors.green : theme.muted}
              fill={bounty.completed ? iconColors.green : "transparent"}
            />
            <View className="flex-1">
              <Text
                className="text-sm font-medium"
                style={{
                  color: theme.foreground,
                  textDecorationLine: bounty.completed ? "line-through" : "none",
                }}
              >
                {bounty.title}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: theme.muted }}>{bounty.description}</Text>
            </View>
            <Text className="text-xs font-semibold" style={{ color: iconColors.amber }}>+{bounty.rewardPoints}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
