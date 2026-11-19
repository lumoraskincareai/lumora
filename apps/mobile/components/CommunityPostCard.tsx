import React from "react";
import { View, Pressable } from "react-native";
import { Heart, MessageCircle, Bookmark as BookmarkIcon } from "lucide-react-native";
import { Text } from "./ui/Text";
import { Card } from "./ui/Card";
import { Avatar } from "./Avatar";
import { PostImageGallery } from "./PhotoImageGallary";
import { timeAgo } from "../src/lib/communityGuidelines";
import type { Post } from "../src/api/posts";

function StatPill({
  icon,
  count,
  active,
  onPress,
  label,
  theme,
}: {
  icon: React.ReactNode;
  count: number;
  active?: boolean;
  onPress: () => void;
  label: string;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
    >
      <View
        className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
        style={{
          backgroundColor: active ? theme.primaryLight : theme.background,
          borderWidth: 1,
          borderColor: active ? theme.primaryLight : theme.border,
        }}
      >
        {icon}
        <Text
          className="text-xs font-semibold"
          style={{ color: active ? theme.primary : theme.muted }}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

type Props = {
  post: Post;
  theme: any;
  onOpen: () => void;
  onLongPress: () => void;
  onLike: () => void;
};

export function CommunityPostCard({
  post,
  theme,
  onOpen,
  onLongPress,
  onLike,
}: Props) {
  return (
    <Card
      className="p-4 mb-3"
      style={{ backgroundColor: theme.card, borderColor: theme.border }}
    >
      <Pressable
        onPress={onOpen}
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`Open post by ${post.authorName}`}
      >
        <View className="flex-row items-center gap-2.5 mb-3">
          <Avatar name={post.authorName} size={38} />
          <View className="flex-1">
            <Text
              className="text-sm font-semibold"
              style={{ color: theme.foreground }}
              numberOfLines={1}
            >
              {post.authorName}
            </Text>
            <Text className="text-xs" style={{ color: theme.muted }}>
              {timeAgo(post.createdAt)}
              {timeAgo(post.createdAt) === "now" ? "" : " ago"}
            </Text>
          </View>
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: theme.primaryLight }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: theme.primary }}
            >
              {post.category}
            </Text>
          </View>
        </View>

        {!!post.title && (
          <Text
            className="text-base font-bold mb-1.5"
            style={{ color: theme.foreground }}
          >
            {post.title}
          </Text>
        )}
        <Text
          className="text-sm leading-5 mb-3"
          numberOfLines={4}
          style={{ color: theme.foreground, opacity: 0.85 }}
        >
          {post.content}
        </Text>

        {post.images && post.images.length > 0 && (
          <PostImageGallery images={post.images} variant="feed" />
        )}
      </Pressable>

      <View
        className="flex-row items-center gap-2 pt-3"
        style={{ borderTopWidth: 1, borderTopColor: theme.border }}
      >
        <StatPill
          theme={theme}
          active={post.likedByMe}
          count={post.likes}
          label={post.likedByMe ? "Unlike post" : "Like post"}
          onPress={onLike}
          icon={
            <Heart
              size={14}
              color={post.likedByMe ? theme.primary : theme.muted}
              fill={post.likedByMe ? theme.primary : "transparent"}
            />
          }
        />
        <StatPill
          theme={theme}
          count={post.commentCount}
          label="View comments"
          onPress={onOpen}
          icon={<MessageCircle size={14} color={theme.muted} />}
        />
        {post.bookmarkedByMe && (
          <BookmarkIcon
            size={15}
            color={theme.primary}
            fill={theme.primary}
            style={{ marginLeft: "auto" }}
          />
        )}
      </View>
    </Card>
  );
}
