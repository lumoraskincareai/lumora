import React, { useState, useCallback } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrentLocation } from "../../../src/lib/location";
import { getCurrentWeather, WeatherData } from "../../../src/api/weather";
import { ForYouSuggestions } from "../../../components/ForYouSuggestions";
import { HomeTop } from "../../../components/home/HomeTop";
import { ScanHero } from "../../../components/home/ScanHero";
import { ActionTiles } from "../../../components/home/ActionTiles";
import { MoodCheckIn } from "../../../components/home/MoodCheckIn";
import { RoutineBanner } from "../../../components/home/RoutineBanner";
import { TrendingCommunity } from "../../../components/home/TrendingCommunity";
import { BriefSection } from "../../../components/home/BriefSection";
import { BountiesCard } from "../../../components/home/BountiesCard";
import { useAuthStore } from "../../../src/store/useAuthStore";
import { useTheme } from "../../../src/theme/ThemeContext";
import {
  getLatestRecommendation,
  generateRecommendation,
  submitRecommendationFeedback,
  RecommendationResponse,
  ProfileSuggestionsResponse,
  getProfileSuggestions,
} from "../../../src/api/recommendations";
import {
  submitCheckIn,
  updateCheckIn,
  getStreak,
  getTodayCheckIn,
  CheckIn,
} from "../../../src/api/checkins";
import { uploadImages } from "../../../src/api/uploads";
import { getMyProfile } from "../../../src/api/users";
import { getPosts, Post } from "../../../src/api/posts";
import {
  getLocalCheckInPhotos,
  saveLocalCheckInPhotos,
  supportsLocalCheckInPhotos,
} from "../../../src/lib/localCheckInPhotos";
import { getBounties, Bounty } from "../../../src/api/bounties";
import { getMyRoutines, Routine } from "../../../src/api/routines";
import { trendingPosts } from "../../../src/lib/homeCopy";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const isPremium = Boolean(user?.isPremium);
  const useCloudPhotos = isPremium || !supportsLocalCheckInPhotos;

  const [recommendation, setRecommendation] =
    useState<RecommendationResponse | null>(null);
  const [forYou, setForYou] = useState<ProfileSuggestionsResponse | null>(null);
  const [loadingRec, setLoadingRec] = useState(true);
  const [recError, setRecError] = useState<string | null>(null);
  // The API's wording when the person hasn't done onboarding yet.
  const needsAssessment = Boolean(recError?.includes("skin assessment"));
  const [feedbackGiven, setFeedbackGiven] = useState<
    "helpful" | "not_helpful" | null
  >(null);

  const [streak, setStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [savedImages, setSavedImages] = useState<string[]>([]);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [bountyPoints, setBountyPoints] = useState(0);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { theme } = useTheme();

  // Each section loads independently so a slow one (location + live
  // conditions for the brief) never holds up the others.
  const loadAll = useCallback(async () => {
    setLoadingRec(true);
    setRecError(null);

    // Shared by the weather chip and the brief so location is asked once.
    const locationPromise = getCurrentLocation().catch(() => null);

    const loadWeather = async () => {
      const loc = await locationPromise;
      if (loc) setWeather(await getCurrentWeather(loc.lat, loc.lon));
    };

    const loadBrief = async () => {
      try {
        let rec: RecommendationResponse;
        try {
          rec = await getLatestRecommendation();
        } catch {
          // Only a new brief needs coordinates — today's saved one doesn't.
          rec = await generateRecommendation((await locationPromise) || undefined);
        }
        setRecommendation(rec);
      } catch (err: any) {
        setRecommendation(null);
        setRecError(err.message || "Could not load your brief");
      } finally {
        setLoadingRec(false);
      }
    };

    // Built from the onboarding answers only; hidden if it fails.
    const loadForYou = async () => {
      try {
        setForYou(await getProfileSuggestions());
      } catch {
        setForYou(null);
      }
    };

    const loadCheckIn = async () => {
      const [streakData, todayCheckInData, profile] = await Promise.all([
        getStreak(),
        getTodayCheckIn(),
        getMyProfile().catch(() => null),
      ]);
      setStreak(streakData.streak);
      setCheckedInToday(Boolean(todayCheckInData));
      setTodayCheckIn(todayCheckInData);
      if (profile) updateUser({ isPremium: profile.isPremium });

      // Default to "not premium" when the profile fetch fails, so we never
      // risk showing/uploading photos that should have stayed on-device.
      const premium = Boolean(profile?.isPremium);
      const useCloud = premium || !supportsLocalCheckInPhotos;

      let images: string[] = [];
      if (todayCheckInData) {
        images = useCloud
          ? todayCheckInData.images
          : await getLocalCheckInPhotos(todayCheckInData.id);
      }
      setImageUris(images);
      setSavedImages(images);
    };

    const loadBounties = async () => {
      const bountiesData = await getBounties();
      setBounties(bountiesData.bounties);
      setBountyPoints(bountiesData.totalPoints);
    };

    const loadRoutines = async () => {
      setRoutines(await getMyRoutines());
    };

    const loadPosts = async () => {
      setPosts(trendingPosts(await getPosts()));
    };

    // Everything but the brief is nice-to-have and fails silently.
    await Promise.allSettled([
      loadWeather(),
      loadBrief(),
      loadForYou(),
      loadCheckIn(),
      loadBounties(),
      loadRoutines(),
      loadPosts(),
    ]);
  }, [updateUser]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      setFeedbackGiven(null);
    }, [loadAll]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!recommendation) return;
    try {
      await submitRecommendationFeedback(recommendation.id, helpful);
      setFeedbackGiven(helpful ? "helpful" : "not_helpful");
    } catch {
      Toast.show({ type: "error", text1: "Could not save feedback" });
    }
  };

  const handleCheckIn = async () => {
    if (!mood) return;
    setSubmittingCheckIn(true);
    try {
      // Free tier: photos never leave the device, so nothing is uploaded
      // and the check-in is created with no images at all.
      const images =
        useCloudPhotos && imageUris.length > 0
          ? await uploadImages(imageUris)
          : [];
      const checkIn = await submitCheckIn(mood, note.trim() || undefined, images);

      const displayImages =
        !useCloudPhotos && imageUris.length > 0
          ? await saveLocalCheckInPhotos(checkIn.id, imageUris)
          : images;

      const streakData = await getStreak();
      setStreak(streakData.streak);
      setCheckedInToday(true);
      setTodayCheckIn(checkIn);
      setImageUris(displayImages);
      setSavedImages(displayImages);
      Toast.show({
        type: "success",
        text1: displayImages.length ? "Check-in and photos saved!" : "Checked in! 🔥",
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: err.message || "Could not save check-in",
      });
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleSavePhotos = async () => {
    if (!todayCheckIn) return;
    setSavingPhotos(true);
    try {
      if (useCloudPhotos) {
        const newLocalUris = imageUris.filter((uri) => !/^https?:\/\//.test(uri));
        const uploadedUrls =
          newLocalUris.length > 0 ? await uploadImages(newLocalUris) : [];
        let uploadedIndex = 0;
        const finalImages = imageUris.map((uri) =>
          /^https?:\/\//.test(uri) ? uri : uploadedUrls[uploadedIndex++],
        );
        const updated = await updateCheckIn(todayCheckIn.id, {
          images: finalImages,
        });
        setTodayCheckIn(updated);
        setImageUris(updated.images);
        setSavedImages(updated.images);
      } else {
        const finalImages = await saveLocalCheckInPhotos(todayCheckIn.id, imageUris);
        setImageUris(finalImages);
        setSavedImages(finalImages);
      }
      Toast.show({ type: "success", text1: "Photos updated!" });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: err.message || "Could not save photos",
      });
    } finally {
      setSavingPhotos(false);
    }
  };

  const photoHelp = useCloudPhotos
    ? "Add up to 6 progress photos, backed up to your account."
    : "Add up to 6 progress photos, kept only on this device. Go Premium to back them up.";

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Soft colour wash behind the top of the screen. */}
      <LinearGradient
        colors={[theme.primaryLight, theme.background]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420 }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 40,
          gap: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <HomeTop
          theme={theme}
          name={user?.name}
          streak={streak}
          weather={weather}
          onSearch={() => router.push("/(main)/(tabs)/explore")}
          onStreak={() => router.push("/(main)/my-stats")}
        />

        <ScanHero
          theme={theme}
          onPress={() => router.push("/(main)/face-scan")}
        />

        <ActionTiles
          theme={theme}
          onRoutine={() => router.push("/(main)/(tabs)/routine")}
          onProductMatch={() => router.push("/(main)/scan-product")}
          onReview={() => router.push("/(main)/share-review")}
          onCommunity={() => router.push("/(main)/(tabs)/community")}
        />

        <MoodCheckIn
          theme={theme}
          checkedIn={checkedInToday}
          streak={streak}
          todayMood={todayCheckIn?.mood ?? null}
          mood={mood}
          onMood={setMood}
          note={note}
          onNote={setNote}
          imageUris={imageUris}
          onImages={setImageUris}
          savedImages={savedImages}
          photoHelp={photoHelp}
          submitting={submittingCheckIn}
          savingPhotos={savingPhotos}
          onSubmit={handleCheckIn}
          onSavePhotos={handleSavePhotos}
        />

        <BriefSection
          theme={theme}
          recommendation={recommendation}
          loading={loadingRec}
          error={recError}
          needsAssessment={needsAssessment}
          feedbackGiven={feedbackGiven}
          onFeedback={handleFeedback}
          onRetry={loadAll}
          onStartAssessment={() => router.push("/(onboarding)/skin-type")}
        />

        <RoutineBanner
          theme={theme}
          routines={routines}
          onOpen={() => router.push("/(main)/(tabs)/routine")}
          onCreate={() => router.push("/(main)/routine-builder")}
        />

        <TrendingCommunity
          theme={theme}
          posts={posts}
          onOpen={(id) => router.push(`/(main)/post/${id}`)}
          onSeeAll={() => router.push("/(main)/(tabs)/community")}
        />

        {forYou && forYou.areas.length > 0 ? <ForYouSuggestions data={forYou} /> : null}

        <BountiesCard theme={theme} bounties={bounties} points={bountyPoints} />
      </ScrollView>
    </View>
  );
}
