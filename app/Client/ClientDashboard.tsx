import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ClientBottomNav from "../../components/ClientBottomNav";
import LogoLoader from "../../components/LogoLoader";
import { API_HOST, apiService, Comment } from "../../services/api";
import { socketService } from "../../services/socket";
import { storage } from "../../utils/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Helper to format relative time
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

const toAbsoluteImageUrl = (img_url?: string | null, image_id?: number) => {
  if (img_url && img_url.trim() !== "") {
    if (img_url.startsWith("http://") || img_url.startsWith("https://"))
      return img_url;
    const path = img_url.startsWith("/") ? img_url : `/${img_url}`;
    return `${API_HOST}${path}`;
  }
  if (image_id) {
    return `${API_HOST}/api/photographer/portfolio/image/${image_id}`;
  }
  return null;
};

const StoriesBar = ({ photographers }: { photographers: any[] }) => {
  const router = useRouter();
  const gray900 = useThemeColor({}, "gray900");
  const infoColor = useThemeColor({}, "info");

  return (
    <View style={styles.storiesContainer}>
      <View style={styles.storiesHeader}>
        <ThemedText type="sm" weight="bold" style={{ color: gray900 }}>
          Top Photographers{" "}
        </ThemedText>
        <TouchableOpacity
          onPress={() => router.push("/TopPhotographersLeaderboard")}
        >
          <ThemedText type="xs" weight="semibold" style={{ color: infoColor }}>
            View All
          </ThemedText>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesScroll}
      >
        {photographers.map((p) => {
          const profileUri = p.profile_image
            ? p.profile_image.startsWith("http")
              ? p.profile_image
              : `${API_HOST}${p.profile_image.startsWith("/") ? "" : "/"}${p.profile_image}`
            : null;
          return (
            <TouchableOpacity
              key={p.user_id}
              style={styles.storyItem}
              onPress={() =>
                router.push({
                  pathname: "/Client/PhotographerProfile",
                  params: { id: p.user_id },
                })
              }
            >
              <View style={styles.storyRing}>
                {profileUri ? (
                  <Image
                    source={{ uri: profileUri }}
                    style={styles.storyAvatar}
                  />
                ) : (
                  <View
                    style={[styles.storyAvatar, styles.storyAvatarPlaceholder]}
                  >
                    <ThemedText
                      type="xl"
                      weight="bold"
                      style={{ color: "#fff" }}
                    >
                      {p.full_name?.charAt(0) || "P"}
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText
                type="xs"
                style={{ color: gray900, width: "90%", textAlign: "center" }}
                numberOfLines={1}
              >
                {p.full_name.split(" ")[0]}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const InstagramPost = ({
  item,
  onLike,
  onCommentPress,
}: {
  item: any;
  onLike: (id: number) => void;
  onCommentPress: (post: any) => void;
}) => {
  const router = useRouter();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const photographer = item.portfolio?.user;
  const categoryName = item.portfolio?.category?.category_name || "Photography";
  const imageUrl = toAbsoluteImageUrl(item.image_url, item.image_id);
  const profileImage = photographer?.profile_image
    ? photographer.profile_image.startsWith("http")
      ? photographer.profile_image
      : `${API_HOST}${photographer.profile_image.startsWith("/") ? "" : "/"}${photographer.profile_image}`
    : null;

  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState<number>(item.likes_count || 0);

  const gray900 = useThemeColor({}, "gray900");
  const gray600 = useThemeColor({}, "gray600");
  const gray500 = useThemeColor({}, "gray500");
  const gray400 = useThemeColor({}, "gray400");
  const infoColor = useThemeColor({}, "info");

  const handleLike = async () => {
    if (isLiked) return;
    setIsLiked(true);
    setLikes((prev) => prev + 1);
    try {
      await apiService.likePortfolioImage(item.image_id);
    } catch (e) {
      console.error("Failed to like:", e);
    }
  };

  return (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.postHeaderUser}
          onPress={() =>
            router.push({
              pathname: "/Client/PhotographerProfile",
              params: { id: photographer?.user_id },
            })
          }
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.postAvatar} />
          ) : (
            <View style={[styles.postAvatar, styles.postAvatarPlaceholder]}>
              <ThemedText type="base" weight="bold" style={{ color: "#fff" }}>
                {photographer?.full_name?.charAt(0) || "P"}
              </ThemedText>
            </View>
          )}
          <View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText type="sm" weight="bold" style={{ color: gray900 }}>
                {photographer?.full_name}
              </ThemedText>
              <View style={styles.categoryBadge}>
                <ThemedText
                  type="xs"
                  weight="semibold"
                  style={{ color: gray600, fontSize: 10 }}
                >
                  {categoryName.replace(/_/g, " ")}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="xs" style={{ color: gray600, marginTop: 1 }}>
              Kathmandu, Nepal
            </ThemedText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color={gray900} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: "/Client/PhotographerProfile",
            params: { id: photographer?.user_id },
          })
        }
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.postImagePlaceholder}>
            <Ionicons name="camera-outline" size={48} color="#dbdbdb" />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <TouchableOpacity onPress={handleLike}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={28}
              color={isLiked ? "#ed4956" : gray900}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginLeft: 16 }}
            onPress={() => onCommentPress(item)}
          >
            <Ionicons name="chatbubble-outline" size={24} color={gray900} />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 16 }}>
            <Ionicons name="paper-plane-outline" size={24} color={gray900} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
          <Ionicons name="bookmark-outline" size={24} color={gray900} />
        </TouchableOpacity>
      </View>

      <View style={styles.postInfo}>
        <ThemedText
          type="sm"
          weight="bold"
          style={{ color: gray900, marginBottom: 4 }}
        >
          {likes} likes
        </ThemedText>
        <ThemedText type="sm" style={{ color: gray900, lineHeight: 18 }}>
          <ThemedText type="sm" weight="bold">
            {photographer?.full_name}{" "}
          </ThemedText>
          {item.description || item.title || "Beautiful session!"}
        </ThemedText>

        {item.comments_count > 0 && (
          <TouchableOpacity onPress={() => onCommentPress(item)}>
            <ThemedText type="sm" style={{ color: gray500, marginTop: 6 }}>
              View all {item.comments_count} comments
            </ThemedText>
          </TouchableOpacity>
        )}

        <ThemedText
          type="xs"
          style={{ color: gray500, marginTop: 6, marginBottom: 8 }}
        >
          {getRelativeTime(item.created_at).toUpperCase()}
        </ThemedText>
      </View>

      <View style={styles.commentInputContainer}>
        <TextInput
          style={[styles.commentInput, { color: gray900 }]}
          placeholder="Add a comment..."
          placeholderTextColor="#9ca3af"
          value={commentText}
          onChangeText={setCommentText}
          editable={!isSubmitting}
        />
        <TouchableOpacity
          onPress={async () => {
            if (!commentText.trim() || isSubmitting) return;
            try {
              setIsSubmitting(true);
              const token = await storage.getToken();
              if (!token) {
                router.push("/login");
                return;
              }
              await apiService.addComment(item.image_id, commentText, token);
              setCommentText("");
              onCommentPress(item);
            } catch (err) {
              console.error("Failed to post comment:", err);
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <ThemedText
            type="sm"
            weight="semibold"
            style={{ color: commentText.trim() ? infoColor : gray400 }}
          >
            {isSubmitting ? "..." : "Post"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CommentItem = ({
  comment,
  onReply,
  onDelete,
  onEdit,
  currentUserId,
}: {
  comment: Comment;
  onReply: (c: Comment) => void;
  onDelete: (id: number) => void;
  onEdit: (c: Comment) => void;
  currentUserId?: string;
}) => {
  const gray900 = useThemeColor({}, "gray900");
  const gray600 = useThemeColor({}, "gray600");
  const gray500 = useThemeColor({}, "gray500");
  const isOwner = currentUserId === comment.user_id;

  const profileUri = comment.user?.profile_image
    ? comment.user.profile_image.startsWith("http")
      ? comment.user.profile_image
      : `${API_HOST}${comment.user.profile_image.startsWith("/") ? "" : "/"}${comment.user.profile_image}`
    : null;

  return (
    <View style={styles.commentItemContainer}>
      <View style={styles.commentMain}>
        {profileUri ? (
          <Image source={{ uri: profileUri }} style={styles.commentAvatar} />
        ) : (
          <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]}>
            <ThemedText type="xs" weight="bold" style={{ color: "#fff" }}>
              {comment.user?.full_name?.charAt(0) || "U"}
            </ThemedText>
          </View>
        )}
        <View style={styles.commentContent}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText type="xs" weight="bold" style={{ color: gray900 }}>
                {comment.user?.full_name}
              </ThemedText>
              <ThemedText type="xs" style={{ color: gray500, marginLeft: 8 }}>
                {getRelativeTime(comment.created_at)}
              </ThemedText>
            </View>
            <View style={{ flexDirection: "row" }}>
              {isOwner && (
                <>
                  <TouchableOpacity
                    onPress={() => onEdit(comment)}
                    style={{ marginRight: 12 }}
                  >
                    <Ionicons name="pencil-outline" size={14} color={gray500} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onDelete(comment.comment_id)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          <ThemedText type="sm" style={{ color: gray600, marginTop: 2 }}>
            {comment.comment_text}
          </ThemedText>
          <TouchableOpacity
            onPress={() => onReply(comment)}
            style={{ marginTop: 4 }}
          >
            <ThemedText type="xs" weight="bold" style={{ color: gray500 }}>
              Reply
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesList}>
          {comment.replies.map((reply) => (
            <View key={reply.comment_id} style={styles.replyItem}>
              <View style={styles.commentMain}>
                <View style={styles.commentContent}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <ThemedText
                        type="xs"
                        weight="bold"
                        style={{ color: gray900 }}
                      >
                        {reply.user?.full_name}
                      </ThemedText>
                      <ThemedText
                        type="xs"
                        style={{ color: gray500, marginLeft: 8 }}
                      >
                        {getRelativeTime(reply.created_at)}
                      </ThemedText>
                    </View>
                    {currentUserId === reply.user_id && (
                      <TouchableOpacity
                        onPress={() => onDelete(reply.comment_id)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ThemedText
                    type="sm"
                    style={{ color: gray600, marginTop: 2 }}
                  >
                    {reply.comment_text}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const CommentsModal = ({
  visible,
  onClose,
  post,
}: {
  visible: boolean;
  onClose: () => void;
  post: any;
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const gray900 = useThemeColor({}, "gray900");
  const gray100 = useThemeColor({}, "gray100");
  const background = useThemeColor({}, "background");
  const infoColor = useThemeColor({}, "info");

  useEffect(() => {
    if (visible && post) {
      fetchComments();
      loadUser();
    }
  }, [visible, post]);

  const loadUser = async () => {
    const user = await storage.getUser();
    setCurrentUser(user);
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await apiService.getComments(post.image_id);
      setComments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = await storage.getToken();
      if (!token) return;

      if (editingComment) {
        await apiService.updateComment(
          post.image_id,
          editingComment.comment_id,
          newComment,
          token,
        );
        setEditingComment(null);
      } else {
        await apiService.addComment(
          post.image_id,
          newComment,
          token,
          replyTo?.comment_id,
        );
      }

      setNewComment("");
      setReplyTo(null);
      fetchComments();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (id: number) => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      await apiService.deleteComment(post.image_id, id, token);
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={gray900} />
            </TouchableOpacity>
            <ThemedText type="lg" weight="bold">
              Comments
            </ThemedText>
            <View style={{ width: 24 }} />
          </View>

          {loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <LogoLoader size={40} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.comment_id.toString()}
              renderItem={({ item }) => (
                <CommentItem
                  comment={item}
                  onReply={setReplyTo}
                  onDelete={handleDeleteComment}
                  onEdit={(c) => {
                    setEditingComment(c);
                    setNewComment(c.comment_text);
                  }}
                  currentUserId={currentUser?.user_id}
                />
              )}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: 40 }}>
                  <ThemedText style={{ color: "#9ca3af" }}>
                    No comments yet. Be the first!
                  </ThemedText>
                </View>
              }
            />
          )}

          <View
            style={[
              styles.modalInputArea,
              {
                backgroundColor: background,
                borderTopWidth: 1,
                borderColor: "#efefef",
              },
            ]}
          >
            {(replyTo || editingComment) && (
              <View style={styles.replyNotice}>
                <ThemedText type="xs" style={{ color: "#6b7280" }}>
                  {editingComment
                    ? "Editing comment"
                    : `Replying to ${replyTo?.user?.full_name}`}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => {
                    setReplyTo(null);
                    setEditingComment(null);
                    if (editingComment) setNewComment("");
                  }}
                >
                  <Ionicons name="close-circle" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                style={[
                  styles.modalInput,
                  { color: gray900, backgroundColor: gray100 },
                ]}
                placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
                placeholderTextColor="#9ca3af"
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                onPress={handlePostComment}
                disabled={isSubmitting}
              >
                <ThemedText
                  weight="bold"
                  style={{
                    color: newComment.trim() ? infoColor : "#9ca3af",
                    marginLeft: 12,
                  }}
                >
                  {isSubmitting ? "..." : editingComment ? "Update" : "Post"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function ClientDashboard() {
  const insets = useSafeAreaInsets();
  const [feed, setFeed] = useState<any[]>([]);
  const [topPhotographers, setTopPhotographers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [showComments, setShowComments] = useState(false);

  const gray900 = useThemeColor({}, "gray900");
  const gray600 = useThemeColor({}, "gray600");
  const gray400 = useThemeColor({}, "gray400");
  const background = useThemeColor({}, "background");
  const errorColor = useThemeColor({}, "error");

  const fetchData = async () => {
    try {
      const [feedRes, topRes] = await Promise.all([
        apiService.getDashboardFeed(),
        apiService.getTopPhotographers(),
      ]);
      setFeed(feedRes.data || []);
      setTopPhotographers(topRes.data || []);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => fetchData();
    socketService.on("photographer_updated", handleUpdate);
    return () => {
      socketService.off("photographer_updated", handleUpdate);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: background }]}>
        <LogoLoader size={120} />
        <ThemedText
          type="base"
          weight="semibold"
          style={{ color: gray600, marginTop: 16 }}
        >
          Loading your feed...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "ios" ? 10 : insets.top + 12,
            backgroundColor: background,
          },
        ]}
      >
        <ThemedText
          type="2xl"
          weight="extrabold"
          style={{ color: gray900, letterSpacing: -1 }}
        >
          ClickSeekers
        </ThemedText>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.image_id.toString()}
        renderItem={({ item }) => (
          <InstagramPost
            item={item}
            onLike={() => {}}
            onCommentPress={(post) => {
              setSelectedPost(post);
              setShowComments(true);
            }}
          />
        )}
        ListHeaderComponent={<StoriesBar photographers={topPhotographers} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={gray900}
          />
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={60} color="#dbdbdb" />
              <ThemedText type="base" style={{ color: gray400, marginTop: 16 }}>
                Nothing here yet.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ThemedText type="base" style={{ color: errorColor }}>
                {error}
              </ThemedText>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: gray900 }]}
                onPress={fetchData}
              >
                <ThemedText type="base" weight="bold" style={{ color: "#fff" }}>
                  Retry
                </ThemedText>
              </TouchableOpacity>
            </View>
          )
        }
      />

      <CommentsModal
        visible={showComments}
        post={selectedPost}
        onClose={() => {
          setShowComments(false);
          setSelectedPost(null);
          fetchData();
        }}
      />

      <ClientBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dbdbdb",
  },
  loaderContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dbdbdb",
  },
  storiesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  storiesScroll: { paddingHorizontal: 12 },
  storyItem: { alignItems: "center", width: 80 },
  storyRing: {
    padding: 3,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#e1306c",
    marginBottom: 4,
  },
  storyAvatar: { width: 60, height: 60, borderRadius: 30 },
  storyAvatarPlaceholder: {
    backgroundColor: "#dbdbdb",
    alignItems: "center",
    justifyContent: "center",
  },
  postContainer: { marginBottom: 10, backgroundColor: "#fff" },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    justifyContent: "space-between",
  },
  postHeaderUser: { flexDirection: "row", alignItems: "center" },
  postAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  postAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  categoryBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  postImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
  postImagePlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postActionsLeft: { flexDirection: "row", alignItems: "center" },
  postInfo: { paddingHorizontal: 16 },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#efefef",
  },
  commentInput: { flex: 1, fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "85%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#dbdbdb",
  },
  commentItemContainer: { marginBottom: 16 },
  commentMain: { flexDirection: "row" },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  commentAvatarPlaceholder: {
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  commentContent: { flex: 1 },
  repliesList: { marginLeft: 44, marginTop: 12 },
  replyItem: { marginBottom: 12 },
  modalInputArea: {
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 12,
  },
  replyNotice: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    marginBottom: 8,
  },
  commentInputRow: { flexDirection: "row", alignItems: "center" },
  modalInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
});
