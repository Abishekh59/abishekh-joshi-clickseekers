import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import ClientBottomNav from '../../components/ClientBottomNav';
import LogoLoader from '../../components/LogoLoader';
import { API_HOST, apiService } from '../../services/api';
import { socketService } from '../../services/socket';

interface ExplorePhotographersProps {
  onSelectPhotographer?: (photographer: any) => void;
  onBack?: () => void;
  onNavigate?: (screen: string, data?: any) => void;
}

const toAbsoluteImageUrl = (img: { image_url?: string | null; image_id: number }) => {
  if (img?.image_url && img.image_url.trim() !== '') {
    if (img.image_url.startsWith('http://') || img.image_url.startsWith('https://')) return img.image_url;
    const path = img.image_url.startsWith('/') ? img.image_url : `/${img.image_url}`;
    return `${API_HOST}${path}`;
  }
  // If we have an image_id but no image_url, use the fallback endpoint
  if (img?.image_id) {
    return `${API_HOST}/api/photographer/portfolio/image/${img.image_id}`;
  }
  return null;
};

const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const AspectRatioMasonryCard = ({ item, isLeft, favorites, bookmarkedPosts, toggleFavorite, toggleBookmark, setSelectedDetailImage, router }: any) => {
  const [aspectRatio, setAspectRatio] = useState(1);
  const featuredImage = item.recent_portfolio_images?.[0];
  const categoryName = featuredImage?.portfolio?.category?.category_name || 'Photographer';
  const liked = favorites.includes(item.user_id);
  const saved = bookmarkedPosts.includes(item.user_id);
  const profileImage = item.profile_image?.trim() ? (item.profile_image.startsWith('http') ? item.profile_image : `${API_HOST}${item.profile_image.startsWith('/') ? '' : '/'}${item.profile_image}`) : null;
  const imageUrl = featuredImage ? toAbsoluteImageUrl(featuredImage) : null;

  const gray900 = useThemeColor({}, 'gray900');
  const gray600 = useThemeColor({}, 'gray600');
  const gray500 = useThemeColor({}, 'gray500');
  const gray400 = useThemeColor({}, 'gray400');
  const primary = useThemeColor({}, 'primary');

  useEffect(() => {
    if (imageUrl) {
      Image.getSize(imageUrl, (width, height) => {
        if (width && height) setAspectRatio(width / height);
      }, () => { });
    }
  }, [imageUrl]);

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const COLUMN_WIDTH = (SCREEN_WIDTH - 36) / 2;
  const cardHeight = COLUMN_WIDTH / aspectRatio;

  // Visual variety "here and there"
  const isSpecial = useMemo(() => Math.random() > 0.8, []);
  const specialStyle = isSpecial ? { borderColor: '#4f46e5', borderWidth: 2, shadowColor: '#4f46e5', shadowOpacity: 0.2 } : {};

  return (
    <View style={[styles.masonryCard, isLeft ? { marginRight: 6 } : { marginLeft: 6 }, specialStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (featuredImage) {
            setSelectedDetailImage({ ...featuredImage, photographer_name: item.full_name, category: categoryName });
          }
        }}
      >
        <View style={styles.masonryImageContainer}>
          {featuredImage ? (
            <Image
              source={{ uri: imageUrl || undefined }}
              style={[styles.masonryImage, { height: Math.min(Math.max(cardHeight, 150), 450) }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.masonryImagePlaceholder, { height: 180 }]}>
              <Ionicons name="camera-outline" size={32} color="#9ca3af" />
            </View>
          )}
          <TouchableOpacity style={styles.floatingHeart} onPress={() => toggleFavorite(item.user_id)}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={16} color={liked ? "#ef4444" : "#1f2937"} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <View style={styles.masonryInfo}>
        <View style={styles.masonrySocialRow}>
          <View style={styles.masonryStat}>
            <Ionicons name="heart-outline" size={20} color={gray500} />
            <ThemedText type="xs" weight="bold" style={{ color: gray500 }}>{item.total_likes ?? 0}</ThemedText>
          </View>
          <View style={styles.masonryStat}>
            <Ionicons name="chatbubble-outline" size={20} color={gray500} />
            <ThemedText type="xs" weight="bold" style={{ color: gray500 }}>{item.reviews?.length || 0}</ThemedText>
          </View>
          <TouchableOpacity onPress={() => toggleBookmark(item.user_id)}>
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={20} color={saved ? primary : gray500} />
          </TouchableOpacity>
        </View>

        <View style={[styles.masonryProfileRow, { marginBottom: 4 }]}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.masonryAvatar} />
          ) : (
            <View style={[styles.masonryAvatarPlaceholder, { backgroundColor: '#e5e7eb' }]}><ThemedText type="xs" weight="bold" style={{ color: gray600 }}>{item.full_name?.charAt(0) || 'P'}</ThemedText></View>
          )}
          <ThemedText type="sm" weight="extrabold" style={{ color: gray900, flexShrink: 1 }} numberOfLines={1}>{item.full_name}</ThemedText>
          {item.kyc_verification?.status === 'APPROVED' && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" style={{ marginLeft: 2 }} />}
        </View>

        <ThemedText type="xs" weight="bold" style={{ color: gray500, marginBottom: 10 }}>
          {item.specialization || `${categoryName.replace(/_/g, ' ')} Photographer`}
        </ThemedText>

        {/* Rating and Reviews */}
        <View style={styles.masonryMetaRow}>
          <View style={styles.masonryRating}>
            <Ionicons name="star" size={12} color="#fbbf24" />
            <ThemedText type="xs" weight="extrabold" style={{ color: gray900 }}>{(item.avg_rating || 5.0).toFixed(1)}</ThemedText>
          </View>
          <ThemedText type="xs" style={{ color: gray500 }}>({item.reviews?.length || 0} reviews)</ThemedText>
        </View>

        {/* Rank and Points */}
        <View style={styles.masonryRankRow}>
          <Ionicons name="trophy" size={14} color="#f59e0b" />
          <ThemedText type="xs" weight="bold" style={{ color: gray600 }}>Rank #{item.rank || 1}</ThemedText>
          <ThemedText type="xs" style={{ color: gray500 }}>• {item.points || item.earnings || 1800} pts</ThemedText>
        </View>

        {/* Location */}
        <View style={styles.masonryLocationRow}>
          <Ionicons name="location-outline" size={14} color={gray500} />
          <ThemedText type="xs" style={{ color: gray500, flexShrink: 1 }} numberOfLines={1}>{item.location || 'Kathmandu, Nepal'}</ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.masonryViewBtn, { backgroundColor: '#0f172a' }]}
          onPress={() => router.push({ pathname: '/Client/PhotographerProfile', params: { id: item.user_id } })}
        >
          <ThemedText type="xs" weight="extrabold" style={{ color: '#fff' }}>View Profile</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ExplorePhotographers({
  onSelectPhotographer,
  onBack,
  onNavigate,
}: ExplorePhotographersProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([]);
  const [photographers, setPhotographers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetailImage, setSelectedDetailImage] = useState<any | null>(null);

  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray600 = useThemeColor({}, 'gray600');
  const gray500 = useThemeColor({}, 'gray500');
  const gray400 = useThemeColor({}, 'gray400');
  const primary = useThemeColor({}, 'primary');
  const background = useThemeColor({}, 'background');
  const errorColor = useThemeColor({}, 'error');

  const fetchPhotographers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getAllPhotographers();
      setPhotographers(shuffleArray(res.data || []));
    } catch (e: any) {
      setError('Connection error. Please check your network.');
      console.error(e);
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotographers();

    // Listen for real-time updates
    const handleUpdate = () => {
      console.log('Photographer update received, refetching...');
      fetchPhotographers();
    };

    socketService.on('photographer_updated', handleUpdate);

    return () => {
      socketService.off('photographer_updated', handleUpdate);
    };
  }, []);

  const categories = ['All', 'Portrait', 'Event', 'Product', 'Wedding', 'Aerial', 'Fashion', 'Travel', 'Landscape', 'Culture', 'Nature', 'Wildlife', 'Sports', 'Family', 'Newborn', 'Commercial', 'Fine Art', 'Real Estate', 'Other'];

  const toggleFavorite = (user_id: string) => {
    setFavorites((prev) => (prev.includes(user_id) ? prev.filter((x) => x !== user_id) : [...prev, user_id]));
  };

  const toggleBookmark = (user_id: string) => {
    setBookmarkedPosts((prev) => (prev.includes(user_id) ? prev.filter((x) => x !== user_id) : [...prev, user_id]));
  };

  // Filter photographers - search by name, location, and specialization
  const filtered = photographers.filter((p) => {
    // Search across multiple fields: name, location, and specialization
    const matchesSearch = !searchQuery ||
      (p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.specialization && p.specialization.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedCategory === 'All') return matchesSearch;

    const matchesCategory = p.recent_portfolio_images?.some((img: any) => img.portfolio?.category?.category_name?.toUpperCase() === selectedCategory.toUpperCase());
    return matchesSearch && matchesCategory;
  });

  const leftCol = filtered.filter((_, i) => i % 2 === 0);
  const rightCol = filtered.filter((_, i) => i % 2 !== 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 15, backgroundColor: background, borderBottomColor: '#f1f5f9' }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={gray900} />
        </TouchableOpacity>
        <ThemedText type="lg" weight="extrabold" style={{ color: gray900 }}>Discover</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.hero, { backgroundColor: '#5b21b6' }]}>
          <ThemedText type="xl" weight="extrabold" style={{ color: '#fff' }}>Find Your Perfect Photographer</ThemedText>
          <ThemedText type="xs" weight="bold" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>Explore a wide range of photographers to capture your special moments.</ThemedText>
          <View style={[styles.heroSearchRow, { backgroundColor: background }]}>
            <TouchableOpacity style={[styles.heroIconBtn, { backgroundColor: '#f3f4f6' }]}><Ionicons name="options-outline" size={18} color={gray500} /></TouchableOpacity>
            <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search by name, location, or specialty..." placeholderTextColor={gray400} style={[styles.heroInput, { color: gray900 }]} />
            <TouchableOpacity style={[styles.heroSearchBtn, { backgroundColor: '#4f46e5' }]}><Ionicons name="search" size={18} color="#fff" /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.savedRow}>
          <TouchableOpacity style={[styles.savedCard, { backgroundColor: background, borderColor: '#e5e7eb' }]} onPress={() => onNavigate?.('client-favorites')}>
            <View style={[styles.savedIcon, { backgroundColor: '#eff6ff' }]}><Ionicons name="heart" size={18} color={primary} /></View>
            <ThemedText type="xs" weight="extrabold" style={{ color: gray900, textAlign: 'center' }}>Saved Photographers</ThemedText>
            <ThemedText type="xs" weight="bold" style={{ color: gray500, marginTop: 4 }}>{favorites.length} saved</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.savedCard, { backgroundColor: background, borderColor: '#e5e7eb' }]} onPress={() => onNavigate?.('client-saved-posts')}>
            <View style={[styles.savedIcon, { backgroundColor: '#eff6ff' }]}><Ionicons name="bookmark" size={18} color={primary} /></View>
            <ThemedText type="xs" weight="extrabold" style={{ color: gray900, textAlign: 'center' }}>Saved Posts</ThemedText>
            <ThemedText type="xs" weight="bold" style={{ color: gray500, marginTop: 4 }}>{bookmarkedPosts.length} saved</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {categories.map((c) => {
            const active = selectedCategory === c;
            return (
              <TouchableOpacity key={c} onPress={() => setSelectedCategory(c)} style={[styles.catChip, active ? { backgroundColor: primary } : { backgroundColor: '#f3f4f6' }]}>
                <ThemedText type="xs" weight="extrabold" style={{ color: active ? '#fff' : gray700 }}>{c}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading && photographers.length === 0 ? (
          <View style={styles.centerContent}>
            <LogoLoader size={120} />
            <ThemedText type="base" weight="bold" style={{ color: gray600, marginTop: 12 }}>Finding amazing photographers...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Ionicons name="alert-circle-outline" size={48} color={errorColor} />
            <ThemedText type="base" weight="extrabold" style={{ color: errorColor, marginTop: 12, textAlign: 'center', paddingHorizontal: 40 }}>{error}</ThemedText>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: primary }]} onPress={() => fetchPhotographers()}>
              <ThemedText type="sm" weight="extrabold" style={{ color: '#fff' }}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerContent}>
            <Ionicons name="search-outline" size={48} color={gray400} />
            <ThemedText type="base" weight="bold" style={{ color: gray500, marginTop: 12 }}>No photographers found in this category.</ThemedText>
          </View>
        ) : (
          <View style={styles.masonryContainer}>
            <View style={styles.masonryColumn}>
              {leftCol.map((item) => (
                <AspectRatioMasonryCard
                  key={`left-${item.user_id}`}
                  item={item}
                  isLeft={true}
                  favorites={favorites}
                  bookmarkedPosts={bookmarkedPosts}
                  toggleFavorite={toggleFavorite}
                  toggleBookmark={toggleBookmark}
                  setSelectedDetailImage={setSelectedDetailImage}
                  router={router}
                />
              ))}
            </View>
            <View style={styles.masonryColumn}>
              {rightCol.map((item) => (
                <AspectRatioMasonryCard
                  key={`right-${item.user_id}`}
                  item={item}
                  isLeft={false}
                  favorites={favorites}
                  bookmarkedPosts={bookmarkedPosts}
                  toggleFavorite={toggleFavorite}
                  toggleBookmark={toggleBookmark}
                  setSelectedDetailImage={setSelectedDetailImage}
                  router={router}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <ClientBottomNav />

      <Modal visible={!!selectedDetailImage} transparent animationType="fade" onRequestClose={() => setSelectedDetailImage(null)}>
        <View style={styles.detailModalContainer}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setSelectedDetailImage(null)}><View style={[styles.detailBlurBackground, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]} /></TouchableOpacity>
          <View style={styles.detailContent}>
            <View style={styles.detailHeader}><TouchableOpacity style={[styles.detailCloseButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} onPress={() => setSelectedDetailImage(null)}><Ionicons name="close" size={28} color="white" /></TouchableOpacity></View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
              {selectedDetailImage && (
                <>
                  {toAbsoluteImageUrl(selectedDetailImage) && (
                    <View style={[styles.detailImageContainer, { backgroundColor: 'black' }]}>
                      <Image source={{ uri: toAbsoluteImageUrl(selectedDetailImage)! }} style={styles.detailImage} resizeMode="contain" />
                    </View>
                  )}
                  <View style={styles.detailInfoSection}>
                    <View style={[styles.detailCategoryBadge, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}><ThemedText type="xs" weight="bold" style={{ color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1 }}>{selectedDetailImage.category}</ThemedText></View>
                    <ThemedText type="3xl" weight="extrabold" style={{ color: 'white', marginBottom: 8 }}>{selectedDetailImage.title || 'Inspiration'}</ThemedText>
                    <View style={styles.photographerBrief}><Ionicons name="camera" size={16} color="#3b82f6" /><ThemedText type="sm" weight="bold" style={{ color: '#3b82f6' }}>by {selectedDetailImage.photographer_name}</ThemedText></View>
                    {selectedDetailImage.description ? (
                      <ThemedText type="base" weight="bold" style={{ color: '#d1d5db', lineHeight: 24, marginBottom: 24 }}>{selectedDetailImage.description}</ThemedText>
                    ) : (
                      <ThemedText type="base" weight="bold" style={{ color: '#6b7280', fontStyle: 'italic', marginBottom: 24 }}>No description provided.</ThemedText>
                    )}
                    <View style={styles.detailStatsRow}>
                      <View style={styles.detailStatItem}><Ionicons name="heart" size={18} color="#ef4444" /><ThemedText type="xl" weight="bold" style={{ color: 'white' }}>{selectedDetailImage.likes_count || 0}</ThemedText><ThemedText type="xs" weight="bold" style={{ color: '#9ca3af' }}>Likes</ThemedText></View>
                      <View style={styles.detailStatItem}><Ionicons name="eye" size={18} color="#3b82f6" /><ThemedText type="xl" weight="bold" style={{ color: 'white' }}>{selectedDetailImage.views_count || 0}</ThemedText><ThemedText type="xs" weight="bold" style={{ color: '#9ca3af' }}>Views</ThemedText></View>
                    </View>
                    <TouchableOpacity style={[styles.detailShareButton, { backgroundColor: '#2563eb' }]} onPress={() => Alert.alert('Share', 'Feature coming soon!')}><Ionicons name="share-social" size={20} color="white" /><ThemedText type="base" weight="bold" style={{ color: 'white' }}>Share Inspiration</ThemedText></TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBtn: { padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  hero: {
    backgroundColor: '#5b21b6',
    margin: 16,
    borderRadius: 18,
    padding: 16,
    overflow: 'hidden',
  },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  heroSubtitle: { marginTop: 6, color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  heroSearchRow: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  heroInput: { flex: 1, marginLeft: 8, marginRight: 8, fontSize: 13, fontWeight: '700', color: '#111827' },
  heroSearchBtn: { width: 44, height: 36, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  savedRow: { flexDirection: 'row', paddingHorizontal: 16, columnGap: 12 },
  savedCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  savedIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  savedTitle: { fontSize: 12, fontWeight: '900', color: '#111827', textAlign: 'center' },
  savedCount: { marginTop: 4, fontSize: 11, fontWeight: '800', color: '#6b7280' },
  catRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, columnGap: 10 },
  catChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  catChipActive: { backgroundColor: '#2563eb' },
  catChipInactive: { backgroundColor: '#f3f4f6' },
  catChipText: { fontSize: 13, fontWeight: '900' },
  catChipTextActive: { color: '#fff' },
  catChipTextInactive: { color: '#374151' },
  scrollContent: { paddingBottom: 100 },
  masonryContainer: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 10 },
  masonryColumn: { flex: 1, overflow: 'visible' },
  masonryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 25,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 15,
    borderWidth: 0,
  },
  masonryImageContainer: { position: 'relative', width: '100%' },
  masonryImage: { width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  masonryImagePlaceholder: { width: '100%', backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  floatingHeart: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 5, elevation: 3 },
  masonryInfo: { padding: 12 },
  masonrySocialRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12 },
  masonryStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  masonryStatText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  masonryCategory: { fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 10 },
  masonryProfileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  masonryAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  masonryAvatarPlaceholder: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  masonryAvatarInitial: { fontSize: 12, fontWeight: 'bold', color: '#4b5563' },
  masonryName: { fontSize: 12, fontWeight: '700', color: '#4b5563', flexShrink: 1 },
  masonryRatingPrice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  masonryRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  masonryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  masonryRankRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  masonryLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  masonryRatingText: { fontSize: 12, fontWeight: '800', color: '#111827' },

  masonryViewBtn: { backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  masonryViewBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  detailModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  detailBlurBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.9)' },
  detailContent: { width: '100%', height: '100%', paddingTop: 50 },
  detailHeader: { paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', justifyContent: 'flex-end', zIndex: 10 },
  detailCloseButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
  detailScrollContent: { paddingBottom: 40 },
  detailImageContainer: { width: '100%', height: 450, backgroundColor: 'black', marginBottom: 20 },
  detailImage: { width: '100%', height: '100%' },
  detailInfoSection: { paddingHorizontal: 24 },
  detailCategoryBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)', marginBottom: 12 },
  detailCategoryText: { color: '#3b82f6', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  detailTitle: { fontSize: 28, fontWeight: '800', color: 'white', marginBottom: 8 },
  photographerBrief: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  photographerNameText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  detailDescription: { fontSize: 16, lineHeight: 24, color: '#d1d5db', marginBottom: 24 },
  detailNoDescription: { fontSize: 16, fontStyle: 'italic', color: '#6b7280', marginBottom: 24 },
  detailStatsRow: { flexDirection: 'row', gap: 30, marginBottom: 30 },
  detailStatItem: { alignItems: 'flex-start' },
  detailStatValue: { fontSize: 20, fontWeight: '700', color: 'white' },
  detailStatLabel: { fontSize: 12, color: '#9ca3af' },
  detailShareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 16, gap: 10 },
  detailShareText: { color: 'white', fontSize: 16, fontWeight: '700' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loaderIcon: { marginBottom: 12 },
  loaderText: { fontSize: 16, color: '#4b5563', fontWeight: '600' },
  errorText: { fontSize: 16, color: '#ef4444', textAlign: 'center', marginTop: 12, paddingHorizontal: 40 },
  retryBtn: { marginTop: 20, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '800' },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginTop: 12 },
});