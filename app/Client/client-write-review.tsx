import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { API_HOST, apiService } from "../../services/api";
import { storage } from "../../utils/storage";

import { useLocalSearchParams, useRouter } from "expo-router";

export default function ClientWriteReview() {
  const Text = ThemedText;
  const router = useRouter();
  const params = useLocalSearchParams();
  const booking = params; // Params will contain booking properties
  const onBack = () => router.back();
  const onSubmit = () => router.push("/Client/ClientBookings");
  const insets = useSafeAreaInsets();

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [clientName, setClientName] = useState("You");
  const [clientAvatar, setClientAvatar] = useState<string | null>(null);

  // Fetch client info on mount
  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const storedUser = await storage.getUser();
        const token = await storage.getToken();

        if (storedUser) {
          setClientName(storedUser.full_name || "You");

          // Fetch complete profile from API to get profile image
          if (token && storedUser.user_id) {
            try {
              const res = await apiService.getUserById(
                storedUser.user_id,
                token,
              );
              console.log("API Full Response:", res);
              console.log("API Data:", res?.data);

              if (res.success && res.data) {
                // Log all available fields
                console.log("Available fields:", Object.keys(res.data));

                // Try different field names
                const img =
                  res.data.profile_image ||
                  res.data.profileImage ||
                  res.data.avatar ||
                  res.data.photo;

                console.log("Profile image found:", img);
                if (img) {
                  setClientAvatar(img);
                }
              }
            } catch (apiError) {
              console.error("Failed to fetch profile from API:", apiError);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch client info:", error);
      }
    };
    fetchClientInfo();
  }, []);

  const toAbsoluteImageUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== "string" || url.trim() === "") return null;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      // Add cache busting parameter
      return url.includes("?")
        ? `${url}&t=${Date.now()}`
        : `${url}?t=${Date.now()}`;
    }
    const path = url.startsWith("/") ? url : `/${url}`;
    // Add cache busting parameter
    return `${API_HOST}${path}?t=${Date.now()}`;
  };

  const getAvatarUri = () => {
    const imageUrl = clientAvatar ? toAbsoluteImageUrl(clientAvatar) : null;
    console.log("Avatar image URL:", imageUrl, "clientAvatar:", clientAvatar);
    if (imageUrl) {
      return imageUrl;
    }
    // Fallback to UI avatars service
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName || "You")}&background=2563eb&color=ffffff&size=144&bold=true`;
  };

  const ratingLabel = useMemo(() => {
    if (rating === 0) return "Tap a star to rate";
    if (rating === 1) return "Poor";
    if (rating === 2) return "Fair";
    if (rating === 3) return "Good";
    if (rating === 4) return "Very Good";
    return "Excellent";
  }, [rating]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating.");
      return;
    }

    try {
      const token = await storage.getToken();
      if (!token) {
        Alert.alert("Error", "You must be logged in to submit a review.");
        return;
      }

      const payload = {
        booking_id:
          typeof booking?.id === "string"
            ? booking.id
            : String(booking?.id || ""),
        rating: rating,
        review: review,
      };

      const response = await apiService.submitReview(payload, token);
      if (response.success) {
        Alert.alert("Success", "Thank you for your review!", [
          {
            text: "OK",
            onPress: () => {
              onSubmit();
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error("Submit review error:", error);
      Alert.alert("Error", error.message || "Failed to submit review");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 10 },
        ]}
      >
        <TouchableOpacity
          onPress={onBack}
          style={styles.iconBtn}
          accessibilityLabel="Back"
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate & Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Client Info (Reviewer) */}
        <View style={styles.card}>
          <View style={styles.photographerHeader}>
            <Image
              source={{
                uri: getAvatarUri(),
              }}
              style={styles.photographerAvatar}
            />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.photographerName} numberOfLines={1}>
                {clientName}
              </Text>
              <Text style={styles.photographerSub}>Writing a review</Text>
            </View>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.card}>
          <Text style={styles.cardTitleCenter}>How was your experience?</Text>

          <View style={styles.starsPickRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setRating(s)}
                activeOpacity={0.7}
                accessibilityLabel={`Rate ${s} star`}
              >
                <Ionicons
                  name={s <= rating ? "star" : "star-outline"}
                  size={44}
                  color={s <= rating ? "#fbbf24" : "#d1d5db"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text
            style={[styles.ratingLabel, rating > 0 && { color: "#fbbf24" }]}
          >
            {ratingLabel}
          </Text>
        </View>

        {/* Written Review */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Review</Text>
          <TextInput
            value={review}
            onChangeText={setReview}
            placeholder="Tell us what you liked (or didn't like) about the service..."
            placeholderTextColor="#9ca3af"
            multiline
            style={styles.textarea}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={rating === 0}
          activeOpacity={0.8}
          style={[
            styles.submitBtn,
            rating === 0 ? styles.submitDisabled : null,
          ]}
        >
          <Text
            style={[
              styles.submitText,
              rating === 0 ? styles.submitTextDisabled : null,
            ]}
          >
            Post Review
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfdfd" },

  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },

  content: { padding: 20, rowGap: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  photographerHeader: { flexDirection: "row", alignItems: "center" },
  photographerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f1f5f9",
  },
  photographerName: { fontSize: 18, fontWeight: "900", color: "#111827" },
  photographerSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  cardTitleCenter: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 20,
  },

  starsPickRow: {
    flexDirection: "row",
    justifyContent: "center",
    columnGap: 12,
  },
  ratingLabel: {
    marginTop: 16,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "800",
  },

  textarea: {
    borderWidth: 1.5,
    borderColor: "#f1f5f9",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 140,
    textAlignVertical: "top",
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
    backgroundColor: "#f8fafc",
  },

  submitBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  submitDisabled: { backgroundColor: "#e2e8f0", shadowOpacity: 0 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  submitTextDisabled: { color: "#94a3b8" },
});
