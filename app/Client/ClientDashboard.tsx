import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
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
// notifications will be dynamically required below to avoid Expo Go SDK warnings
import Constants, { ExecutionEnvironment } from "expo-constants";
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

const StoriesBar = ({
  photographers,
  timestamp,
}: {
  photographers: any[];
  timestamp?: number;
}) => {
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
          const profileUri = toAbsoluteImageUrl(
            p.profile_image || p.avatar,
            undefined,
            timestamp,
          );
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
                <Image
                  source={{
                    uri:
                      profileUri ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || "Photographer")}&background=random`,
                  }}
                  style={styles.storyAvatar}
                />
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
  initialLikedState,
  initialSavedState,
  onLike,
  onCommentPress,
  timestamp,
}: {
  item: any;
  initialLikedState?: boolean;
  initialSavedState?: boolean;
  onLike: (id: number) => void;
  onCommentPress: (post: any) => void;
  timestamp?: number;
}) => {
  const router = useRouter();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const photographer = item.portfolio?.user;
  const categoryName = item.portfolio?.category?.category_name || "Photography";
  const imageUrl = toAbsoluteImageUrl(item.image_url, item.image_id, timestamp);
  const profileImage = toAbsoluteImageUrl(
    photographer?.profile_image,
    undefined,
    timestamp,
  );

  const [isLiked, setIsLiked] = useState(initialLikedState || false);
  const [likes, setLikes] = useState<number>(item.likes_count || 0);
  const [isSaved, setIsSaved] = useState(initialSavedState || false);

  const gray900 = useThemeColor({}, "gray900");
  const gray600 = useThemeColor({}, "gray600");
  const gray500 = useThemeColor({}, "gray500");
  const gray400 = useThemeColor({}, "gray400");
  const infoColor = useThemeColor({}, "info");

  const handleSave = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      const newSavedState = !isSaved;
      setIsSaved(newSavedState);

      const result = await apiService.toggleImageSave(item.image_id, token);
      if (result.success) {
        setIsSaved(!!result.data?.isSaved);
        Alert.alert(
          "Success",
          result.data?.isSaved ? "Saved to post" : "Removed successfully",
        );
      }
    } catch (e) {
      console.error("Failed to save:", e);
      setIsSaved(!isSaved);
    }
  };

  const handleLike = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      // Toggle like state immediately for UI responsiveness
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikes((prev) => (newLikedState ? prev + 1 : prev - 1));

      const result = await apiService.likePortfolioImage(item.image_id, token);

      // Update with actual values from backend
      if (result.data) {
        setIsLiked(result.data.isLiked);
        setLikes(result.data.likes_count);
      }
    } catch (e) {
      console.error("Failed to like:", e);
      // Revert on error
      setIsLiked(!isLiked);
      setLikes((prev) => (isLiked ? prev + 1 : prev - 1));
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
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(photographer?.full_name || "Photographer")}&background=random`,
              }}
              style={styles.postAvatar}
            />
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
            {item.location ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 1,
                  gap: 2,
                }}
              >
                <Ionicons name="location-outline" size={11} color={gray600} />
                <ThemedText type="xs" style={{ color: gray600 }}>
                  {item.location}
                </ThemedText>
              </View>
            ) : null}
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
        <TouchableOpacity onPress={handleSave}>
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={24}
            color={gray900}
          />
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

// Configure notifications logic will be handled inside useEffect to avoid Expo Go warnings
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === "expo";

