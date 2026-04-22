import { ThemedText } from "@/components/themed-text";
import { Typography } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
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
// notifications will be dynamically required below to avoid Expo Go SDK warnings

import Constants, { ExecutionEnvironment } from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  message?: string;
  imageUrl?: string;
  timestamp: string;
  isRead: boolean;
}

type Props = {
  onBack?: () => void;
  onOpenChat?: (conversation: Conversation) => void;
};

export default function PhotographerChat({ onBack, onOpenChat }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
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

  const formatTime = useCallback((timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  const fetchConversations = useCallback(
    async (providedToken?: string | null, showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const token = providedToken || (await storage.getToken());
        if (!token) return;

        // Ensure socket is connected with token
        socketService.connect(token);

        const res = await apiService.getConversations(token);
        if (res.success && Array.isArray(res.data)) {
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
                const name = encodeURIComponent(c.user.full_name || "User");
                avatar = `https://ui-avatars.com/api/?name=${name}&background=random`;
              }

              return {
                id: userId,
                userId: userId,
                userName: c.user.full_name || "Unknown User",
                userAvatar: avatar,
                lastMessage: c.lastMessage?.message || "No messages yet",
                lastMessageTime: c.lastMessage?.sent_at
                  ? formatTime(c.lastMessage.sent_at)
                  : "",
                unreadCount: 0,
                isOnline: c.user.is_online ?? false,
              };
            });
          setConversations(formatted);

          // Populate status map
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
        if (showLoading) setLoading(false);
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
        console.error("Failed to load profile", e);
      }
      // Ensure socket is connected with token after profile is loaded
      socketService.connect(token);
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

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      try {
        const token = await storage.getToken();
        if (!token) return;

        const targetId = String(selectedConversation.userId).toLowerCase();
        // Join the partner's room to receive status updates for them
        socketService.emit("join_room", targetId);

        // Explicitly request user's current status
        socketService.emit("get_user_status", { user_id: targetId });

        const res = await apiService.getMessages(targetId, token);
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
  }, [selectedConversation]);

  // Socket.io listeners for real-time updates
  useEffect(() => {
    const handleNewMessage = (rawMsg: any) => {
      const msg: Message = {
        id: (rawMsg.id || rawMsg.chat_id || Date.now()).toString(),
        senderId: (rawMsg.sender_id || rawMsg.senderId)
          ?.toString()
          .toLowerCase(),
        receiverId: (rawMsg.receiver_id || rawMsg.receiverId)
          ?.toString()
          .toLowerCase(),
        text: rawMsg.message || rawMsg.text,
        timestamp:
          rawMsg.sent_at || rawMsg.timestamp || new Date().toISOString(),
        isRead: false,
      };
      const mSId = String(msg.senderId || "").toLowerCase();
      const mRId = String(msg.receiverId || "").toLowerCase();
      const curId = String(currentUserId || "").toLowerCase();
      const selectedId = String(
        selectedConversation?.userId || "",
      ).toLowerCase();

      // Show local notification ONLY if message is from another user (not the current user)
      // and we're not currently in that conversation
      const isFromOtherUser = mSId !== curId && mSId.length > 0;
      const isInActiveChat =
        selectedId && (mSId === selectedId || mRId === selectedId);

      const isExpoGo =
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
        Constants.appOwnership === "expo";

      if (isFromOtherUser && !isInActiveChat) {
        if (!isExpoGo) {
          const Notifications = require("expo-notifications");
          Notifications.scheduleNotificationAsync({
            content: {
              title: `New message from ${rawMsg.sender_name || "Client"}`,
              body: msg.text || "Are you available?",
              data: { senderId: msg.senderId },
            },
            trigger: null,
          });
        }
      }

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
                    String(c.userId).toLowerCase() === selectedId
                      ? 0
                      : (c.unreadCount || 0) + 1,
                }
              : c,
          );
        } else {
          // New conversation - refresh the list
          fetchConversations(null, false);
          return prev;
        }
      });

      // Update active messages if message belongs to current chat
      if (selectedId && (mSId === selectedId || mRId === selectedId)) {
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
  }, [currentUserId, selectedConversation?.userId, fetchConversations]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      (c.userName + " " + c.lastMessage).toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const text = messageInput.trim();
    const token = await storage.getToken();
    if (!token) return;

    try {
      const targetId = String(selectedConversation.userId).toLowerCase();
      const res = await apiService.sendMessage(targetId, text, token);
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

        // Update conversation list
        setConversations((prev) =>
          prev.map((c) =>
            String(c.userId).toLowerCase() === targetId
              ? {
                  ...c,
                  lastMessage: text,
                  lastMessageTime: formatTime(
                    newMsg.sent_at || new Date().toISOString(),
                  ),
                }
              : c,
          ),
        );
      }
    } catch (e: any) {
      console.error("Failed to send message", e);
      Alert.alert("Error", e.message || "Failed to send message");
    }
  };

  const renderConversationItem = useCallback(
    ({ item: conversation }: { item: Conversation }) => (
      <TouchableOpacity
        style={[styles.chatCard, { backgroundColor: background }]}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedConversation(conversation);
          onOpenChat?.(conversation);
        }}
      >
        <View style={styles.chatContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: conversation.userAvatar }}
              style={styles.avatar}
            />
            {conversation.isOnline && (
              <View
                style={[styles.onlineIndicator, { backgroundColor: success }]}
              />
            )}
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <ThemedText
                type="base"
                weight="semibold"
                style={{ color: gray900, flex: 1 }}
                numberOfLines={1}
              >
                {conversation.userName}
              </ThemedText>
              <ThemedText type="xs" style={{ color: gray500, marginLeft: 8 }}>
                {conversation.lastMessageTime}
              </ThemedText>
            </View>

            <View style={styles.chatFooter}>
              <ThemedText
                type="sm"
                style={{ color: gray600, flex: 1 }}
                numberOfLines={1}
              >
                {conversation.lastMessage}
              </ThemedText>

              {conversation.unreadCount > 0 && (
                <View
                  style={[styles.unreadBadge, { backgroundColor: primary }]}
                >
                  <ThemedText
                    type="xs"
                    weight="semibold"
                    style={{ color: "white", textAlign: "center" }}
                  >
                    {conversation.unreadCount}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [onOpenChat, gray900, gray500, gray600, primary, background, success],
  );

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

  const selectedId = selectedConversation
    ? String(selectedConversation.userId).toLowerCase()
    : null;
  const currentStatus = selectedId
    ? (userStatuses[selectedId] ?? selectedConversation?.isOnline)
    : false;

  // Show chat view if a conversation is selected
  if (selectedConversation) {
    return (
      <View style={[styles.container, { backgroundColor: background }]}>
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          {/* Chat Header */}
          <View
            style={[
              styles.chatHeaderView,
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
                setSelectedConversation(null);
                setMessages([]);
                fetchConversations();
              }}
              accessibilityLabel="Back to conversations"
            >
              <Ionicons name="chevron-back" size={24} color={gray900} />
            </TouchableOpacity>

            <Image
              source={{ uri: selectedConversation.userAvatar }}
              style={styles.chatAvatar}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <ThemedText
                type="base"
                weight="bold"
                style={{ color: gray900 }}
                numberOfLines={1}
              >
                {selectedConversation.userName || "Chat"}
              </ThemedText>
              <ThemedText
                type="xs"
                weight="bold"
                style={{ color: currentStatus ? success : gray500 }}
              >
                {currentStatus ? "Online" : "Offline"}
              </ThemedText>
            </View>

            <TouchableOpacity style={styles.iconBtn} accessibilityLabel="More">
              <Ionicons name="ellipsis-vertical" size={18} color={gray900} />
            </TouchableOpacity>
          </View>

          {/* Messages List */}
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
              { backgroundColor: background, borderTopColor: "#e5e7eb" },
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
      </View>
    );
  }

  // Show conversations list
  return (
    <View style={[styles.container, { backgroundColor: "#f3f4f6" }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "ios" ? 10 : insets.top + 12,
            backgroundColor: background,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={styles.iconButton}
                accessibilityLabel="Back"
              >
                <Ionicons name="chevron-back" size={24} color={gray900} />
              </TouchableOpacity>
            ) : null}
            <ThemedText type="2xl" weight="bold" style={{ color: gray900 }}>
              Messages
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            accessibilityLabel="Search"
            onPress={() => {
              // Search is always visible below
            }}
          >
            <Ionicons name="search" size={22} color={gray600} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchRow, { backgroundColor: "#f3f4f6" }]}>
          <Ionicons name="search" size={18} color={gray500} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search chats"
            placeholderTextColor={gray400}
            style={[styles.searchInput, { color: gray900 }]}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Chat List */}
      {loading && conversations.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primary} />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <ThemedText
            type="base"
            weight="semibold"
            style={{ color: "#dc2626", marginTop: 16 }}
          >
            {error}
          </ThemedText>
          <TouchableOpacity
            style={[
              styles.discoverBtn,
              { backgroundColor: "#dc2626", marginTop: 20 },
            ]}
            onPress={() => fetchConversations()}
          >
            <ThemedText type="sm" weight="extrabold" style={{ color: "white" }}>
              Retry Connection
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={60} color="#dbdbdb" />
              <ThemedText
                type="base"
                weight="semibold"
                style={{ color: gray400, marginTop: 16 }}
              >
                No messages yet
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
    marginRight: 6,
  },
  iconBtn: {
    padding: 8,
  },
  searchRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  chatCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  chatContent: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e5e7eb",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "white",
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    flex: 1,
    paddingTop: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  discoverBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  // Chat view styles
  chatContainer: {
    flex: 1,
  },
  chatHeaderView: {
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
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateDivider: {
    alignItems: "center",
    marginBottom: 10,
  },
  dateDividerText: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  msgRow: {
    flexDirection: "row",
  },
  msgRowSent: {
    justifyContent: "flex-end",
  },
  msgRowReceived: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleSent: {
    borderTopRightRadius: 6,
  },
  bubbleReceived: {
    borderWidth: 1,
    borderTopLeftRadius: 6,
  },
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
  inputBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    marginBottom: Platform.OS === "ios" ? 12 : 12,
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
});
