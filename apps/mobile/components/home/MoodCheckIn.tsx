import React from "react";
import { View, Pressable } from "react-native";
import { Text, TextInput } from "../ui/Text";
import { Annoyed, Frown, Laugh, Meh, Smile, CheckCircle2 } from "lucide-react-native";
import { Card } from "../ui/Card";
import { ImagePickerRow } from "../ImagePickerRow";
import { moods, getMood } from "../MoodPicker";
import type { Palette } from "../../src/theme/palettes";

type FaceIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// One face per mood in components/MoodPicker.tsx, same values and colours.
const faces: Record<number, FaceIcon> = {
  1: Frown,
  2: Annoyed,
  3: Meh,
  4: Smile,
  5: Laugh,
};

function Faces({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View className="flex-row justify-between mt-3">
      {moods.map((m) => {
        const Icon = faces[m.value] ?? Meh;
        const selected = value === m.value;
        return (
          <Pressable
            key={m.value}
            onPress={() => onChange(m.value)}
            accessibilityRole="button"
            accessibilityLabel={`${m.label}${selected ? ", selected" : ""}`}
            accessibilityState={{ selected }}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 48,
                height: 48,
                backgroundColor: `${m.color}${selected ? "40" : "22"}`,
                borderWidth: selected ? 2.5 : 1,
                borderColor: selected ? m.color : `${m.color}44`,
                transform: [{ scale: selected ? 1.1 : 1 }],
              }}
            >
              <Icon size={26} color={m.color} strokeWidth={2} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MoodCheckIn({
  theme,
  checkedIn,
  streak,
  todayMood,
  mood,
  onMood,
  note,
  onNote,
  imageUris,
  onImages,
  savedImages,
  photoHelp,
  submitting,
  savingPhotos,
  onSubmit,
  onSavePhotos,
}: {
  theme: Palette;
  checkedIn: boolean;
  streak: number;
  todayMood: number | null;
  mood: number | null;
  onMood: (v: number) => void;
  note: string;
  onNote: (v: string) => void;
  imageUris: string[];
  onImages: (uris: string[]) => void;
  savedImages: string[];
  photoHelp: string;
  submitting: boolean;
  savingPhotos: boolean;
  onSubmit: () => void;
  onSavePhotos: () => void;
}) {
  if (checkedIn) {
    const m = todayMood ? getMood(todayMood) : null;
    const Icon = m ? (faces[m.value] ?? Meh) : CheckCircle2;
    const photosChanged = JSON.stringify(imageUris) !== JSON.stringify(savedImages);
    return (
      <Card className="p-4" style={{ backgroundColor: theme.card, borderColor: theme.border, borderRadius: 24 }}>
        <View className="flex-row items-center gap-3">
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 48, height: 48, backgroundColor: `${m?.color ?? theme.primary}26` }}
          >
            <Icon size={26} color={m?.color ?? theme.primary} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: "800" }}>
              {m ? `Feeling ${m.label.toLowerCase()} today` : "Checked in today"}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12.5, marginTop: 2 }}>
              {streak} day streak. See you tomorrow!
            </Text>
          </View>
        </View>

        <ImagePickerRow
          uris={imageUris}
          onChange={onImages}
          theme={theme}
          label="Skin photos"
          helperText={photoHelp}
        />

        {photosChanged ? (
          <Pressable
            onPress={onSavePhotos}
            disabled={savingPhotos}
            accessibilityRole="button"
            className="rounded-full items-center justify-center mt-3"
            style={{ height: 44, backgroundColor: savingPhotos ? theme.primaryLight : theme.primary }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
              {savingPhotos ? "Saving..." : "Save photos"}
            </Text>
          </Pressable>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="p-4" style={{ backgroundColor: theme.card, borderColor: theme.border, borderRadius: 24 }}>
      <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: "800" }}>How&apos;s your mood today?</Text>
      <Text style={{ color: theme.muted, fontSize: 12.5, marginTop: 2 }}>
        Track your mood and see its effect on your skin.
      </Text>

      <Faces value={mood} onChange={onMood} />

      {mood !== null ? (
        <>
          <TextInput
            className="rounded-2xl px-3.5 py-3 text-sm mt-4"
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.background,
              color: theme.foreground,
            }}
            placeholder="Anything you want to note? (optional)"
            placeholderTextColor={theme.muted}
            value={note}
            onChangeText={onNote}
          />
          <ImagePickerRow
            uris={imageUris}
            onChange={onImages}
            theme={theme}
            label="Skin photos"
            helperText={photoHelp}
          />
          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            accessibilityRole="button"
            className="rounded-full items-center justify-center mt-3"
            style={{ height: 46, backgroundColor: submitting ? theme.primaryLight : theme.primary }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
              {submitting ? (imageUris.length ? "Uploading photos..." : "Saving...") : "Check in"}
            </Text>
          </Pressable>
        </>
      ) : null}
    </Card>
  );
}
