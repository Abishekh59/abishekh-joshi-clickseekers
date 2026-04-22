import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useFocusEffect, useRouter } from "expo-router";
import { BadgeDisplay } from "../../components/BadgeDisplay";
import ClientBottomNav from "../../components/ClientBottomNav";
import LogoLoader from "../../components/LogoLoader";
import { NEPAL_CITIES } from "../../constants/nepalCities";
import {
  CATEGORY_TO_API,
  PHOTOGRAPHER_TYPES,
} from "../../constants/photographerTypes";
import { API_HOST, apiService } from "../../services/api";
import { socketService } from "../../services/socket";
import { storage } from "../../utils/storage";

interface ExplorePhotographersProps {
  onSelectPhotographer?: (photographer: any) => void;
  onBack?: () => void;
  onNavigate?: (screen: string, data?: any) => void;
}

const toAbsoluteImageUrl = (
  urlOrObj?: string | any | null,
  image_id?: number,
  timestamp?: number,
) => {
  if (!urlOrObj && !image_id) return null;
  const cacheBust = timestamp ? `?t=${timestamp}` : "";

  let url = "";
  if (typeof urlOrObj === "string") {
    url = urlOrObj;
  } else if (urlOrObj && typeof urlOrObj === "object") {
    url =
      urlOrObj.image_url ||
      urlOrObj.url ||
      urlOrObj.uri ||
      urlOrObj.profile_image ||
      urlOrObj.avatar ||
      "";
  }

  if (url && url.trim() !== "") {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url.includes("?")
        ? `${url}&t=${timestamp || Date.now()}`
        : `${url}${cacheBust}`;
    }
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${API_HOST}${path}${cacheBust}`;
  }

  if (image_id) {
    return `${API_HOST}/api/photographer/portfolio/image/${image_id}${cacheBust}`;
  }
  return null;
};

const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const AspectRatioMasonryCard = ({
  item,
  isLeft,
  favorites,
  bookmarkedPosts,
  toggleFavorite,
  toggleBookmark,
  router,
}: any) => {
  const [aspectRatio, setAspectRatio] = useState(1);
  const featuredImage = item.recent_portfolio_images?.[0];
  const categoryName =
    featuredImage?.portfolio?.category?.category_name || "Photographer";
  const liked = favorites.includes(item.user_id);
  const saved = bookmarkedPosts.includes(item.user_id);
  const profileImage = toAbsoluteImageUrl(item.profile_image);
  const imageUrl = featuredImage
    ? toAbsoluteImageUrl(featuredImage, featuredImage.image_id)
    : null;

  const gray900 = useThemeColor({}, "gray900");
  const gray600 = useThemeColor({}, "gray600");
  const gray500 = useThemeColor({}, "gray500");
  const gray400 = useThemeColor({}, "gray400");
  const primary = useThemeColor({}, "primary");

  useEffect(() => {
    if (imageUrl) {
      Image.getSize(
        imageUrl,
        (width, height) => {
          if (width && height) setAspectRatio(width / height);
        },
        () => {},
      );
    }
  }, [imageUrl]);

  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const COLUMN_WIDTH = (SCREEN_WIDTH - 36) / 2;
  const cardHeight = COLUMN_WIDTH / aspectRatio;

  // Visual variety "here and there"
  const isSpecial = useMemo(() => Math.random() > 0.8, []);
  const specialStyle = isSpecial
    ? {
        borderColor: "#4f46e5",
        borderWidth: 2,
        shadowColor: "#4f46e5",
        shadowOpacity: 0.2,
      }
    : {};

  return (
    <View
      style={[
        styles.masonryCard,
        isLeft ? { marginRight: 6 } : { marginLeft: 6 },
        specialStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: "/Client/PhotographerProfile",
            params: { id: item.user_id },
          })
        }
      >
        <View style={styles.masonryImageContainer}>
          {featuredImage ? (
            <Image
              source={{ uri: imageUrl || undefined }}
              style={[
                styles.masonryImage,
                { height: Math.min(Math.max(cardHeight, 150), 450) },
              ]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.masonryImagePlaceholder, { height: 180 }]}>
              <Ionicons name="camera-outline" size={32} color="#9ca3af" />
            </View>
          )}
          <TouchableOpacity
            style={styles.floatingHeart}
            onPress={() => toggleFavorite(item.user_id)}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={16}
              color={liked ? "#ef4444" : "#1f2937"}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <View style={styles.masonryInfo}>
        <View style={[styles.masonryProfileRow, { marginBottom: 4 }]}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.masonryAvatar}
            />
          ) : (
            <View
              style={[
                styles.masonryAvatarPlaceholder,
                { backgroundColor: "#e5e7eb" },
              ]}
            >
              <ThemedText type="xs" weight="bold" style={{ color: gray600 }}>
                {item.full_name?.charAt(0) || "P"}
              </ThemedText>
            </View>
          )}
          <ThemedText
            type="sm"
            weight="extrabold"
            style={{ color: gray900, flexShrink: 1 }}
            numberOfLines={1}
          >
            {item.full_name}
          </ThemedText>
          {item.kyc_verified && (
            <Ionicons
              name="checkmark-circle"
              size={14}
              color="#3b82f6"
              style={{ marginLeft: 2 }}
            />
          )}
        </View>

        <ThemedText
          type="xs"
          weight="bold"
          style={{ color: gray500, marginBottom: 10 }}
        >
          {item.specialization ||
            `${categoryName.replace(/_/g, " ")} Photographer`}
        </ThemedText>

        {/* Rank and Badge */}
        {/* Badge and Points */}
        <View style={{ marginBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <BadgeDisplay badgeName={item.badge || "Rookie"} size="small" />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="trophy"
                size={12}
                color="#f59e0b"
                style={{ marginRight: 2 }}
              />
              <ThemedText type="xs" weight="bold" style={{ color: gray600 }}>
                #{item.rank || 1}
              </ThemedText>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="star"
              size={12}
              color="#f59e0b"
              style={{ marginRight: 4 }}
            />
            <ThemedText type="xs" weight="bold" style={{ color: gray600 }}>
              {item.points?.toLocaleString() || 0} points
            </ThemedText>
          </View>
        </View>

        {/* Location */}
        <View style={styles.masonryLocationRow}>
          <Ionicons name="location-outline" size={14} color={gray500} />
          <ThemedText
            type="xs"
            style={{ color: gray500, flexShrink: 1 }}
            numberOfLines={1}
          >
            {item.location || "Kathmandu, Nepal"}
          </ThemedText>
        </View>

        <TouchableOpacity
          testID="view-profile-button"
          style={[styles.masonryViewBtn, { backgroundColor: "#0f172a" }]}
          onPress={() =>
            router.push({
              pathname: "/Client/PhotographerProfile",
              params: { id: item.user_id },
            })
          }
        >
          <ThemedText type="xs" weight="extrabold" style={{ color: "#fff" }}>
            View Profile
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ExplorePhotographers({
  onSelectPhotographer,
  onBack,
  onNavigate,
}: ExplorePhotographersProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<number[]>([]);
  const [photographers, setPhotographers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const gray900 = useThemeColor({}, "gray900");
  const gray700 = useThemeColor({}, "gray700");
  const gray600 = useThemeColor({}, "gray600");
  const gray500 = useThemeColor({}, "gray500");
  const gray400 = useThemeColor({}, "gray400");
  const primary = useThemeColor({}, "primary");
  const background = useThemeColor({}, "background");
  const errorColor = useThemeColor({}, "error");

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await storage.clearAuth();
            router.replace("/");
          } catch (e) {
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  const fetchPhotographers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getAllPhotographers();
      console.log("Fetched photographers count:", res.data?.length || 0);
      // Log specialization of first few to verify
      if (res.data && res.data.length > 0) {
        console.log(
          "First photographer specialization:",
          res.data[0].specialization,
        );
      }
      setPhotographers(shuffleArray(res.data || []));
    } catch (e: any) {
      setError("Connection error. Please check your network.");
      console.error(e);
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFavorites = async () => {
    try {
      // Load from local storage first
      const localFavorites = await storage.getFavorites();
      setFavorites(localFavorites);

      // Try to sync with backend if available
      const token = await storage.getToken();
      if (token) {
        try {
          const res = await apiService.getFavoritePhotographerIds(token);
          if (res.success && res.data?.favoriteIds) {
            // Update with backend data if available
            setFavorites(res.data.favoriteIds);
            await storage.saveFavorites(res.data.favoriteIds);
          }
        } catch (e: any) {
          // Backend not ready, use local storage (already loaded above)
          if (!e.message?.includes("not yet available")) {
            console.warn("Failed to sync favorites with backend:", e.message);
          }
        }
      }
    } catch (e: any) {
      console.error("Failed to load favorites:", e);
    }
  };

  const loadSavedPosts = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      const res = await apiService.getUserSaves(token);
      if (res.success && res.data?.savedImageIds) {
        setBookmarkedPosts(res.data.savedImageIds);
      }
    } catch (e: any) {
      console.error("Failed to load saved posts:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPhotographers();
      loadFavorites();
      loadSavedPosts();
    }, []),
  );

  useEffect(() => {
    // Listen for real-time updates
    const handleUpdate = () => {
      console.log("Photographer update received, refetching...");
      fetchPhotographers();
    };

    socketService.on("photographer_updated", handleUpdate);

    return () => {
      socketService.off("photographer_updated", handleUpdate);
    };
  }, [fetchPhotographers]);

  const categories = ["All", ...PHOTOGRAPHER_TYPES];

  const toggleFavorite = async (user_id: string) => {
    try {
      const token = await storage.getToken();
      if (!token) {
        Alert.alert("Error", "Please login to save favorites");
        return;
      }

      // Update UI and local storage immediately
      const wasFavorited = favorites.includes(user_id);
      const updatedFavorites = wasFavorited
        ? favorites.filter((x) => x !== user_id)
        : [...favorites, user_id];

      setFavorites(updatedFavorites);
      await storage.saveFavorites(updatedFavorites);

      // Show notification
      if (!wasFavorited) {
        // Saving a photographer profile - photographer gets +5 points
        Alert.alert("Photographer Saved");
      } else {
        // Removing a saved photographer profile
        Alert.alert("Removed", "Photographer removed from your favorites");
      }

      // Try to sync with backend (silent failure if not ready)
      try {
        await apiService.toggleFavoritePhotographer(user_id, token);
      } catch (backendError: any) {
        // Just log backend errors, don't show alerts or revert UI
        // This allows favorites to work locally while backend is in development
        if (!backendError.message?.includes("not yet available")) {
          console.warn(
            "Backend sync failed (non-critical):",
            backendError.message,
          );
        }
      }
    } catch (e: any) {
      // Only show alerts for critical errors (like auth issues)
      console.error("Toggle favorite error:", e);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  const toggleBookmark = async (imageId: number) => {
    try {
      const token = await storage.getToken();
      if (!token) {
        Alert.alert("Error", "Please login to save posts");
        return;
      }

      // Optimistic update
      const wasBookmarked = bookmarkedPosts.includes(imageId);
      const updated = wasBookmarked
        ? bookmarkedPosts.filter((id) => id !== imageId)
        : [...bookmarkedPosts, imageId];
      setBookmarkedPosts(updated);

      // Show notification
      if (!wasBookmarked) {
        // Saving a post - photographer gets +2 points
        Alert.alert(
          "✅ Post Saved",
          "You saved this post.\n(Photographer earns +2 points)",
        );
      } else {
        // Removing a saved post
        Alert.alert("Removed", "Post removed from your saved collection");
      }

      await apiService.toggleImageSave(imageId, token);
    } catch (e) {
      console.error("Toggle bookmark error:", e);
      // Silently fail or revert
    }
  };

  // Filter photographers - search by name, location, and specialization
  const filtered = photographers.filter((p) => {
    // Search across multiple fields: name and specialization
    const matchesSearch =
      !searchQuery ||
      (p.full_name &&
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.specialization &&
        p.specialization.toLowerCase().includes(searchQuery.toLowerCase()));

    // Search by location specifically
    const matchesLocation =
      !locationQuery ||
      (p.location &&
        p.location.toLowerCase().includes(locationQuery.toLowerCase()));

    if (selectedCategory === "All") return matchesSearch && matchesLocation;

    const apiCategory =
      CATEGORY_TO_API[selectedCategory] ||
      selectedCategory
        .toUpperCase()
        .replace(/ & /g, "_AND_")
        .replace(/ /g, "_");
    const matchesCategory = p.recent_portfolio_images?.some(
      (img: any) =>
        img.portfolio?.category?.category_name?.toUpperCase() === apiCategory,
    );
    return matchesSearch && matchesLocation && matchesCategory;
  });

  const leftCol = filtered.filter((_, i) => i % 2 === 0);
  const rightCol = filtered.filter((_, i) => i % 2 !== 0);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "ios" ? 10 : insets.top + 15,
            backgroundColor: background,
            borderBottomColor: "#f1f5f9",
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={gray900} />
        </TouchableOpacity>
        <ThemedText type="lg" weight="extrabold" style={{ color: gray900 }}>
          Discover
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.hero, { backgroundColor: "#5b21b6" }]}>
          <ThemedText type="xl" weight="extrabold" style={{ color: "#fff" }}>
            Find Your Perfect Photographer
          </ThemedText>
          <ThemedText
            type="xs"
            weight="bold"
            style={{ color: "rgba(255,255,255,0.85)", marginTop: 6 }}
          >
            Explore a wide range of photographers to capture your special
            moments.
          </ThemedText>
          <View style={[styles.heroSearchRow, { backgroundColor: background }]}>
            <Ionicons
              name="search-outline"
              size={18}
              color={gray500}
              style={{ marginLeft: 8 }}
            />
            <TextInput
              testID="explore-search-input"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or specialty..."
              placeholderTextColor={gray400}
              style={[styles.heroInput, { color: gray900 }]}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.heroSearchRow,
              { backgroundColor: background, marginTop: 8 },
            ]}
            onPress={() => setLocationPickerVisible(true)}
          >
            <Ionicons
              name="location-outline"
              size={18}
              color={gray500}
              style={{ marginLeft: 8 }}
            />
            <View style={[styles.heroInput, { justifyContent: "center" }]}>
              <ThemedText style={{ color: locationQuery ? gray900 : gray400 }}>
                {locationQuery || "Filter by location (City in Nepal)..."}
              </ThemedText>
            </View>
            {locationQuery ? (
              <TouchableOpacity
                onPress={() => setLocationQuery("")}
                style={{ marginRight: 10 }}
              >
                <Ionicons name="close-circle" size={18} color={gray400} />
              </TouchableOpacity>
            ) : (
              <Ionicons
                name="chevron-down"
                size={18}
                color={gray400}
                style={{ marginRight: 10 }}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.savedRow}>
          <TouchableOpacity
            style={[
              styles.savedCard,
              { backgroundColor: background, borderColor: "#e5e7eb" },
            ]}
            onPress={() => router.push("/Client/FavoritePhotographers")}
          >
            <View style={[styles.savedIcon, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="heart" size={18} color={primary} />
            </View>
            <ThemedText
              type="xs"
              weight="extrabold"
              style={{ color: gray900, textAlign: "center" }}
            >
              Saved Photographers
            </ThemedText>
            <ThemedText
              type="xs"
              weight="bold"
              style={{ color: gray500, marginTop: 4 }}
            >
              {favorites.length} saved
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.savedCard,
              { backgroundColor: background, borderColor: "#e5e7eb" },
            ]}
            onPress={() => router.push("/Client/SavedPosts")}
          >
            <View style={[styles.savedIcon, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="bookmark" size={18} color={primary} />
            </View>
            <ThemedText
              type="xs"
              weight="extrabold"
              style={{ color: gray900, textAlign: "center" }}
            >
              Saved Posts
            </ThemedText>
            <ThemedText
              type="xs"
              weight="bold"
              style={{ color: gray500, marginTop: 4 }}
            >
              {bookmarkedPosts.length} saved
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {categories.map((c) => {
            const active = selectedCategory === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedCategory(c)}
                style={[
                  styles.catChip,
                  active
                    ? { backgroundColor: primary }
                    : { backgroundColor: "#f3f4f6" },
                ]}
              >
                <ThemedText
                  type="xs"
                  weight="extrabold"
                  style={{ color: active ? "#fff" : gray700 }}
                >
                  {c}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading && photographers.length === 0 ? (
          <View style={styles.centerContent}>
            <LogoLoader size={120} />
            <ThemedText
              type="base"
              weight="bold"
              style={{ color: gray600, marginTop: 12 }}
            >
              Finding amazing photographers...
            </ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={errorColor}
            />
            <ThemedText
              type="base"
              weight="extrabold"
              style={{
                color: errorColor,
                marginTop: 12,
                textAlign: "center",
                paddingHorizontal: 40,
              }}
            >
              {error}
            </ThemedText>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={[
                  styles.retryBtn,
                  { backgroundColor: primary, flex: 1, marginTop: 0 },
                ]}
                onPress={() => fetchPhotographers()}
              >
                <ThemedText
                  type="sm"
                  weight="extrabold"
                  style={{ color: "#fff" }}
                >
                  Retry
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.retryBtn,
                  { backgroundColor: errorColor, flex: 1, marginTop: 0 },
                ]}
                onPress={handleLogout}
              >
                <ThemedText
                  type="sm"
                  weight="extrabold"
                  style={{ color: "#fff" }}
                >
                  Logout
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerContent}>
            <Ionicons name="search-outline" size={48} color={gray400} />
            <ThemedText
              type="base"
              weight="bold"
              style={{ color: gray500, marginTop: 12 }}
            >
              No photographers found in this category.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.masonryContainer}>
            <View style={styles.masonryColumn}>
              {leftCol.map((item) => (
                <AspectRatioMasonryCard
                  key={`left-${item.user_id}`}
                  item={item}
                  isLeft={true}
                  favorites={favorites}
                  bookmarkedPosts={bookmarkedPosts}
                  toggleFavorite={toggleFavorite}
                  toggleBookmark={toggleBookmark}
                  router={router}
                />
              ))}
            </View>
            <View style={styles.masonryColumn}>
              {rightCol.map((item) => (
                <AspectRatioMasonryCard
                  key={`right-${item.user_id}`}
                  item={item}
                  isLeft={false}
                  favorites={favorites}
                  bookmarkedPosts={bookmarkedPosts}
                  toggleFavorite={toggleFavorite}
                  toggleBookmark={toggleBookmark}
                  router={router}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <ClientBottomNav />

      {/* Location Picker Modal */}
      <Modal
        visible={locationPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLocationPickerVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setLocationPickerVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Select City in Nepal
              </ThemedText>
              <TouchableOpacity
                onPress={() => setLocationPickerVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={gray900} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setLocationQuery("");
                  setLocationPickerVisible(false);
                }}
              >
                <ThemedText
                  style={[
                    styles.modalOptionText,
                    !locationQuery && { color: primary, fontWeight: "900" },
                  ]}
                >
                  All Cities (Nepal)
                </ThemedText>
                {!locationQuery && (
                  <Ionicons name="checkmark" size={18} color={primary} />
                )}
              </TouchableOpacity>

              {NEPAL_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={styles.modalOption}
                  onPress={() => {
                    setLocationQuery(city);
                    setLocationPickerVisible(false);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.modalOptionText,
                      locationQuery === city && {
                        color: primary,
                        fontWeight: "900",
                      },
                    ]}
                  >
                    {city}
                  </ThemedText>
                  {locationQuery === city && (
                    <Ionicons name="checkmark" size={18} color={primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  iconBtn: { padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#1e293b" },
  hero: {
    backgroundColor: "#5b21b6",
    margin: 16,
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
  },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  heroSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "700",
  },
  heroSearchRow: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  heroIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  heroInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  heroSearchBtn: {
    width: 44,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  savedRow: { flexDirection: "row", paddingHorizontal: 16, columnGap: 12 },
  savedCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  savedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  savedTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  savedCount: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: "#6b7280",
  },
  catRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    columnGap: 10,
  },
  catChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  catChipActive: { backgroundColor: "#2563eb" },
  catChipInactive: { backgroundColor: "#f3f4f6" },
  catChipText: { fontSize: 13, fontWeight: "900" },
  catChipTextActive: { color: "#fff" },
  catChipTextInactive: { color: "#374151" },
  scrollContent: { paddingBottom: 100 },
  masonryContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginTop: 10,
  },
  masonryColumn: { flex: 1, overflow: "visible" },
  masonryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 25,
    marginHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 15,
    borderWidth: 0,
  },
  masonryImageContainer: { position: "relative", width: "100%" },
  masonryImage: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  masonryImagePlaceholder: {
    width: "100%",
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  floatingHeart: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  masonryInfo: { padding: 12 },
  masonrySocialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 12,
  },
  masonryStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  masonryStatText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  masonryCategory: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  masonryProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  masonryAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  masonryAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  masonryAvatarInitial: { fontSize: 12, fontWeight: "bold", color: "#4b5563" },
  masonryName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
    flexShrink: 1,
  },
  masonryRatingPrice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  masonryRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  masonryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  masonryRankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  masonryLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  masonryRatingText: { fontSize: 12, fontWeight: "800", color: "#111827" },

  masonryViewBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  masonryViewBtnText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loaderIcon: { marginBottom: 12 },
  loaderText: { fontSize: 16, color: "#4b5563", fontWeight: "600" },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 40,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "800" },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "70%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalList: {
    padding: 10,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalOptionText: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "600",
  },
});
