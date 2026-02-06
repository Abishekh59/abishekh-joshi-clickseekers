import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClientBottomNav from '../../components/ClientBottomNav';
import { API_HOST, apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { storage } from '../../utils/storage';

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
  initialUserAvatar: propUserAvatar
}) => {
  const insets = useSafeAreaInsets();
  const { otherUserId, userName: paramUserName, userAvatar: paramUserAvatar } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId ? String(initialConversationId).toLowerCase() : (typeof otherUserId === 'string' ? otherUserId.toLowerCase() : null)
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const messagesListRef = useRef<FlatList<Message> | null>(null);

  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray600 = useThemeColor({}, 'gray600');
  const gray500 = useThemeColor({}, 'gray500');
  const gray400 = useThemeColor({}, 'gray400');
  const primary = useThemeColor({}, 'primary');
  const background = useThemeColor({}, 'background');
  const success = useThemeColor({}, 'success');
  const errorColor = useThemeColor({}, 'error');

  useEffect(() => {
    const init = async () => {
      const token = await storage.getToken();
      if (token) {
        try {
          const profile = await apiService.getMe(token);
          if (profile.success && profile.data) {
            setCurrentUserId(profile.data.user_id);
          }
        } catch (e) {
          console.error('Failed to load profile', e);
        }
      }
      fetchConversations();
    };
    init();
  }, []);

  useEffect(() => {
    if (otherUserId && typeof otherUserId === 'string') {
      setActiveConversationId(otherUserId.toLowerCase());
    }
  }, [otherUserId]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = await storage.getToken();
      if (!token) return;

      const res = await apiService.getConversations(token);
      if (res.success && Array.isArray(res.data)) {
        // Transform API data to Component state format
        const formatted = res.data
          .filter((c: any) => c.user)
          .map((c: any) => ({
            id: String(c.user.user_id).toLowerCase(), // We use the partner's userId as the conversation ID
            userId: String(c.user.user_id).toLowerCase(),
            userName: c.user.full_name || 'Unknown User',
            userAvatar: c.user.profile_image ? (c.user.profile_image.startsWith('http') ? c.user.profile_image : `${API_HOST}${c.user.profile_image.startsWith('/') ? '' : '/'}${c.user.profile_image}`) : 'https://via.placeholder.com/150',
            lastMessage: c.lastMessage?.message || 'Start a conversation',
            lastMessageTime: c.lastMessage?.sent_at ? formatTime(c.lastMessage.sent_at) : '',
            unreadCount: 0,
            isOnline: false
          }));
        setConversations(formatted);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const activeConvData = useMemo(() => {
    const existing = conversations.find((c) => c.id === activeConversationId);
    if (existing) return existing;

    // Fallback for new chat initiated via otherUserId or props
    if (activeConversationId) {
      const name = propUserName || (Array.isArray(paramUserName) ? paramUserName[0] : paramUserName);
      const avatar = propUserAvatar || (Array.isArray(paramUserAvatar) ? paramUserAvatar[0] : paramUserAvatar);

      return {
        id: activeConversationId,
        userId: activeConversationId,
        userName: name || 'Chat',
        userAvatar: avatar ? (avatar.startsWith('http') ? avatar : `${API_HOST}${avatar.startsWith('/') ? '' : '/'}${avatar}`) : 'https://via.placeholder.com/150',
        lastMessage: '',
        lastMessageTime: '',
        unreadCount: 0,
        isOnline: false
      };
    }
    return null;
  }, [activeConversationId, conversations, propUserName, propUserAvatar, paramUserName, paramUserAvatar]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) => conv.userName.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(String(initialConversationId).toLowerCase());
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (!currentUserId) return;

    // Socket listeners for real-time updates
    const handleNewMessage = (rawMsg: any) => {
      const msg: Message = {
        id: (rawMsg.id || rawMsg.chat_id || Date.now()).toString(),
        senderId: (rawMsg.sender_id || rawMsg.senderId)?.toString(),
        receiverId: (rawMsg.receiver_id || rawMsg.receiverId)?.toString(),
        text: rawMsg.message || rawMsg.text,
        timestamp: rawMsg.sent_at || rawMsg.timestamp || new Date().toISOString(),
        isRead: false
      };

      const mSId = String(msg.senderId || '').toLowerCase();
      const mRId = String(msg.receiverId || '').toLowerCase();
      const curId = String(currentUserId || '').toLowerCase();
      const activeId = String(activeConversationId || '').toLowerCase();

      // Update conversations list
      setConversations((prev) => {
        const partnerId = mSId === curId ? mRId : mSId;
        const existing = prev.find((c) => String(c.userId).toLowerCase() === partnerId);

        if (existing) {
          return prev.map((c) =>
            String(c.userId).toLowerCase() === partnerId
              ? {
                ...c,
                lastMessage: msg.text || 'Image',
                lastMessageTime: 'Just now',
                unreadCount: String(c.id).toLowerCase() === activeId ? 0 : (c.unreadCount || 0) + 1,
              }
              : c
          );
        }
        return prev;
      });

      // Update active messages if message belongs to current chat
      if (activeId && (mSId === activeId || mRId === activeId)) {
        setMessages((prev) => {
          if (prev.some(m => String(m.id).toLowerCase() === String(msg.id).toLowerCase())) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleUserStatus = ({ userId, online }: { userId: string; online: boolean }) => {
      const targetId = String(userId).toLowerCase();
      setConversations((prev) =>
        prev.map((c) => (String(c.userId).toLowerCase() === targetId ? { ...c, isOnline: online } : c))
      );
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('user_status', handleUserStatus);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('user_status', handleUserStatus);
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

        const res = await apiService.getMessages(activeConversationId, token);
        if (res.success && Array.isArray(res.data)) {
          const formatted = res.data.map((m: any) => ({
            id: (m.id || m.chat_id || Date.now()).toString(),
            senderId: String(m.sender_id).toLowerCase(),
            receiverId: String(m.receiver_id).toLowerCase(),
            text: m.message,
            timestamp: m.sent_at,
            isRead: true
          }));
          setMessages(formatted);
        }
      } catch (e) {
        console.error('Failed to load messages', e);
      }
    };

    loadMessages();

    // mark unread as read on open (UI-level)
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, [activeConversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversationId) return;

    const text = messageInput.trim();
    const token = await storage.getToken();
    if (!token) return;

    try {
      const res = await apiService.sendMessage(activeConversationId, text, token);
      if (res.success && res.data) {
        const newMsg = res.data;
        const formattedMsg = {
          id: (newMsg.id || newMsg.chat_id || Date.now()).toString(),
          senderId: String(newMsg.sender_id).toLowerCase(),
          receiverId: String(newMsg.receiver_id).toLowerCase(),
          text: newMsg.message,
          timestamp: newMsg.sent_at || new Date().toISOString(),
          isRead: false
        };
        setMessages(prev => [...prev, formattedMsg]);
        setMessageInput('');
        // Also update conversation list last message
        setConversations(prev => {
          const exists = prev.some(c => c.id === activeConversationId);
          if (exists) {
            return prev.map(c =>
              c.id === activeConversationId
                ? { ...c, lastMessage: text, lastMessageTime: formatTime(newMsg.sent_at || new Date().toISOString()) }
                : c
            );
          } else {
            // Add as new conversation to list
            return [{
              id: activeConversationId!,
              userId: activeConversationId!,
              userName: activeConvData?.userName || 'User',
              userAvatar: activeConvData?.userAvatar || '',
              lastMessage: text,
              lastMessageTime: formatTime(newMsg.sent_at || new Date().toISOString()),
              unreadCount: 0,
              isOnline: false
            }, ...prev];
          }
        });
      }
    } catch (e: any) {
      console.error('Failed to send message', e);
      Alert.alert('Error', e.message || 'Failed to send message');
    }
  };

  const ConversationRow = ({ item }: { item: Conversation }) => {
    const active = item.id === activeConversationId;
    return (
      <TouchableOpacity
        style={[styles.convRow, active ? { backgroundColor: '#f8fafc' } : null, { backgroundColor: background }]}
        activeOpacity={0.85}
        onPress={() => {
          setActiveConversationId(item.id);
          onOpenConversation?.(item);
        }}
      >
        <View style={styles.convAvatarWrap}>
          <Image source={{ uri: item.userAvatar }} style={styles.convAvatar} />
          {item.isOnline ? <View style={[styles.onlineDot, { borderColor: background }]} /> : null}
        </View>

        <View style={styles.convBody}>
          <View style={styles.convTop}>
            <ThemedText type="base" weight="bold" style={{ color: gray900, flex: 1 }} numberOfLines={1}>
              {item.userName}
            </ThemedText>
            <ThemedText type="xs" weight="semibold" style={{ color: gray500, marginLeft: 10 }}>
              {item.lastMessageTime}
            </ThemedText>
          </View>

          <View style={styles.convBottom}>
            <ThemedText
              type="sm"
              weight={item.unreadCount > 0 ? "bold" : "semibold"}
              style={{ color: item.unreadCount > 0 ? gray900 : gray600, flex: 1 }}
              numberOfLines={1}
            >
              {item.lastMessage}
            </ThemedText>
            {item.unreadCount > 0 ? (
              <View style={[styles.unreadBadge, { backgroundColor: primary }]}>
                <ThemedText type="xs" weight="bold" style={{ color: '#fff' }}>{item.unreadCount}</ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const MessageBubble = ({ item }: { item: Message }) => {
    const sent = String(item.senderId || '').toLowerCase() === String(currentUserId || '').toLowerCase();
    return (
      <View style={[styles.msgRow, sent ? styles.msgRowSent : styles.msgRowReceived]}>
        <View style={[
          styles.bubble,
          sent ? [styles.bubbleSent, { backgroundColor: primary }]
            : [styles.bubbleReceived, { backgroundColor: background, borderColor: '#e5e7eb' }]
        ]}>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.msgImage} /> : null}
          {item.text ? (
            <ThemedText
              type="sm"
              weight="semibold"
              style={{ color: sent ? '#fff' : gray900, lineHeight: 18 }}
            >
              {item.text}
            </ThemedText>
          ) : null}

          <View style={styles.msgMeta}>
            <ThemedText
              type="xs"
              weight="semibold"
              style={{ color: sent ? 'rgba(255,255,255,0.85)' : gray500 }}
            >
              {formatTime(item.timestamp)}
            </ThemedText>
            {sent ? (
              <Ionicons
                name={item.isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.isRead ? '#60a5fa' : '#9ca3af'}
                style={{ marginLeft: 6 }}
              />
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const showingChat = !!activeConversationId && !!activeConvData;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {!showingChat ? (
        <>
          {/* Conversations Header */}
          <View style={[styles.header, {
            paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 10,
            backgroundColor: background,
            borderBottomColor: '#e5e7eb'
          }]}>
            <View style={styles.headerRow}>
              {onBack ? (
                <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityLabel="Back">
                  <Ionicons name="chevron-back" size={24} color={gray900} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}
              <ThemedText type="xl" weight="extrabold" style={{ color: gray900 }}>Messages</ThemedText>
              <View style={{ width: 40 }} />
            </View>

            <View style={[styles.searchRow, { backgroundColor: '#f3f4f6' }]}>
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
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.iconBtn} accessibilityLabel="Clear">
                  <Ionicons name="close" size={18} color={gray500} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Conversations List */}
          {error ? (
            <View style={styles.empty}>
              <Ionicons name="alert-circle-outline" size={48} color={errorColor} />
              <ThemedText type="base" weight="bold" style={{ color: gray900, marginTop: 12 }}>Oops!</ThemedText>
              <ThemedText type="sm" weight="semibold" style={{ color: gray500, marginTop: 6, textAlign: 'center' }}>{error}</ThemedText>
              <TouchableOpacity
                style={[styles.discoverBtn, { backgroundColor: errorColor, marginTop: 20 }]}
                onPress={() => fetchConversations()}
              >
                <ThemedText type="sm" weight="bold" style={{ color: '#fff' }}>Retry Connection</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => <ConversationRow item={item} />}
              ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: '#e5e7eb' }]} />}
              contentContainerStyle={filteredConversations.length ? styles.listContent : styles.emptyWrap}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View style={[styles.emptyIcon, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={30} color="#cbd5e1" />
                  </View>
                  <ThemedText type="base" weight="bold" style={{ color: gray900 }}>No conversations</ThemedText>
                  <ThemedText type="sm" weight="semibold" style={{ color: gray500, marginTop: 6, textAlign: 'center' }}>
                    Start booking photographers to chat
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.discoverBtn, { backgroundColor: primary }]}
                    onPress={() => {
                      const router = require('expo-router').useRouter();
                      router.push('/Client/ExplorePhotographers');
                    }}
                  >
                    <ThemedText type="sm" weight="bold" style={{ color: '#fff' }}>Discover Photographers</ThemedText>
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Chat Header */}
          <View style={[styles.chatHeader, {
            paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 10,
            backgroundColor: background,
            borderBottomColor: '#e5e7eb'
          }]}>
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

            <Image source={{ uri: activeConvData?.userAvatar || 'https://via.placeholder.com/150' }} style={styles.chatAvatar} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <ThemedText type="base" weight="bold" style={{ color: gray900 }} numberOfLines={1}>
                {activeConvData?.userName || 'Chat'}
              </ThemedText>
              <ThemedText
                type="xs"
                weight="bold"
                style={{ color: activeConvData?.isOnline ? success : gray500, marginTop: 2 }}
              >
                {activeConvData?.isOnline ? 'Online' : 'Offline'}
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
                <ThemedText type="xs" weight="bold" style={[styles.dateDividerText, { color: gray500, backgroundColor: '#f3f4f6' }]}>
                  Today
                </ThemedText>
              </View>
            }
            ListFooterComponent={
              isTyping ? (
                <View style={[styles.msgRow, styles.msgRowReceived]}>
                  <View style={[styles.bubble, styles.bubbleReceived, styles.typingBubble, { backgroundColor: background, borderColor: '#e5e7eb' }]}>
                    <View style={styles.typingDots}>
                      <View style={[styles.dot, { backgroundColor: '#9ca3af' }]} />
                      <View style={[styles.dot, { backgroundColor: '#9ca3af' }]} />
                      <View style={[styles.dot, { backgroundColor: '#9ca3af' }]} />
                    </View>
                  </View>
                </View>
              ) : (
                <View />
              )
            }
            onContentSizeChange={() => messagesListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={48} color="#e5e7eb" />
                <ThemedText type="lg" weight="bold" style={{ color: gray700, marginTop: 16 }}>No messages yet</ThemedText>
                <ThemedText type="sm" weight="semibold" style={{ color: gray500, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
                  Send a message to start the conversation!
                </ThemedText>
              </View>
            }
          />

          {/* Input Area */}
          <View style={[styles.inputBar, { backgroundColor: background, borderTopColor: '#e5e7eb' }]}>
            <View style={[styles.inputWrap, { borderColor: '#e5e7eb' }]}>
              <TextInput
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="Type a message..."
                placeholderTextColor={gray400}
                style={styles.input}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendBtn,
                !messageInput.trim() ? { backgroundColor: '#9ca3af' } : { backgroundColor: primary }
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
  container: { flex: 1, paddingBottom: 85 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { padding: 8 },
  searchRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  listContent: { paddingVertical: 10 },
  sep: { height: 1 },
  convRow: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row' },
  convAvatarWrap: { position: 'relative', marginRight: 12 },
  convAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e5e7eb' },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
  },
  convBody: { flex: 1, minWidth: 0, justifyContent: 'center' },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  emptyWrap: { flexGrow: 1, padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  chatContainer: { flex: 1 },
  chatHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#e5e7eb' },
  messagesContent: { paddingHorizontal: 12, paddingVertical: 12 },
  dateDivider: { alignItems: 'center', marginBottom: 10 },
  dateDividerText: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  msgRow: { flexDirection: 'row' },
  msgRowSent: { justifyContent: 'flex-end' },
  msgRowReceived: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleSent: { borderTopRightRadius: 6 },
  bubbleReceived: { borderWidth: 1, borderTopLeftRadius: 6 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 6 },
  msgImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 8, backgroundColor: '#e5e7eb' },
  typingBubble: { paddingVertical: 12 },
  typingDots: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  inputBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginBottom: Platform.OS === 'ios' ? 60 : 0,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    fontSize: 14,
    fontWeight: '700',
    maxHeight: 110,
    minHeight: 40,
    color: '#111827',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  discoverBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
});
