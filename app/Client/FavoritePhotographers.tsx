import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoLoader from "../../components/LogoLoader";
import { ThemedText } from "../../components/themed-text";
import { API_HOST, apiService } from "../../services/api";
import { storage } from "../../utils/storage";

interface FavoritePhotographersProps {
  onNavigate?: (screen: string, data?: any) => void;
  onBack?: () => void;
}

type FavoritePhotographer = {
  user_id: string;
  full_name: string;
  specialization: string | null;
  avg_rating: number;
  reviews_count: number;
  location: string | null;
  kyc_verified: boolean;
  profile_image: string | null;
  favorited_at: string;
  rank?: number;
  badge?: string;
};

export default function FavoritePhotographers({
  onNavigate,
  onBack,
}: FavoritePhotographersProps) {
  const Text = ThemedText;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<FavoritePhotographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headerSubtitle = useMemo(
    () =>
      `${favorites.length} saved photographer${favorites.length !== 1 ? "s" : ""}`,
    [favorites.length],
  );

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await storage.getToken();
      if (!token) {
        setError("Please login to view favorites");
        setLoading(false);
        return;
      }

      let backendFavorites: any[] = [];
      try {
        const res = await apiService.getFavoritePhotographers(token);
        if (res.success && res.data) {
          backendFavorites = res.data;
        }
      } catch (backendError: any) {
        if (!backendError.message?.includes("not yet available")) {
          console.error("Backend fetch failed:", backendError);
        }
      }

      const localFavoriteIds = await storage.getFavorites();
      const favoriteIds =
        backendFavorites.length > 0
          ? backendFavorites.map((f) => f.photographer_id || f.user_id)
          : localFavoriteIds;

      if (favoriteIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const datesMap: Record<string, string> = {};
      backendFavorites.forEach((f) => {
        const id = f.photographer_id || f.user_id;
        datesMap[id] =
          f.created_at || f.favorited_at || new Date().toISOString();
      });

      // Fetch all photographers to ensure complete data availability
      try {
        const allPhotographers = await apiService.getAllPhotographers();
        if (allPhotographers.success && allPhotographers.data) {
          const favoritePhotographers = allPhotographers.data
            .filter((p: any) => favoriteIds.includes(p.user_id))
            .map((p: any) => ({
              user_id: p.user_id,
              full_name: p.full_name,
              specialization: p.specialization,
              avg_rating:
                p.avg_rating !== undefined && p.avg_rating !== null
                  ? p.avg_rating
                  : p.reviews?.length > 0
                    ? p.reviews.reduce(
                        (acc: any, r: any) => acc + r.rating,
                        0,
                      ) / p.reviews.length
                    : 0,
              reviews_count:
                p.reviews_count || p.total_reviews || p.reviews?.length || 0,
              location: p.location || p.city || "Kathmandu, Nepal",
              kyc_verified:
                p.kyc_verification?.status === "APPROVED" ||
                p.kyc_status === "APPROVED" ||
                false,
              profile_image: p.profile_image || p.avatar || null,
              favorited_at: datesMap[p.user_id] || new Date().toISOString(),
              rank: p.rank || null,
              badge: p.badge || "Rookie",
              points: p.points || 0,
            }));
          setFavorites(favoritePhotographers);
        }
      } catch (e: any) {
        console.error("Failed to fetch photographer details:", e);
        setError("Failed to load photographer details");
      }
    } catch (e: any) {
      console.error("Fetch favorites error:", e);
      setError(e.message || "Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (userId: string) => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      // Update UI and local storage immediately
      setFavorites((prev) => prev.filter((p) => p.user_id !== userId));

      const favoriteIds = await storage.getFavorites();
      const updatedIds = favoriteIds.filter((id) => id !== userId);
      await storage.saveFavorites(updatedIds);

      // Show success message
      Alert.alert("Removed", "Photographer removed from your favorites");

      // Try to sync with backend (silent failure if not ready)
      try {
        await apiService.toggleFavoritePhotographer(userId, token);
      } catch (backendError: any) {
        // Just log backend errors, don't show alerts or revert UI
        if (!backendError.message?.includes("not yet available")) {
          console.warn(
            "Backend sync failed (non-critical):",
            backendError.message,
          );
        }
      }
    } catch (e: any) {
      console.error("Remove favorite error:", e);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return `${Math.floor(diffInDays / 30)}mo ago`;
  };

  const renderItem = ({ item }: { item: FavoritePhotographer }) => {
    const profileUri = item.profile_image
      ? item.profile_image.startsWith("http")
        ? item.profile_image
        : `${API_HOST}${item.profile_image.startsWith("/") ? "" : "/"}${item.profile_image}`
      : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          {/* Image */}
          <View style={styles.imageWrap}>
            {profileUri ? (
              <Image source={{ uri: profileUri }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.imagePlaceholderText}>
                  {item.full_name?.charAt(0) || "P"}
                </Text>
              </View>
            )}
            {item.kyc_verified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            ) : null}
          </View>

          {/* Details */}
          <View style={styles.body}>
            <View style={styles.topRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.full_name}
                </Text>
                <Text style={styles.category} numberOfLines={1}>
                  {item.specialization || "Photographer"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleRemoveFavorite(item.user_id)}
                style={styles.removeBtn}
                activeOpacity={0.85}
                accessibilityLabel="Remove from favorites"
              >
                <Ionicons name="close" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.metaText}>
                  {item.avg_rating !== undefined && item.avg_rating !== null
                    ? Number(item.avg_rating).toFixed(1)
                    : "0.0"}
                </Text>
                <Text style={styles.metaMuted}>
                  ({item.reviews_count || 0})
                </Text>
              </View>

              {item.location ? (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color="#6b7280" />
                  <Text style={styles.metaMuted} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.bottomRow}>
              {item.rank && (
                <View style={styles.rankBadge}>
                  <Ionicons name="trophy" size={12} color="#f59e0b" />
                  <Text style={styles.rankText}>#{item.rank}</Text>
                </View>
              )}
              <Text style={styles.savedOn} numberOfLines={1}>
                Saved {getRelativeTime(item.favorited_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnPrimary]}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/Client/PhotographerProfile",
                params: { id: item.user_id },
              })
            }
          >
            <Text style={styles.btnPrimaryText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnAccent]}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/Client/booking-request",
                params: { photographerId: item.user_id },
              })
            }
          >
            <Text style={styles.btnAccentText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="heart-outline" size={34} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptyText}>
        Save your favorite photographers to easily find them later
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        activeOpacity={0.85}
        onPress={() => router.push("/Client/ExplorePhotographers")}
      >
        <Text style={styles.emptyBtnText}>Explore Photographers</Text>
      </TouchableOpacity>
    </View>
  );

  const LoadingState = () => (
    <View style={styles.empty}>
      <LogoLoader size={80} />
      <Text style={styles.emptyText}>Loading your favorites...</Text>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.empty}>
      <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
      <Text style={styles.emptyTitle}>Error</Text>
      <Text style={styles.emptyText}>{error}</Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        activeOpacity={0.85}
        onPress={fetchFavorites}
      >
        <Text style={styles.emptyBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 12 },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/Client/ClientDashboard")
            }
            style={styles.iconBtn}
            accessibilityLabel="Back"
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Favorites</Text>
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => String(item.user_id)}
          renderItem={renderItem}
          contentContainerStyle={
            favorites.length ? styles.listContent : styles.emptyWrap
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },

  header: {
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: { flexDirection: "row", alignItems: "center", columnGap: 10 },
  iconBtn: { padding: 8, marginRight: 4 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  headerSubtitle: {
    marginTop: 4,
    color: "#bfdbfe",
    fontWeight: "800",
    fontSize: 12,
  },

  listContent: { padding: 16, paddingBottom: 18 },
  emptyWrap: { flexGrow: 1, padding: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardRow: { flexDirection: "row", padding: 14 },

  imageWrap: { position: "relative", marginRight: 12 },
  image: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#e5e7eb",
  },
  imagePlaceholder: {
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
  },
  verifiedBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  body: { flex: 1, minWidth: 0 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  name: { color: "#111827", fontSize: 15, fontWeight: "900" },
  category: { marginTop: 2, color: "#6b7280", fontSize: 12, fontWeight: "700" },
  removeBtn: { padding: 8, borderRadius: 10, backgroundColor: "#fef2f2" },

  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    maxWidth: "55%",
  },
  metaText: { color: "#111827", fontWeight: "900", fontSize: 12 },
  metaMuted: { color: "#6b7280", fontWeight: "700", fontSize: 12 },

  bottomRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rankText: { color: "#92400e", fontWeight: "900", fontSize: 11 },
  savedOn: { color: "#9ca3af", fontWeight: "800", fontSize: 11 },

  actionsRow: {
    flexDirection: "row",
    columnGap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "#1e3a8a" },
  btnPrimaryText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  btnAccent: { backgroundColor: "#f97316" },
  btnAccentText: { color: "#fff", fontWeight: "900", fontSize: 13 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    color: "#6b7280",
    fontWeight: "700",
  },
  emptyBtn: {
    marginTop: 14,
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: { color: "#fff", fontWeight: "900" },
});
