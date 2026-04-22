import { ThemedText } from "@/components/themed-text";
import { Typography } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
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
// notifications will be dynamically required below to avoid Expo Go SDK warnings

import Constants, { ExecutionEnvironment } from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ClientBottomNav from "../../components/ClientBottomNav";
import { API_HOST, apiService } from "../../services/api";
import { socketService } from "../../services/socket";
import { storage } from "../../utils/storage";

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  message?: string; // Add this for backend consistency
  imageUrl?: string;
  timestamp: string;
  isRead: boolean;
}

type Props = {
  onBack?: () => void;
  onOpenConversation?: (conversation: Conversation) => void;
  initialConversationId?: string | null;
  initialUserName?: string | null;
  initialUserAvatar?: string | null;
};

export const ClientMessages: React.FC<Props> = ({
  onBack,
  onOpenConversation,
  initialConversationId,
  initialUserName: propUserName,
  initialUserAvatar: propUserAvatar,
}) => {
  const insets = useSafeAreaInsets();
  const {
    otherUserId,
    userName: paramUserName,
    userAvatar: paramUserAvatar,
  } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(
    initialConversationId
      ? String(initialConversationId).toLowerCase()
      : typeof otherUserId === "string"
        ? otherUserId.toLowerCase()
        : null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Record<string, boolean>>({});

  const messagesListRef = useRef<FlatList<Message> | null>(null);

  const gray900 = useThemeColor({}, "gray900");
  const gray700 = useThemeColor({}, "gray700");
  const gray600 = useThemeColor({}, "gray600");
  const gray500 = useThemeColor({}, "gray500");
  const gray400 = useThemeColor({}, "gray400");
  const primary = useThemeColor({}, "primary");
  const background = useThemeColor({}, "background");
  const success = useThemeColor({}, "success");
  const errorColor = useThemeColor({}, "error");

  const formatTime = useCallback((timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  const fetchConversations = useCallback(
    async (providedToken?: string | null) => {
      try {
        setLoading(true);
        const token = providedToken || (await storage.getToken());
        if (!token) return;

        // Ensure socket is connected with token
        socketService.connect(token);

        const res = await apiService.getConversations(token);
        if (res.success && Array.isArray(res.data)) {
          // Transform API data to Component state format
          const formatted = res.data
            .filter((c: any) => c.user)
            .map((c: any) => {
              const userId = String(c.user.user_id).toLowerCase();
              const profileImage = c.user.profile_image;
              let avatar = "";

              if (profileImage) {
                if (profileImage.startsWith("http")) {
                  avatar = profileImage;
                } else {
                  const slash = profileImage.startsWith("/") ? "" : "/";
                  avatar = `${API_HOST}${slash}${profileImage}`;
                }
              } else {
                const name = encodeURIComponent(c.user.full_name || "Unknown");
                avatar = `https://ui-avatars.com/api/?name=${name}&background=random`;
              }

              return {
                id: userId,
                userId: userId,
                userName: c.user.full_name || "Unknown User",
                userAvatar: avatar,
                lastMessage: c.lastMessage?.message || "Start a conversation",
                lastMessageTime: c.lastMessage?.sent_at
                  ? formatTime(c.lastMessage.sent_at)
                  : "",
                unreadCount: 0,
                isOnline: c.user.is_online || false,
              };
            });
          setConversations(formatted);

          // Also track statuses in the map
          const statusMap: Record<string, boolean> = {};
          formatted.forEach((c) => {
            statusMap[c.userId] = c.isOnline;
            socketService.emit("get_user_status", { user_id: c.userId });
          });
          setUserStatuses(statusMap);

          setError(null);
        }
      } catch (e: any) {
        setError(e.message || "Failed to load conversations");
      } finally {
        setLoading(false);
      }
    },
    [formatTime],
  );

  const init = useCallback(async () => {
    const token = await storage.getToken();
    if (token) {
      try {
        const profile = await apiService.getMe(token);
        if (profile.success && profile.data) {
          setCurrentUserId(profile.data.user_id);
        }
      } catch (e) {
        console.error("Failed to get profile in init:", e);
      }
      // Fetch conversations and connect socket
      fetchConversations(token);
    }
  }, [fetchConversations]);

  useFocusEffect(
    useCallback(() => {
      init();
    }, [init]),
  );

  useEffect(() => {
    init();
  }, [init]);

  const activeConvData = useMemo(() => {
    const existing = conversations.find((c) => c.id === activeConversationId);
    if (existing) return existing;

    // Fallback for new chat initiated via otherUserId or props
    if (activeConversationId) {
      const name =
        propUserName ||
        (Array.isArray(paramUserName) ? paramUserName[0] : paramUserName);
      const avatarParam =
        propUserAvatar ||
        (Array.isArray(paramUserAvatar) ? paramUserAvatar[0] : paramUserAvatar);
      let userAvatar = "";

      if (avatarParam) {
        if (avatarParam.startsWith("http")) {
          userAvatar = avatarParam;
        } else {
          const slash = avatarParam.startsWith("/") ? "" : "/";
          userAvatar = `${API_HOST}${slash}${avatarParam}`;
        }
      } else {
        const nameParam = encodeURIComponent(name || "User");
        userAvatar = `https://ui-avatars.com/api/?name=${nameParam}&background=random`;
      }

      return {
        id: activeConversationId,
        userId: activeConversationId,
        userName: name || "Chat",
        userAvatar: userAvatar,
        lastMessage: "",
        lastMessageTime: "",
        unreadCount: 0,
        isOnline: userStatuses[activeConversationId] || false,
      };
    }
    return null;
  }, [
    activeConversationId,
    conversations,
    userStatuses,
    propUserName,
    propUserAvatar,
    paramUserName,
    paramUserAvatar,
  ]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) =>
      conv.userName.toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(String(initialConversationId).toLowerCase());
    }
  }, [initialConversationId]);

  useEffect(() => {
    // Socket listeners for real-time updates
    const handleNewMessage = (rawMsg: any) => {
      const msg: Message = {
        id: (rawMsg.id || rawMsg.chat_id || Date.now()).toString(),
        senderId: (rawMsg.sender_id || rawMsg.senderId)?.toString(),
        receiverId: (rawMsg.receiver_id || rawMsg.receiverId)?.toString(),
        text: rawMsg.message || rawMsg.text,
        timestamp:
          rawMsg.sent_at || rawMsg.timestamp || new Date().toISOString(),
        isRead: false,
      };

      const mSId = String(msg.senderId || "").toLowerCase();
      const mRId = String(msg.receiverId || "").toLowerCase();
      const curId = String(currentUserId || "").toLowerCase();
      const activeId = String(activeConversationId || "").toLowerCase();

      // Update conversations list
      setConversations((prev) => {
        const partnerId = mSId === curId ? mRId : mSId;
        const existing = prev.find(
          (c) => String(c.userId).toLowerCase() === partnerId,
        );

        if (existing) {
          return prev.map((c) =>
            String(c.userId).toLowerCase() === partnerId
              ? {
                  ...c,
                  lastMessage: msg.text || "Image",
                  lastMessageTime: "Just now",
                  unreadCount:
                    String(c.id).toLowerCase() === activeId
                      ? 0
                      : (c.unreadCount || 0) + 1,
                }
              : c,
          );
        }
        return prev;
      });

      // Show local notification ONLY if message is from another user (not the current user)
      // and we're not currently in that conversation
      const isFromOtherUser = mSId !== curId && mSId.length > 0;
      const isInActiveChat =
        activeId && (mSId === activeId || mRId === activeId);

      const isExpoGo =
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
        Constants.appOwnership === "expo";

      if (isFromOtherUser && !isInActiveChat) {
        if (!isExpoGo) {
          const Notifications = require("expo-notifications");
          Notifications.scheduleNotificationAsync({
            content: {
              title: `New message from ${rawMsg.sender_name || "User"}`,
              body: msg.text || "Are you available?",
              data: { senderId: msg.senderId },
            },
            trigger: null,
          });
        }
      }

      // Update active messages if message belongs to current chat
      if (activeId && (mSId === activeId || mRId === activeId)) {
        setMessages((prev) => {
          if (
            prev.some(
              (m) =>
                String(m.id).toLowerCase() === String(msg.id).toLowerCase(),
            )
          )
            return prev;
          return [...prev, msg];
        });
      }
    };

    const handleUserStatus = (data: any) => {
      const userId = data.userId || data.user_id || data.id;
      const online =
        data.online !== undefined
          ? data.online
          : data.is_online !== undefined
            ? data.is_online
            : data.status === "online" || data.status === true;

      if (!userId) return;

      const targetId = String(userId).toLowerCase();
      setUserStatuses((prev) => ({ ...prev, [targetId]: !!online }));
      setConversations((prev) =>
        prev.map((c) =>
          String(c.userId).toLowerCase() === targetId
            ? { ...c, isOnline: !!online }
            : c,
        ),
      );
    };

    socketService.on("new_message", handleNewMessage);
    socketService.on("user_status", handleUserStatus);
    socketService.on("presence", handleUserStatus);
    socketService.on("status_change", handleUserStatus);

    return () => {
      socketService.off("new_message", handleNewMessage);
      socketService.off("user_status", handleUserStatus);
      socketService.off("presence", handleUserStatus);
      socketService.off("status_change", handleUserStatus);
    };
  }, [activeConversationId, activeConvData, currentUserId]);

  useEffect(() => {
    if (!activeConversationId) return;

    // Fetch messages for active conversation
    const loadMessages = async () => {
      try {
        if (!activeConversationId) return;
        const token = await storage.getToken();
        if (!token) return;

        // Join the partner's room to receive status updates for them
        socketService.emit("join_room", activeConversationId);

        // Explicitly request user's current status
        socketService.emit("get_user_status", {
          user_id: activeConversationId,
        });

        const res = await apiService.getMessages(activeConversationId, token);
        if (res.success && Array.isArray(res.data)) {
          const formatted = res.data.map((m: any) => ({
            id: (m.id || m.chat_id || Date.now()).toString(),
            senderId: String(m.sender_id).toLowerCase(),
            receiverId: String(m.receiver_id).toLowerCase(),
            text: m.message,
            timestamp: m.sent_at,
            isRead: true,
          }));
          setMessages(formatted);
        }
      } catch (e) {
        console.error("Failed to load messages", e);
      }
    };

    loadMessages();

    // mark unread as read on open (UI-level)
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId ? { ...c, unreadCount: 0 } : c,
      ),
    );
  }, [activeConversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversationId) return;

    const text = messageInput.trim();
    const token = await storage.getToken();
    if (!token) return;

    try {
      const res = await apiService.sendMessage(
        activeConversationId,
        text,
        token,
      );
      if (res.success && res.data) {
        const newMsg = res.data;
        const formattedMsg = {
          id: (newMsg.chat_id || newMsg.id || Date.now()).toString(),
          senderId: String(newMsg.sender_id).toLowerCase(),
          receiverId: String(newMsg.receiver_id).toLowerCase(),
          text: newMsg.message,
          timestamp: newMsg.sent_at || new Date().toISOString(),
          isRead: false,
        };

        setMessages((prev) => {
          if (
            prev.some(
              (m) =>
                String(m.id).toLowerCase() ===
                String(formattedMsg.id).toLowerCase(),
            )
          ) {
            return prev;
          }
          return [...prev, formattedMsg];
        });
        setMessageInput("");
        // Also update conversation list last message
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === activeConversationId);
          if (exists) {
            return prev.map((c) =>
              c.id === activeConversationId
                ? {
                    ...c,
                    lastMessage: text,
                    lastMessageTime: formatTime(
                      newMsg.sent_at || new Date().toISOString(),
                    ),
                  }
                : c,
            );
          } else {
            // Add as new conversation to list
            return [
              {
                id: activeConversationId!,
                userId: activeConversationId!,
                userName: activeConvData?.userName || "User",
                userAvatar:
                  activeConvData?.userAvatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(activeConvData?.userName || "User")}&background=random`,
                lastMessage: text,
                lastMessageTime: formatTime(
                  newMsg.sent_at || new Date().toISOString(),
                ),
                unreadCount: 0,
                isOnline: false,
              },
              ...prev,
            ];
          }
        });
      }
    } catch (e: any) {
      console.error("Failed to send message", e);
      Alert.alert("Error", e.message || "Failed to send message");
    }
  };

  const ConversationRow = ({ item }: { item: Conversation }) => {
    const active = item.id === activeConversationId;
    return (
      <TouchableOpacity
        style={[
          styles.convRow,
          active ? { backgroundColor: "#f8fafc" } : null,
          { backgroundColor: background },
        ]}
        activeOpacity={0.85}
        onPress={() => {
          setActiveConversationId(item.id);
          onOpenConversation?.(item);
        }}
      >
        <View style={styles.convAvatarWrap}>
          <Image source={{ uri: item.userAvatar }} style={styles.convAvatar} />
          {item.isOnline ? (
            <View style={[styles.onlineDot, { borderColor: background }]} />
          ) : null}
        </View>

        <View style={styles.convBody}>
          <View style={styles.convTop}>
            <ThemedText
              type="base"
              weight="bold"
              style={{ color: gray900, flex: 1 }}
              numberOfLines={1}
            >
              {item.userName}
            </ThemedText>
            <ThemedText
              type="xs"
              weight="semibold"
              style={{ color: gray500, marginLeft: 10 }}
            >
              {item.lastMessageTime}
            </ThemedText>
          </View>

          <View style={styles.convBottom}>
            <ThemedText
              type="sm"
              weight={item.unreadCount > 0 ? "bold" : "semibold"}
              style={{
                color: item.unreadCount > 0 ? gray900 : gray600,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {item.lastMessage}
            </ThemedText>
            {item.unreadCount > 0 ? (
              <View style={[styles.unreadBadge, { backgroundColor: primary }]}>
                <ThemedText
                  type="xs"
                  weight="semibold"
                  style={{ color: "white", textAlign: "center" }}
                >
                  {item.unreadCount}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const MessageBubble = ({ item }: { item: Message }) => {
    const sent =
      String(item.senderId || "").toLowerCase() ===
      String(currentUserId || "").toLowerCase();
    return (
      <View
        style={[
          styles.msgRow,
          sent ? styles.msgRowSent : styles.msgRowReceived,
        ]}
      >
        <View
          style={[
            styles.bubble,
            sent
              ? [styles.bubbleSent, { backgroundColor: primary }]
              : [
                  styles.bubbleReceived,
                  { backgroundColor: background, borderColor: "#e5e7eb" },
                ],
          ]}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.msgImage} />
          ) : null}
          {item.text ? (
            <ThemedText
              type="sm"
              weight="semibold"
              style={{ color: sent ? "#fff" : gray900, lineHeight: 18 }}
            >
              {item.text}
            </ThemedText>
          ) : null}

          <View style={styles.msgMeta}>
            <ThemedText
              type="xs"
              weight="semibold"
              style={{ color: sent ? "rgba(255,255,255,0.85)" : gray500 }}
            >
              {formatTime(item.timestamp)}
            </ThemedText>
            {sent ? (
              <Ionicons
                name={item.isRead ? "checkmark-done" : "checkmark"}
                size={14}
                color={item.isRead ? "#60a5fa" : "#9ca3af"}
                style={{ marginLeft: 6 }}
              />
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const showingChat = !!activeConversationId && !!activeConvData;

  const currentStatus = activeConversationId
    ? (userStatuses[activeConversationId.toLowerCase()] ??
      activeConvData?.isOnline)
    : false;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {!showingChat ? (
        <>
          {/* Conversations Header */}
          <View
            style={[
              styles.header,
              {
                paddingTop: Platform.OS === "ios" ? 10 : insets.top + 10,
                backgroundColor: background,
                borderBottomColor: "#e5e7eb",
              },
            ]}
          >
            <View style={styles.headerRow}>
              {onBack ? (
                <TouchableOpacity
                  onPress={onBack}
                  style={styles.iconBtn}
                  accessibilityLabel="Back"
                >
                  <Ionicons name="chevron-back" size={24} color={gray900} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}
              <ThemedText
                type="xl"
                weight="extrabold"
                style={{ color: gray900 }}
              >
                Messages
              </ThemedText>
              <View style={{ width: 40 }} />
            </View>

            <View style={[styles.searchRow, { backgroundColor: "#f3f4f6" }]}>
              <Ionicons name="search" size={18} color={gray500} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search conversations..."
                placeholderTextColor={gray400}
                style={[styles.searchInput, { color: gray900 }]}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {!!searchQuery && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.iconBtn}
                  accessibilityLabel="Clear"
                >
                  <Ionicons name="close" size={18} color={gray500} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Conversations List */}
          {error ? (
            <View style={styles.empty}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={errorColor}
              />
              <ThemedText
                type="base"
                weight="bold"
                style={{ color: gray900, marginTop: 12 }}
              >
                Oops!
              </ThemedText>
              <ThemedText
                type="sm"
                weight="semibold"
                style={{ color: gray500, marginTop: 6, textAlign: "center" }}
              >
                {error}
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.discoverBtn,
                  { backgroundColor: errorColor, marginTop: 20 },
                ]}
                onPress={() => fetchConversations()}
              >
                <ThemedText type="sm" weight="bold" style={{ color: "#fff" }}>
                  Retry Connection
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => <ConversationRow item={item} />}
              ItemSeparatorComponent={() => (
                <View style={[styles.sep, { backgroundColor: "#e5e7eb" }]} />
              )}
              contentContainerStyle={
                filteredConversations.length
                  ? styles.listContent
                  : styles.emptyWrap
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View
                    style={[styles.emptyIcon, { backgroundColor: "#f1f5f9" }]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={30}
                      color="#cbd5e1"
                    />
                  </View>
                  <ThemedText
                    type="base"
                    weight="bold"
                    style={{ color: gray900 }}
                  >
                    No conversations
                  </ThemedText>
                  <ThemedText
                    type="sm"
                    weight="semibold"
                    style={{
                      color: gray500,
                      marginTop: 6,
                      textAlign: "center",
                    }}
                  >
                    Start booking photographers to chat
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.discoverBtn, { backgroundColor: primary }]}
                    onPress={() => {
                      const router = require("expo-router").useRouter();
                      router.push("/Client/ExplorePhotographers");
                    }}
                  >
                    <ThemedText
                      type="sm"
                      weight="bold"
                      style={{ color: "#fff" }}
                    >
                      Discover Photographers
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      ) : (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          {/* Chat Header */}
          <View
            style={[
              styles.chatHeader,
              {
                paddingTop: Platform.OS === "ios" ? 10 : insets.top + 10,
                backgroundColor: background,
                borderBottomColor: "#e5e7eb",
              },
            ]}
          >
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                if (onBack) onBack();
                else setActiveConversationId(null);
              }}
              accessibilityLabel="Back to conversations"
            >
              <Ionicons name="chevron-back" size={24} color={gray900} />
            </TouchableOpacity>

            <Image
              source={{
                uri:
                  activeConvData?.userAvatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(activeConvData?.userName || "User")}&background=random`,
              }}
              style={styles.chatAvatar}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <ThemedText
                type="base"
                weight="bold"
                style={{ color: gray900 }}
                numberOfLines={1}
              >
                {activeConvData?.userName || "Chat"}
              </ThemedText>
              <ThemedText
                type="xs"
                weight="bold"
                style={{
                  color: currentStatus ? success : gray500,
                  marginTop: 2,
                }}
              >
                {currentStatus ? "Online" : "Offline"}
              </ThemedText>
            </View>

            <TouchableOpacity style={styles.iconBtn} accessibilityLabel="More">
              <Ionicons name="ellipsis-vertical" size={18} color={gray900} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={(r) => {
              messagesListRef.current = r;
            }}
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={(m, index) => `${m.id}-${m.timestamp}-${index}`}
            renderItem={({ item }) => <MessageBubble item={item} />}
            contentContainerStyle={styles.messagesContent}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListHeaderComponent={
              <View style={styles.dateDivider}>
                <ThemedText
                  type="xs"
                  weight="bold"
                  style={[
                    styles.dateDividerText,
                    { color: gray500, backgroundColor: "#f3f4f6" },
                  ]}
                >
                  Today
                </ThemedText>
              </View>
            }
            ListFooterComponent={
              isTyping ? (
                <View style={[styles.msgRow, styles.msgRowReceived]}>
                  <View
                    style={[
                      styles.bubble,
                      styles.bubbleReceived,
                      styles.typingBubble,
                      { backgroundColor: background, borderColor: "#e5e7eb" },
                    ]}
                  >
                    <View style={styles.typingDots}>
                      <View
                        style={[styles.dot, { backgroundColor: "#9ca3af" }]}
                      />
                      <View
                        style={[styles.dot, { backgroundColor: "#9ca3af" }]}
                      />
                      <View
                        style={[styles.dot, { backgroundColor: "#9ca3af" }]}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View />
              )
            }
            onContentSizeChange={() =>
              messagesListRef.current?.scrollToEnd({ animated: true })
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color="#e5e7eb"
                />
                <ThemedText
                  type="lg"
                  weight="bold"
                  style={{ color: gray700, marginTop: 16 }}
                >
                  No messages yet
                </ThemedText>
                <ThemedText
                  type="sm"
                  weight="semibold"
                  style={{
                    color: gray500,
                    marginTop: 8,
                    textAlign: "center",
                    paddingHorizontal: 40,
                  }}
                >
                  Send a message to start the conversation!
                </ThemedText>
              </View>
            }
          />

          {/* Input Area */}
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: background,
                borderTopColor: "#e5e7eb",
                paddingBottom:
                  Platform.OS === "ios" ? Math.max(insets.bottom, 12) : 12,
                marginBottom: 0,
              },
            ]}
          >
            <View style={[styles.inputWrap, { borderColor: "#e5e7eb" }]}>
              <TextInput
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="Type a message..."
                placeholderTextColor={gray400}
                style={[styles.input, { fontFamily: Typography.fontFamily }]}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendBtn,
                !messageInput.trim()
                  ? { backgroundColor: "#9ca3af" }
                  : { backgroundColor: primary },
              ]}
              onPress={handleSendMessage}
              disabled={!messageInput.trim()}
              accessibilityLabel="Send"
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
      {!activeConversationId && <ClientBottomNav />}
    </View>
  );
};

