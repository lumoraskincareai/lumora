import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Text } from "../ui/Text";
import { ArrowRight, Flame, Heart, MessageCircle, MessagesSquare } from "lucide-react-native";
import { Avatar } from "../Avatar";
import type { Palette } from "../../src/theme/palettes";
import type { Post } from "../../src/api/posts";
import { iconColors } from "../../src/theme/iconColors";

export function TrendingCommunity({
  theme,
  posts,
  onOpen,
  onSeeAll,
}: {
  theme: Palette;
  posts: Post[];
  onOpen: (id: string) => void;
  onSeeAll: () => void;
}) {
  if (posts.length === 0) return null;

  return (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Flame size={20} color={iconColors.morning} fill={iconColors.morning} />
          <Text style={{ color: theme.foreground, fontSize: 19, fontWeight: "800" }}>Trending in Community</Text>
        </View>
        <Pressable onPress={onSeeAll} accessibilityRole="button" className="flex-row items-center gap-1">
          <Text style={{ color: theme.muted, fontSize: 13, fontWeight: "600" }}>See All</Text>
          <ArrowRight size={14} color={theme.muted} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Bleed to the screen edge so the next card peeks in, which says "swipe".
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {posts.map((post) => {
          const cover = post.images[0];
          return (
            <Pressable
              key={post.id}
              onPress={() => onOpen(post.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open post: ${post.title ?? post.content.slice(0, 40)}`}
            >
              {({ pressed }) => (
                <View
                  className="flex-row items-center gap-3 rounded-3xl p-3"
                  style={{
                    width: 296,
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  }}
                >
                  {cover ? (
                    <Image
                      source={{ uri: cover }}
                      contentFit="cover"
                      transition={150}
                      style={{ width: 84, height: 84, borderRadius: 18, backgroundColor: theme.primaryLight }}
                    />
                  ) : (
                    <View
                      className="items-center justify-center"
                      style={{ width: 84, height: 84, borderRadius: 18, backgroundColor: theme.primaryLight }}
                    >
                      <MessagesSquare size={30} color={theme.primary} />
                    </View>
                  )}

                  <View className="flex-1" style={{ minHeight: 84, justifyContent: "space-between" }}>
                    <Text numberOfLines={2} style={{ color: theme.foreground, fontSize: 14, fontWeight: "800", lineHeight: 19 }}>
                      {post.title?.trim() || post.content}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <Avatar name={post.authorName} size={18} />
                      <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11.5, flex: 1 }}>
                        {post.authorName}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-4">
                      <View className="flex-row items-center gap-1">
                        <Heart size={14} color={post.likedByMe ? iconColors.pink : theme.muted} fill={post.likedByMe ? iconColors.pink : "transparent"} />
                        <Text style={{ color: theme.muted, fontSize: 12 }}>{post.likes}</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <MessageCircle size={14} color={theme.muted} />
                        <Text style={{ color: theme.muted, fontSize: 12 }}>{post.commentCount}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
