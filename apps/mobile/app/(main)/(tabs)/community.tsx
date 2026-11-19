import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, TextInput } from "../../../components/ui/Text";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Users,
  PenSquare,
  X,
  Sparkles,
  Bookmark as BookmarkIcon,
  WifiOff,
  FileText,
  ShieldCheck,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { CategoryPill } from "../../../components/CategoryPill";
import { ImagePickerRow } from "../../../components/ImagePickerRow";
import { PostActionSheet } from "../../../components/PostActionSheet";
import { CommunityGuidelinesModal } from "../../../components/CommunityGuidelinesModal";
import { CommunityPostCard } from "../../../components/CommunityPostCard";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useAuthStore } from "../../../src/store/useAuthStore";
import {
  getPosts,
  getBookmarkedPosts,
  createPost,
  toggleLikePost,
  uploadPostImages,
  Post,
} from "../../../src/api/posts";
import {
  CONTENT_MAX,
  TITLE_MAX,
  acceptGuidelines,
  emptyFeedCopy,
  hasAcceptedGuidelines,
  validatePostDraft,
} from "../../../src/lib/communityGuidelines";

const categories = [
  "All",
  "General",
  "Products",
  "My Story",
  "Study Hub",
  "Challenges",
];

type FeedTab = "community" | "bookmarks";
type Gate = "checking" | "required" | "accepted";

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [gate, setGate] = useState<Gate>("checking");
  const [feedTab, setFeedTab] = useState<FeedTab>("community");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [actionSheetPostId, setActionSheetPostId] = useState<string | null>(
    null,
  );
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Gate: every user must accept the guidelines before seeing the feed.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      hasAcceptedGuidelines(AsyncStorage, currentUserId).then((ok) => {
        if (!cancelled) setGate(ok ? "accepted" : "required");
      });
      return () => {
        cancelled = true;
      };
    }, [currentUserId]),
  );

  const handleAcceptGuidelines = async () => {
    if (currentUserId) {
      try {
        await acceptGuidelines(AsyncStorage, currentUserId);
      } catch {
        // Storage failed: let them in this session, they'll be asked again.
      }
    }
    setGate("accepted");
    setShowGuidelines(false);
  };

  const handleDeclineGuidelines = () => {
    setShowGuidelines(false);
    if (gate !== "accepted") router.replace("/(main)/(tabs)/home");
  };

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setLoadFailed(false);
      try {
        setPosts(
          feedTab === "bookmarks"
            ? await getBookmarkedPosts()
            : await getPosts(activeCategory),
        );
      } catch {
        setPosts([]);
        setLoadFailed(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeCategory, feedTab],
  );

  useFocusEffect(
    useCallback(() => {
      if (gate === "accepted") load();
    }, [load, gate]),
  );

  const resetComposer = () => {
    setText("");
    setTitle("");
    setImageUris([]);
    setComposing(false);
  };

  const draftError = validatePostDraft({ title, content: text });

  const handlePost = async () => {
    if (draftError) return;
    setPosting(true);
    try {
      let uploadedUrls: string[] = [];
      if (imageUris.length > 0) {
        setUploadingImages(true);
        uploadedUrls = await uploadPostImages(imageUris);
        setUploadingImages(false);
      }

      await createPost({
        title: title.trim() || undefined,
        content: text.trim(),
        category: selectedCategory,
        images: uploadedUrls,
      });
      resetComposer();
      Toast.show({ type: "success", text1: "Posted to the community" });
      load();
    } catch (err: any) {
      setUploadingImages(false);
      Toast.show({ type: "error", text1: err.message || "Could not post" });
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              likes: p.likedByMe ? p.likes - 1 : p.likes + 1,
              likedByMe: !p.likedByMe,
            }
          : p,
      ),
    );
    try {
      await toggleLikePost(id);
    } catch {
      load();
    }
  };

  const handleBookmarkChange = (postId: string, bookmarked: boolean) => {
    if (feedTab === "bookmarks" && !bookmarked) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } else {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, bookmarkedByMe: bookmarked } : p,
        ),
      );
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    Toast.show({ type: "success", text1: "Post deleted" });
  };

  const actionSheetPost = posts.find((p) => p.id === actionSheetPostId);
  const empty = emptyFeedCopy(feedTab, activeCategory);

  const tabs: { key: FeedTab; label: string }[] = [
    { key: "community", label: "Feed" },
    { key: "bookmarks", label: "Saved" },
  ];

  const renderState = () => {
    if (loading) {
      return (
        <View className="items-center py-16">
          <ActivityIndicator color={theme.primary} />
        </View>
      );
    }
    if (loadFailed) {
      return (
        <View className="px-8 items-center py-16">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: theme.primaryLight }}
          >
            <WifiOff size={20} color={theme.primary} />
          </View>
          <Text
            className="text-sm font-semibold text-center mb-1"
            style={{ color: theme.foreground }}
          >
            Could not load posts
          </Text>
          <Text
            className="text-xs text-center mb-4"
            style={{ color: theme.muted }}
          >
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => load()}
            accessibilityRole="button"
            className="rounded-full px-5 py-2.5"
            style={{ backgroundColor: theme.primary }}
          >
            <Text className="text-white text-sm font-semibold">Retry</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View className="px-8 items-center py-16">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: theme.primaryLight }}
        >
          {feedTab === "bookmarks" ? (
            <BookmarkIcon size={20} color={theme.primary} />
          ) : (
            <Sparkles size={20} color={theme.primary} />
          )}
        </View>
        <Text
          className="text-sm font-semibold text-center mb-1"
          style={{ color: theme.foreground }}
        >
          {empty.title}
        </Text>
        <Text className="text-xs text-center" style={{ color: theme.muted }}>
          {empty.body}
        </Text>
      </View>
    );
  };

  if (gate !== "accepted") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingTop: insets.top,
        }}
      >
        {gate === "checking" && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={theme.primary} />
          </View>
        )}
        <CommunityGuidelinesModal
          visible={gate === "required"}
          theme={theme}
          onAccept={handleAcceptGuidelines}
          onDecline={handleDeclineGuidelines}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        paddingTop: insets.top,
      }}
    >
      <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.primaryLight }}
          >
            <Users size={19} color={theme.primary} />
          </View>
          <View className="flex-1">
            <Text
              className="text-2xl font-bold"
              style={{ color: theme.foreground }}
            >
              Community
            </Text>
            <Text className="text-xs" style={{ color: theme.muted }}>
              Share, learn and glow together
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setShowGuidelines(true)}
            accessibilityRole="button"
            accessibilityLabel="Community guidelines"
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
          >
            <ShieldCheck size={17} color={theme.muted} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(main)/my-posts")}
            accessibilityRole="button"
            accessibilityLabel="My posts"
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
          >
            <FileText size={17} color={theme.muted} />
          </Pressable>
          <Pressable
            onPress={() => setComposing(true)}
            accessibilityRole="button"
            accessibilityLabel="Create a post"
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.primary }}
          >
            <PenSquare size={17} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Segmented control */}
      <View
        className="mx-4 mb-3 p-1 rounded-full flex-row"
        style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
      >
        {tabs.map((t) => {
          const active = feedTab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setFeedTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className="flex-1 py-2 rounded-full items-center"
              style={{ backgroundColor: active ? theme.primary : "transparent" }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: active ? "#fff" : theme.muted }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {feedTab === "community" && (
        <View style={{ height: 44 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            {categories.map((cat) => (
              <CategoryPill
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onPress={() => setActiveCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {loading || loadFailed || posts.length === 0 ? (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={theme.primary}
            />
          }
        >
          {renderState()}
        </ScrollView>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => (
            <CommunityPostCard
              post={item}
              theme={theme}
              onOpen={() => router.push(`/(main)/post/${item.id}`)}
              onLongPress={() => setActionSheetPostId(item.id)}
              onLike={() => handleLike(item.id)}
            />
          )}
        />
      )}

      {actionSheetPost && (
        <PostActionSheet
          visible
          onClose={() => setActionSheetPostId(null)}
          postId={actionSheetPost.id}
          postContent={actionSheetPost.content}
          isBookmarked={actionSheetPost.bookmarkedByMe}
          isOwnPost={
            Boolean(currentUserId) && actionSheetPost.userId === currentUserId
          }
          theme={theme}
          onBookmarkChange={(bookmarked) =>
            handleBookmarkChange(actionSheetPost.id, bookmarked)
          }
          onDeleted={() => handlePostDeleted(actionSheetPost.id)}
        />
      )}

      {/* Re-readable from the shield button; accepting again is harmless. */}
      <CommunityGuidelinesModal
        visible={showGuidelines}
        theme={theme}
        onAccept={handleAcceptGuidelines}
        onDecline={handleDeclineGuidelines}
      />

      {composing && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setComposing(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1 justify-end"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <View
              className="rounded-t-3xl p-5"
              style={{
                backgroundColor: theme.background,
                paddingBottom: insets.bottom + 16,
                maxHeight: "90%",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.border,
                  alignSelf: "center",
                  marginBottom: 14,
                }}
              />
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.foreground }}
                >
                  New post
                </Text>
                <Pressable
                  onPress={() => setComposing(false)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  className="w-7 h-7 rounded-full items-center justify-center"
                  style={{ backgroundColor: theme.card }}
                >
                  <X size={16} color={theme.muted} />
                </Pressable>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled">
                <Text
                  className="text-xs font-semibold uppercase mb-2"
                  style={{ color: theme.muted, letterSpacing: 0.5 }}
                >
                  Category
                </Text>
                <View style={{ height: 44 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, alignItems: "flex-start" }}
                  >
                    {categories
                      .filter((c) => c !== "All")
                      .map((cat) => (
                        <CategoryPill
                          key={cat}
                          label={cat}
                          active={selectedCategory === cat}
                          onPress={() => setSelectedCategory(cat)}
                        />
                      ))}
                  </ScrollView>
                </View>
                <TextInput
                  className="rounded-xl px-3.5 py-3 text-sm mt-3"
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    color: theme.foreground,
                  }}
                  placeholder="Title (optional)"
                  placeholderTextColor={theme.muted}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={TITLE_MAX}
                />
                <TextInput
                  className="rounded-xl px-3.5 py-3 text-sm mt-3"
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    color: theme.foreground,
                    minHeight: 110,
                    textAlignVertical: "top",
                  }}
                  placeholder="Share something with the community..."
                  placeholderTextColor={theme.muted}
                  value={text}
                  onChangeText={setText}
                  maxLength={CONTENT_MAX}
                  multiline
                />
                <Text
                  className="text-xs text-right mt-1"
                  style={{ color: theme.muted }}
                >
                  {text.length}/{CONTENT_MAX}
                </Text>

                <ImagePickerRow
                  uris={imageUris}
                  onChange={setImageUris}
                  theme={theme}
                />

                <Text
                  className="text-xs text-center mt-4"
                  style={{ color: theme.muted }}
                >
                  Be kind and keep it helpful. Posts follow our community
                  guidelines.
                </Text>

                <Pressable
                  onPress={handlePost}
                  disabled={posting || !!draftError}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: posting || !!draftError }}
                  className="rounded-xl py-3 items-center mt-3"
                  style={{
                    backgroundColor:
                      posting || draftError
                        ? theme.primaryLight
                        : theme.primary,
                  }}
                >
                  <Text className="text-white text-sm font-semibold">
                    {uploadingImages
                      ? "Uploading photos..."
                      : posting
                        ? "Posting..."
                        : "Post"}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}
