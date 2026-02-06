import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SavedPostsProps {
  onBack?: () => void;
  onNavigate?: (screen: string, data?: any) => void;
}

interface Comment {
  id: string;
  username: string;
  comment: string;
  date: string;
}

interface Post {
  id: number;
  photographerName: string;
  photographerUsername: string;
  photographerAvatar: string; // initials in original
  category: string;
  location: string;
  image: string;
  caption: string;
  likes: number;
  isLiked: boolean;
  likedBy: string[];
  comments: Comment[];
  date: string;
}

export default function SavedPosts({ onBack, onNavigate }: SavedPostsProps) {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([
    {
      id: 1,
      photographerName: 'Rajesh Sharma',
      photographerUsername: 'rajesh_sharma_photography',
      photographerAvatar: 'RS',
      category: 'Wedding',
      location: 'Kathmandu, Nepal',
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      caption: 'Beautiful wedding ceremony at the historic Patan Durbar Square. What a magical day!',
      likes: 234,
      isLiked: false,
      likedBy: ['aashma.dhimal', 'ram_thapa', 'sita_sharma'],
      comments: [
        { id: 'c1', username: 'aashma.dhimal', comment: 'Absolutely stunning!', date: '2h' },
        { id: 'c2', username: 'ram_thapa', comment: 'Great composition!', date: '1h' },
      ],
      date: '2 hours ago',
    },
    {
      id: 2,
      photographerName: 'Maya Gurung',
      photographerUsername: 'maya_lens',
      photographerAvatar: 'MG',
      category: 'Fashion',
      location: 'Thamel, Kathmandu',
      image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800',
      caption: 'Fashion editorial shoot for local designer. Love working with creative minds!',
      likes: 312,
      isLiked: false,
      likedBy: ['fashion_nepal', 'style_icon', 'designer_123'],
      comments: [
        { id: 'c4', username: 'fashion_nepal', comment: 'This is fire!', date: '5h' },
        { id: 'c5', username: 'style_icon', comment: 'Absolutely love this!', date: '4h' },
      ],
      date: '8 hours ago',
    },
    {
      id: 3,
      photographerName: 'Sita Karki',
      photographerUsername: 'sita_travels',
      photographerAvatar: 'SK',
      category: 'Travel',
      location: 'Annapurna Base Camp',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      caption: 'Sunrise at the Himalayas. This never gets old! #Nepal #Mountains',
      likes: 456,
      isLiked: false,
      likedBy: ['travel_nepal', 'wanderlust', 'mountain_lover'],
      comments: [
        { id: 'c7', username: 'travel_nepal', comment: 'Breathtaking!', date: '12h' },
        { id: 'c8', username: 'wanderlust', comment: 'Need to visit this place!', date: '11h' },
      ],
      date: '1 day ago',
    },
  ]);

  const [showCommentsForPost, setShowCommentsForPost] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  const savedCountText = useMemo(() => `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`, [posts.length]);

  const handleLike = (postId: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
          : post
      )
    );
  };

  const toggleComments = (postId: number) => {
    setShowCommentsForPost((prev) => (prev === postId ? null : postId));
  };

  const handleAddComment = (postId: number) => {
    const text = commentText.trim();
    if (!text) return;

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
            ...post,
            comments: [
              ...post.comments,
              { id: `c${Date.now()}`, username: 'you', comment: text, date: 'Just now' },
            ],
          }
          : post
      )
    );

    setCommentText('');
  };

  const removeBookmark = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (showCommentsForPost === postId) setShowCommentsForPost(null);
    setCommentText('');
  };

  const PostCard = ({ item: post }: { item: Post }) => {
    const commentsOpen = showCommentsForPost === post.id;

    return (
      <View style={styles.post}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.postAvatar}
            activeOpacity={0.85}
            onPress={() => onNavigate?.('client-photographer-profile', { photographerId: post.id })}
          >
            <View style={styles.postAvatarInner}>
              <Text style={styles.postAvatarText}>{post.photographerAvatar}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.postInfo}
            activeOpacity={0.85}
            onPress={() => onNavigate?.('client-photographer-profile', { photographerId: post.id })}
          >
            <View style={styles.usernameRow}>
              <Text style={styles.username} numberOfLines={1}>
                {post.photographerUsername}
              </Text>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{post.category}</Text>
              </View>
            </View>
            <Text style={styles.location} numberOfLines={1}>
              {post.location}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} accessibilityLabel="Post menu">
            <Ionicons name="ellipsis-vertical" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <View style={styles.postImageWrap}>
          <Image source={{ uri: post.image }} style={styles.postImage} />
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => handleLike(post.id)} style={styles.actionBtn} activeOpacity={0.85}>
            <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={22} color={post.isLiked ? '#ed4956' : '#111827'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => toggleComments(post.id)} style={styles.actionBtn} activeOpacity={0.85}>
            <Ionicons name="chatbubble-outline" size={22} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => removeBookmark(post.id)} style={[styles.actionBtn, { marginLeft: 'auto' }]} activeOpacity={0.85}>
            <Ionicons name="bookmark" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Likes */}
        {post.likedBy?.length ? (
          <View style={styles.likesRow}>
            <View style={styles.likedByAvatars}>
              {post.likedBy.slice(0, 3).map((u, idx) => (
                <View key={`${u}-${idx}`} style={[styles.likedAvatar, idx ? styles.likedAvatarOverlap : null]}>
                  <Text style={styles.likedAvatarText}>{u.charAt(0).toUpperCase()}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.likesText}>{post.likes.toLocaleString()} likes</Text>
          </View>
        ) : null}

        {/* Caption */}
        <Text style={styles.caption}>
          <Text style={styles.captionUser}>{post.photographerUsername} </Text>
          {post.caption}
        </Text>

        {/* View comments */}
        {post.comments.length > 0 && !commentsOpen ? (
          <TouchableOpacity onPress={() => toggleComments(post.id)} activeOpacity={0.85}>
            <Text style={styles.viewComments}>View all {post.comments.length} comments</Text>
          </TouchableOpacity>
        ) : null}

        {/* Comments */}
        {commentsOpen && post.comments.length > 0 ? (
          <View style={styles.commentsBox}>
            {post.comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{c.username.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentText}>
                    <Text style={styles.commentUser}>{c.username} </Text>
                    {c.comment}
                  </Text>
                  <Text style={styles.commentMeta}>{c.date}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Date */}
        <Text style={styles.postDate}>{post.date.toUpperCase()}</Text>

        {/* Add Comment */}
        <View style={styles.commentInputRow}>
          <TextInput
            value={commentsOpen ? commentText : ''}
            onChangeText={setCommentText}
            onFocus={() => setShowCommentsForPost(post.id)}
            placeholder="Add a comment..."
            placeholderTextColor="#9ca3af"
            style={styles.commentInput}
          />
          <TouchableOpacity
            onPress={() => handleAddComment(post.id)}
            disabled={!commentText.trim() || !commentsOpen}
            activeOpacity={0.85}
            style={[styles.postBtn, (!commentText.trim() || !commentsOpen) ? styles.postBtnDisabled : null]}
          >
            <Text style={[styles.postBtnText, (!commentText.trim() || !commentsOpen) ? styles.postBtnTextDisabled : null]}>
              Post
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityLabel="Back" activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Saved Posts</Text>
        <Text style={styles.count}>{savedCountText}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={posts}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <PostCard item={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={posts.length ? styles.listContent : styles.emptyWrap}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="bookmark-outline" size={34} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No Saved Posts</Text>
              <Text style={styles.emptyText}>
                Start exploring and bookmark your favorite photos to see them here!
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },

  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  iconBtn: { padding: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '900', color: '#111827' },
  count: { color: '#9ca3af', fontWeight: '800' },

  listContent: { paddingVertical: 12 },
  emptyWrap: { flexGrow: 1, padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  emptyText: { marginTop: 6, textAlign: 'center', color: '#6b7280', fontWeight: '700' },

  post: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },

  postHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, columnGap: 10 },
  postAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    padding: 2,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarInner: { width: '100%', height: '100%', borderRadius: 16, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  postAvatarText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  postInfo: { flex: 1 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  username: { color: '#111827', fontWeight: '900', fontSize: 13, maxWidth: '75%' },
  categoryPill: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryPillText: { fontSize: 11, fontWeight: '800', color: '#111827' },
  location: { marginTop: 2, color: '#9ca3af', fontWeight: '700', fontSize: 12 },

  postImageWrap: { width: '100%', aspectRatio: 1, backgroundColor: '#f3f4f6' },
  postImage: { width: '100%', height: '100%' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, columnGap: 14 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 4 },

  likesRow: { paddingHorizontal: 12, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  likedByAvatars: { flexDirection: 'row', alignItems: 'center' },
  likedAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#2563eb', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  likedAvatarOverlap: { marginLeft: -8 },
  likedAvatarText: { color: '#fff', fontWeight: '900', fontSize: 10 },
  likesText: { color: '#111827', fontWeight: '900' },

  caption: { paddingHorizontal: 12, paddingBottom: 6, color: '#111827', fontWeight: '700', lineHeight: 18 },
  captionUser: { fontWeight: '900' },

  viewComments: { paddingHorizontal: 12, paddingBottom: 6, color: '#9ca3af', fontWeight: '800' },

  commentsBox: { paddingHorizontal: 12, paddingBottom: 6 },
  commentRow: { flexDirection: 'row', columnGap: 10, marginBottom: 10 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  commentText: { color: '#111827', fontWeight: '700', lineHeight: 18 },
  commentUser: { fontWeight: '900' },
  commentMeta: { marginTop: 2, color: '#9ca3af', fontWeight: '800', fontSize: 11 },

  postDate: { paddingHorizontal: 12, paddingBottom: 10, color: '#9ca3af', fontWeight: '800', fontSize: 11 },

  commentInputRow: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  commentInput: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111827' },
  postBtn: { paddingVertical: 6, paddingHorizontal: 6 },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#2563eb', fontWeight: '900' },
  postBtnTextDisabled: { color: '#9ca3af' },
});