const CommentItem = ({
  comment,
  onReply,
  onDelete,
  onEdit,
  currentUserId,
  timestamp,
}: {
  comment: Comment;
  onReply: (c: Comment) => void;
  onDelete: (id: number) => void;
  onEdit: (c: Comment) => void;
  currentUserId?: string;
  timestamp?: number;
}) => {
  const gray900 = useThemeColor({}, "gray900");
  const gray600 = useThemeColor({}, "gray600");
  const gray500 = useThemeColor({}, "gray500");
  const isOwner = currentUserId === comment.user_id;

  const profileUri = toAbsoluteImageUrl(
    comment.user?.profile_image,
    undefined,
    timestamp,
  );

  return (
    <View style={styles.commentItemContainer}>
      <View style={styles.commentMain}>
        {profileUri ? (
          <Image source={{ uri: profileUri }} style={styles.commentAvatar} />
        ) : (
          <Image
            source={{
              uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.full_name || "User")}&background=random`,
            }}
            style={styles.commentAvatar}
          />
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
  timestamp,
}: {
  visible: boolean;
  onClose: () => void;
  post: any;
  timestamp?: number;
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
                  key={item.comment_id}
                  comment={item}
                  currentUserId={currentUser?.user_id}
                  timestamp={timestamp}
                  onReply={(c) => {
                    setReplyTo(c);
                    setNewComment(`@${c.user?.full_name} `);
                  }}
                  onDelete={handleDeleteComment}
                  onEdit={(c) => {
                    setEditingComment(c);
                    setNewComment(c.comment_text);
                  }}
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [feed, setFeed] = useState<any[]>([]);
  const [topPhotographers, setTopPhotographers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [likedImageIds, setLikedImageIds] = useState<number[]>([]);
  const [savedImageIds, setSavedImageIds] = useState<number[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now());

  const gray900 = useThemeColor({}, "gray900");
  const gray600 = useThemeColor({}, "gray600");
  const gray400 = useThemeColor({}, "gray400");
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

  const fetchData = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      const [feedRes, topRes, likesRes, savesRes, notifRes] = await Promise.all(
        [
          apiService.getDashboardFeed(),
          apiService.getTopPhotographers(),
          apiService.getUserLikes(token),
          apiService.getUserSaves(token),
          apiService.getNotifications(token),
        ],
      );
      setFeed(feedRes.data || []);
      setTopPhotographers(topRes.data || []);
      setLikedImageIds(likesRes.data?.likedImageIds || []);
      setSavedImageIds(savesRes.data?.savedImageIds || []);
      setRefreshTimestamp(Date.now());

      if (notifRes.success) {
        setNotifications(notifRes.data || []);
        const unread = (notifRes.data || []).filter(
          (n: any) => !n.is_read,
        ).length;
        setUnreadCount(unread);
      }

      setError(null);
    } catch (e) {
      console.error(e);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  useEffect(() => {
    const setupNotifications = async () => {
      const isExpoGo =
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
        Constants.appOwnership === "expo";
      if (isExpoGo) {
        console.log("Push notifications are not supported in Expo Go.");
        return;
      }

      // Set notification handler only for non-Expo Go environments
      const Notifications = require("expo-notifications");
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.warn("Failed to get push token for push notification!");
        return;
      }

      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
    };

    const initSocket = async () => {
      const token = await storage.getToken();
      const user = await storage.getUser();
      if (token && user) {
        socketService.connect(token);
        socketService.emit("join_room", user.user_id);
      }
    };

    setupNotifications();
    initSocket();
    fetchData();

    const handleUpdate = () => fetchData();
    const handleNewNotification = (data: any) => {
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleNewMessage = (msg: any) => {
      fetchData();
      // Client is definitely NOT in ClientMessages if they are in ClientDashboard
      // because they are separate routes. So we show notification.
      if (!isExpoGo) {
        const Notifications = require("expo-notifications");
        Notifications.scheduleNotificationAsync({
          content: {
            title: `New message from ${msg.sender_name || "Photographer"}`,
            body: msg.message || "Are you available?",
            data: { senderId: msg.sender_id },
          },
          trigger: null,
        });
      }
    };

    const handleAdminActionNotification = async (data: any) => {
      const action = data?.action || data?.status;
      if (action === "BLOCKED") {
        Alert.alert(
          "Account Blocked",
          data?.message ||
            "Your account has been blocked by the admin. You will be logged out.",
          [
            {
              text: "OK",
              onPress: async () => {
                await storage.clearAuth();
                socketService.disconnect();
                router.replace("/login");
              },
            },
          ],
          { cancelable: false },
        );
      } else if (action === "WARNING") {
        Alert.alert(
          "⚠️ Admin Warning",
          data?.message ||
            "Your account has received a warning from admin. Please review community guidelines.",
        );
      }
    };

    socketService.on("photographer_updated", handleUpdate);
    socketService.on("new_notification", handleNewNotification);
    socketService.on("notification", handleNewNotification);
    socketService.on("new_message", handleNewMessage);
    socketService.on(
      "admin_action_notification",
      handleAdminActionNotification,
    );

    return () => {
      socketService.off("photographer_updated", handleUpdate);
      socketService.off("new_notification", handleNewNotification);
      socketService.off("notification", handleNewNotification);
      socketService.off("new_message", handleNewMessage);
      socketService.off(
        "admin_action_notification",
        handleAdminActionNotification,
      );
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
    <View
      style={{ flex: 1, backgroundColor: background }}
      testID="client-dashboard"
    >
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
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => setShowNotifications(true)}
        >
          <Ionicons name="notifications-outline" size={26} color={gray900} />
          {notifications.filter((n: any) => !n.is_read).length > 0 && (
            <View style={styles.notifBadge}>
              <ThemedText style={styles.notifBadgeText}>
                {notifications.filter((n: any) => !n.is_read).length}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.image_id.toString()}
        renderItem={({ item }) => (
          <InstagramPost
            item={item}
            initialLikedState={likedImageIds.includes(item.image_id)}
            initialSavedState={savedImageIds.includes(item.image_id)}
            onLike={() => {}}
            onCommentPress={(post) => {
              setSelectedPost(post);
              setShowComments(true);
            }}
            timestamp={refreshTimestamp}
          />
        )}
        ListHeaderComponent={
          <StoriesBar
            photographers={topPhotographers}
            timestamp={refreshTimestamp}
          />
        }
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
              <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={[
                    styles.retryBtn,
                    { backgroundColor: gray900, flex: 1 },
                  ]}
                  onPress={fetchData}
                >
                  <ThemedText
                    type="base"
                    weight="bold"
                    style={{ color: "#fff" }}
                  >
                    Retry
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.retryBtn,
                    { backgroundColor: errorColor, flex: 1 },
                  ]}
                  onPress={handleLogout}
                >
                  <ThemedText
                    type="base"
                    weight="bold"
                    style={{ color: "#fff" }}
                  >
                    Logout
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )
        }
      />

      <CommentsModal
        visible={showComments}
        post={selectedPost}
        timestamp={refreshTimestamp}
        onClose={() => {
          setShowComments(false);
          setSelectedPost(null);
        }}
      />

      <NotificationModal
        visible={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          fetchData(); // Refresh to update unread count status
        }}
        notifications={notifications}
        setNotifications={setNotifications}
      />

      <ClientBottomNav />
    </View>
  );
}

function NotificationModal({
  visible,
  onClose,
  notifications,
  setNotifications,
}: {
  visible: boolean;
  onClose: () => void;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, "background");
  const gray900 = useThemeColor({}, "gray900");
  const gray700 = useThemeColor({}, "gray700");
  const gray500 = useThemeColor({}, "gray500");
  const gray100 = useThemeColor({}, "gray100");
  const infoColor = useThemeColor({}, "info");

  const getIcon = (type: string) => {
    switch (type) {
      case "BOOKING":
        return { name: "calendar" as const, color: "#f97316" };
      case "COMMENT":
        return { name: "chatbubble" as const, color: "#6366f1" };
      case "LIKE":
        return { name: "heart" as const, color: "#ed4956" };
      case "REVIEW":
        return { name: "star" as const, color: "#fbbf24" };
      case "SYSTEM":
        return { name: "shield-checkmark" as const, color: "#3b82f6" };
      default:
        return { name: "notifications" as const, color: "#6366f1" };
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      await apiService.markNotificationAsRead(id, token);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === id ? { ...n, is_read: true } : n,
        ),
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: background, height: "90%" },
          ]}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top || 16 }]}>
            <ThemedText type="xl" weight="bold" style={{ color: gray900 }}>
              Notifications
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={gray900} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {notifications.length === 0 ? (
              <View style={styles.emptyNotif}>
                <Ionicons
                  name="notifications-off-outline"
                  size={48}
                  color="#cbd5e1"
                />
                <ThemedText style={styles.emptyText}>
                  No new notifications
                </ThemedText>
              </View>
            ) : (
              notifications.map((notif) => {
                const icon = getIcon(notif.type);
                return (
                  <TouchableOpacity
                    key={notif.notification_id}
                    style={[
                      styles.notifItem,
                      {
                        backgroundColor: notif.is_read
                          ? background
                          : gray100 + "40",
                        flexDirection: "row",
                        alignItems: "center",
                      },
                    ]}
                    onPress={() =>
                      !notif.is_read && markAsRead(notif.notification_id)
                    }
                  >
                    <View
                      style={[
                        styles.notifIconBox,
                        { backgroundColor: icon.color + "15" },
                      ]}
                    >
                      <Ionicons name={icon.name} size={20} color={icon.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <ThemedText
                        style={[styles.notifAction, { color: gray900 }]}
                        weight="bold"
                      >
                        {notif.title}
                      </ThemedText>
                      <ThemedText
                        style={[styles.notifMessage, { color: gray700 }]}
                      >
                        {notif.message}
                      </ThemedText>
                      <ThemedText
                        style={[styles.notifUser, { color: gray500 }]}
                      >
                        {getRelativeTime(notif.created_at)}
                      </ThemedText>
                    </View>
                    {!notif.is_read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#dbdbdb",
  },
  notifBtn: {
    padding: 8,
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  notifBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: 12,
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
  storyRankBadge: {
    position: "absolute",
    top: 50,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#fff",
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
  rankBadge: {
    backgroundColor: "#fffbeb",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#f59e0b",
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
  modalCloseBtn: {
    padding: 8,
  },
  modalScroll: {
    paddingBottom: 40,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  notifIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notifAction: {
    fontSize: 15,
    fontWeight: "700",
  },
  notifMessage: {
    fontSize: 13,
    marginTop: 2,
  },
  notifUser: {
    fontSize: 11,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
    marginLeft: 8,
  },
  emptyNotif: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 16,
    fontWeight: "600",
  },
});