export default ClientMessages;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: { padding: 8 },
  searchRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  listContent: { paddingVertical: 10, paddingBottom: 100 },
  sep: { height: 1 },
  convRow: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row" },
  convAvatarWrap: { position: "relative", marginRight: 12 },
  convAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e5e7eb",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  convBody: { flex: 1, minWidth: 0, justifyContent: "center" },
  convTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  convBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  emptyWrap: { flexGrow: 1, padding: 16, paddingBottom: 100 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  chatContainer: { flex: 1 },
  chatHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  chatAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e5e7eb",
  },
  messagesContent: { paddingHorizontal: 12, paddingVertical: 12 },
  dateDivider: { alignItems: "center", marginBottom: 10 },
  dateDividerText: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  msgRow: { flexDirection: "row" },
  msgRowSent: { justifyContent: "flex-end" },
  msgRowReceived: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleSent: { borderTopRightRadius: 6 },
  bubbleReceived: { borderWidth: 1, borderTopLeftRadius: 6 },
  msgMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  msgImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#e5e7eb",
  },
  typingBubble: { paddingVertical: 12 },
  typingDots: { flexDirection: "row", alignItems: "center", columnGap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  inputBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    maxHeight: 110,
    minHeight: 40,
    color: "#111827",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  discoverBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
});
