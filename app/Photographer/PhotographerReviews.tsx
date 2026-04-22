import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { useAppTheme } from "../../hooks/use-app-theme";
import { API_HOST, apiService } from "../../services/api";
import { storage } from "../../utils/storage";

interface Review {
  review_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: {
    full_name: string;
    profile_image: string | null;
  };
}

const toAbsoluteImageUrl = (url: string | null | undefined) => {
  if (!url || url.trim() === "") return null;
  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_HOST}${path}`;
};

export default function PhotographerReviews({
  onBack,
}: {
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    primary,
    background,
    gray900,
    gray700,
    gray600,
    gray500,
    gray400,
    gray300,
    gray200,
    gray100,
    white,
    success,
    warning,
    error: errorColor,
    info,
  } = useAppTheme();

  const fetchReviews = async () => {
    try {
      const token = await storage.getToken();
      if (!token) {
        setError("Unauthorized");
        setLoading(false);
        return;
      }

      const res = await apiService.getPhotographerReviews(token);
      if (res.success) {
        setReviews(res.data || []);
      }
    } catch (err: any) {
      console.error("Fetch reviews error:", err);
      setError(err.message || "Failed to load reviews");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.cardHeader}>
        <Image
          source={{
            uri: toAbsoluteImageUrl(item.reviewer.profile_image) || "",
          }}
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <ThemedText weight="bold" style={{ color: gray900 }}>
            {item.reviewer.full_name}
          </ThemedText>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= item.rating ? "star" : "star-outline"}
                size={14}
                color={warning}
              />
            ))}
          </View>
        </View>
        <ThemedText type="xs" style={{ color: gray500 }}>
          {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
      </View>
      <ThemedText style={[styles.comment, { color: gray700 }]}>
        {item.comment || "No comment provided"}
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: gray100 }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, backgroundColor: background },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={gray900} />
        </TouchableOpacity>
        <ThemedText type="lg" weight="bold" style={{ color: gray900 }}>
          Client Reviews
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primary} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.review_id)}
          renderItem={renderReview}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="star-outline" size={48} color={gray400} />
              <ThemedText style={styles.emptyText}>No reviews yet.</ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  iconBtn: { padding: 4 },
  headerTitle: { color: "#111827" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, gap: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  headerInfo: { flex: 1, marginLeft: 10 },
  reviewerName: { color: "#111827" },
  date: { color: "#6b7280", marginTop: 1 },
  emptyBox: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { color: "white" },
  comment: { lineHeight: 20, color: "#4b5563" },
  noComment: { fontStyle: "italic", color: "#9ca3af" },
});
