import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ThemedText } from "../../components/themed-text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_HOST, apiService } from "../../services/api";
import { storage } from "../../utils/storage";

interface SavedPostsProps {
  onBack?: () => void;
  onNavigate?: (screen: string, data?: any) => void;
}

interface Post {
  image_id: number;
  photographer: {
    user_id: string;
    full_name: string;
    username: string;
    profile_image: string | null;
  };
  image_url: string;
  title: string;
  description: string;
  location: string | null;
  likes_count: number;
  comments_count: number;
  isLiked: boolean;
  isSaved: boolean;
  created_at: string;
}

const toAbsoluteImageUrl = (url: string | null) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_HOST}${path}`;
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
  return `${diffInDays}d ago`;
};

const PostCard = ({
  item,
  onLike,
  onRemove,
  onNavigate,
  onCommentAdded,
}: {
  item: Post;
  onLike: (id: number) => void;
  onRemove: (id: number) => void;
  onNavigate: (id: string) => void;
  onCommentAdded: () => void;
}) => {
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profileImage = toAbsoluteImageUrl(item.photographer.profile_image);
  const imageUrl = toAbsoluteImageUrl(item.image_url);

  const handleAddComment = async () => {
    if (!commentText.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const token = await storage.getToken();
      if (!token) return;
      await apiService.addComment(item.image_id, commentText, token);
      setCommentText("");
      Alert.alert("Success", "Comment added!");
      onCommentAdded();
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.postContainer}>
      {/* Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.postHeaderUser}
          onPress={() => onNavigate(item.photographer.user_id)}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.postAvatar} />
          ) : (
            <View style={[styles.postAvatar, { backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" }]}>
              <ThemedText type="xs" weight="bold" style={{ color: "#4b5563" }}>
                {item.photographer.full_name?.charAt(0) || "P"}
              </ThemedText>
            </View>
          )}
          <View>
            <ThemedText type="sm" weight="bold" style={{ color: "#111827" }}>
              {item.photographer.username || item.photographer.full_name}
            </ThemedText>
            {item.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={12} color="#6b7280" />
                <ThemedText type="xs" style={{ color: "#6b7280" }}>
                  {item.location}
                </ThemedText>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Main Image */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onNavigate(item.photographer.user_id)}
      >
        <Image
          source={{ uri: imageUrl as string }}
          style={styles.postImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <TouchableOpacity onPress={() => onLike(item.image_id)}>
            <Ionicons
              name={item.isLiked ? "heart" : "heart-outline"}
              size={28}
              color={item.isLiked ? "#ed4956" : "#111827"}
            />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 16 }}>
            <Ionicons name="chatbubble-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => onRemove(item.image_id)}>
          <Ionicons name="bookmark" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Post Info */}
      <View style={styles.postInfo}>
        <ThemedText type="sm" weight="bold" style={{ color: "#111827", marginBottom: 4 }}>
          {item.likes_count} likes
        </ThemedText>
        <ThemedText type="sm" style={{ color: "#111827", lineHeight: 18 }}>
          <ThemedText type="sm" weight="bold">{item.photographer.username} </ThemedText>
          {item.description || item.title}
        </ThemedText>
        <ThemedText type="xs" style={{ color: "#9ca3af", marginTop: 6, marginBottom: 8 }}>
          {getRelativeTime(item.created_at).toUpperCase()}
        </ThemedText>
      </View>

      {/* Comment Input */}
      <View style={styles.commentInputRow}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor="#9ca3af"
          value={commentText}
          onChangeText={setCommentText}
          editable={!isSubmitting}
        />
        <TouchableOpacity onPress={handleAddComment}>
          <ThemedText
            type="sm"
            weight="bold"
            style={{ color: commentText.trim() ? "#4f46e5" : "#9ca3af" }}
          >
            {isSubmitting ? "..." : "Post"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function SavedPosts({ onBack, onNavigate }: SavedPostsProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPosts = async () => {
    try {
      setLoading(true);
      const token = await storage.getToken();
      if (!token) return;
      const response = await apiService.getUserSaves(token);
      if (response.success && response.data) {
        setPosts(response.data.savedPosts as any);
      }
    } catch (error) {
      console.error("Failed to fetch saved posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSavedPosts();
    }, [])
  );

  const handleLike = async (postId: number) => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      setPosts((prev) =>
        prev.map((p) =>
          p.image_id === postId
            ? {
                ...p,
                isLiked: !p.isLiked,
                likes_count: p.isLiked ? p.likes_count - 1 : p.likes_count + 1,
              }
            : p,
        ),
      );
      await apiService.likePortfolioImage(postId, token);
    } catch (error) {
      console.error("Failed to like:", error);
    }
  };

  const removeBookmark = async (postId: number) => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      setPosts((prev) => prev.filter((p) => p.image_id !== postId));
      await apiService.toggleImageSave(postId, token);
    } catch (error) {
      console.error("Failed to remove bookmark:", error);
      fetchSavedPosts();
    }
  };

  const handleNavigate = (photographerId: string) => {
    router.push({
      pathname: "/Client/PhotographerProfile",
      params: { id: photographerId },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack || (() => router.canGoBack() ? router.back() : router.replace('/Client/ClientDashboard'))} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Saved Posts</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => String(p.image_id)}
            renderItem={({ item }) => (
              <PostCard
                item={item}
                onLike={handleLike}
                onRemove={removeBookmark}
                onNavigate={handleNavigate}
                onCommentAdded={fetchSavedPosts}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={posts.length ? styles.listContent : styles.emptyWrap}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="bookmark-outline" size={48} color="#cbd5e1" />
                <ThemedText style={styles.emptyTitle}>No Saved Posts</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Bookmarks you save will appear here.
                </ThemedText>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: { padding: 8 },
  title: { fontSize: 16, fontWeight: "900", color: "#111827" },
  
  listContent: { paddingBottom: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyWrap: { flexGrow: 1 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#111827", marginTop: 12 },
  emptyText: { color: "#6b7280", marginTop: 6, textAlign: "center", fontWeight: "600" },

  postContainer: {
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postHeaderUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  postAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 1,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postActionsLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  postInfo: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f9fafb",
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
});
