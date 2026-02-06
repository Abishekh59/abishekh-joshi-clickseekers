import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LogoLoader from '../../components/LogoLoader';
import { API_HOST } from '../../services/api';
import { storage } from '../../utils/storage';

const toAbsoluteImageUrl = (urlOrObj: string | { image_url?: string | null; image_id: number } | null | undefined) => {
  if (!urlOrObj) return null;

  // Handle object case (like ExplorePhotographers does)
  if (typeof urlOrObj === 'object') {
    const img = urlOrObj as { image_url?: string | null; image_id: number };
    if (img.image_url && img.image_url.trim() !== '') {
      if (img.image_url.startsWith('http')) return img.image_url;
      const path = img.image_url.startsWith('/') ? img.image_url : `/${img.image_url}`;
      return `${API_HOST}${path}`;
    }
    if (img.image_id) {
      return `${API_HOST}/api/photographer/portfolio/image/${img.image_id}`;
    }
    return null;
  }

  // Handle string case
  const url = urlOrObj as string;
  if (url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_HOST}${path}`;
};

export default function PhotographerProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const photographerId = params.id as string;

  const [activeTab, setActiveTab] = useState<'Portfolio' | 'Packages' | 'Reviews'>('Portfolio');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageLikes, setImageLikes] = useState<Record<number, boolean>>({});
  const [imageBookmarks, setImageBookmarks] = useState<Record<number, boolean>>({});
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const [photographer, setPhotographer] = useState<any>(null);
  const [portfolioImages, setPortfolioImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray600 = useThemeColor({}, 'gray600');
  const gray500 = useThemeColor({}, 'gray500');
  const gray400 = useThemeColor({}, 'gray400');
  const primary = useThemeColor({}, 'primary');
  const background = useThemeColor({}, 'background');
  const errorColor = useThemeColor({}, 'error');

  useEffect(() => {
    if (!photographerId) {
      setError('No photographer selected');
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      try {
        setLoading(true);
        // Fetch photographer details (now includes packages and reviews)
        const profileRes = await fetch(`${API_HOST}/api/photographer/${photographerId}`);
        const profileJson = await profileRes.json();
        if (!profileJson.success) throw new Error(profileJson.message);
        setPhotographer(profileJson.data);

        // Fetch full portfolio
        const portfolioRes = await fetch(`${API_HOST}/api/photographer/${photographerId}/portfolio/images`);
        const portfolioJson = await portfolioRes.json();
        if (portfolioJson.success) {
          setPortfolioImages(portfolioJson.data.images || []);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [photographerId]);

  const toggleImageLike = (index: number) => {
    setImageLikes((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleImageBookmark = (index: number) => {
    setImageBookmarks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const TabButton = ({ tab }: { tab: 'Portfolio' | 'Packages' | 'Reviews' }) => {
    const active = activeTab === tab;
    return (
      <TouchableOpacity
        onPress={() => setActiveTab(tab)}
        activeOpacity={0.85}
        style={[styles.tabBtn, active ? { borderBottomColor: primary, borderBottomWidth: 2 } : null]}
      >
        <ThemedText type="sm" weight="extrabold" style={{ color: active ? primary : gray400 }}>{tab}</ThemedText>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: background }]}>
        <LogoLoader size={120} />
        <ThemedText type="base" weight="bold" style={{ color: gray600, marginTop: 12 }}>Loading Profile...</ThemedText>
      </View>
    );
  }

  if (error || !photographer) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={errorColor} />
        <ThemedText type="base" weight="extrabold" style={{ color: errorColor, marginTop: 12, textAlign: 'center', paddingHorizontal: 40 }}>
          {error || 'Photographer not found'}
        </ThemedText>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: primary }]} onPress={() => router.back()}>
          <ThemedText type="sm" weight="extrabold" style={{ color: '#fff' }}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 10, borderBottomColor: '#f3f4f6' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={gray900} />
        </TouchableOpacity>
        <ThemedText type="base" weight="extrabold" style={{ color: gray900 }}>Photographer Profile</ThemedText>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="share-social-outline" size={20} color={gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 120 }]}>
        {/* Profile Section */}
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {photographer.profile_image && toAbsoluteImageUrl(photographer.profile_image) ? (
              <Image source={{ uri: toAbsoluteImageUrl(photographer.profile_image)! }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: '#e5e7eb' }]}>
                <ThemedText type="3xl" weight="bold" style={{ color: gray600 }}>{photographer.full_name?.charAt(0) || 'P'}</ThemedText>
              </View>
            )}
          </View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <ThemedText type="2xl" weight="extrabold" style={{ color: gray900 }} numberOfLines={1}>{photographer.full_name}</ThemedText>
            <ThemedText type="xs" weight="bold" style={{ color: primary, marginTop: 1, marginBottom: 4 }}>
              {photographer.specialization || 'Professional Photographer'}
            </ThemedText>

            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={13} color={gray500} />
              <ThemedText type="xs" weight="bold" style={{ color: gray600, marginLeft: 6 }} numberOfLines={1}>{photographer.email}</ThemedText>
            </View>

            {photographer.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={13} color={gray500} />
                <ThemedText type="xs" weight="bold" style={{ color: gray600, marginLeft: 6 }} numberOfLines={1}>{photographer.phone}</ThemedText>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={13} color={gray500} />
              <ThemedText type="xs" weight="bold" style={{ color: gray600, marginLeft: 6 }} numberOfLines={1}>{photographer.location || 'Nepal'}</ThemedText>
            </View>
          </View>
        </View>

        {/* Bio */}
        <ThemedText type="sm" weight="bold" style={{ color: gray600, lineHeight: 20, marginBottom: 14, marginTop: 4 }}>
          {photographer.bio || "No bio available."}
        </ThemedText>

        {/* Stats */}
        <View style={styles.statsRow}>
          {/* Rank */}
          <View style={styles.statCard}>
            <ThemedText type="xl" weight="extrabold" style={{ color: gray900 }}>{photographer.rank || '#1'}</ThemedText>
            <ThemedText type="xs" weight="extrabold" style={{ color: gray900, marginTop: 4 }}>Rank</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="star" size={12} color="#f59e0b" style={{ marginRight: 4 }} />
              <ThemedText type="xs" weight="bold" style={{ color: gray500 }}>{photographer.points?.toLocaleString() || '0'} pts</ThemedText>
            </View>
          </View>

          <View style={styles.statDivider} />

          {/* Rating */}
          <View style={styles.statCard}>
            <ThemedText type="xl" weight="extrabold" style={{ color: gray900 }}>
              {photographer.reviews?.length > 0 ? (photographer.reviews.reduce((acc: any, r: any) => acc + r.rating, 0) / photographer.reviews.length).toFixed(1) : '5.0'}
            </ThemedText>
            <ThemedText type="xs" weight="extrabold" style={{ color: gray900, marginTop: 4 }}>Rating</ThemedText>
            <ThemedText type="xs" weight="bold" style={{ color: gray500, marginTop: 4 }}>{photographer.reviews?.length || 0} reviews</ThemedText>
          </View>

          <View style={styles.statDivider} />

          {/* Bookings */}
          <View style={styles.statCard}>
            <ThemedText type="xl" weight="extrabold" style={{ color: gray900 }}>{photographer.total_bookings || 0}</ThemedText>
            <ThemedText type="xs" weight="extrabold" style={{ color: gray900, marginTop: 4 }}>Bookings</ThemedText>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsRow, { borderBottomColor: '#e5e7eb' }]}>
          <TabButton tab="Portfolio" />
          <TabButton tab="Packages" />
          <TabButton tab="Reviews" />
        </View>

        {/* Tab Content */}
        {activeTab === 'Portfolio' ? (
          <FlatList
            data={portfolioImages}
            keyExtractor={(item) => item.image_id.toString()}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.gridItem}
                activeOpacity={0.9}
                onPress={() => setSelectedImageIndex(index)}
              >
                {toAbsoluteImageUrl(item) && (
                  <Image source={{ uri: toAbsoluteImageUrl(item)! }} style={styles.gridImage} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="images-outline" size={40} color={gray400} />
                <ThemedText type="sm" weight="bold" style={{ color: gray400, marginTop: 12 }}>No portfolio photos yet.</ThemedText>
              </View>
            }
          />
        ) : null}

        {activeTab === 'Packages' ? (
          <View style={{ rowGap: 12 }}>
            {photographer.packages && photographer.packages.length > 0 ? (
              photographer.packages.map((pkg: any) => (
                <TouchableOpacity
                  key={pkg.package_id}
                  style={[styles.packageCard, { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }, selectedPackage?.package_id === pkg.package_id ? { borderColor: primary, backgroundColor: '#eff6ff' } : null]}
                  onPress={() => setSelectedPackage(pkg)}
                >
                  <View style={styles.packageTop}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="base" weight="extrabold" style={{ color: gray900 }}>{pkg.name}</ThemedText>
                      <ThemedText type="xs" weight="extrabold" style={{ color: gray500, marginTop: 2 }}>{pkg.duration || 'Session'}</ThemedText>
                    </View>
                    <ThemedText type="xl" weight="extrabold" style={{ color: primary }}>${pkg.price}</ThemedText>
                  </View>
                  <View style={{ marginTop: 10, rowGap: 8 }}>
                    {pkg.description ? (
                      <ThemedText type="sm" weight="bold" style={{ color: gray600, lineHeight: 20 }}>{pkg.description}</ThemedText>
                    ) : null}
                    {pkg.features ? pkg.features.split(',').map((f: string, i: number) => (
                      <View key={i} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <ThemedText type="sm" weight="bold" style={{ color: gray600 }}>{f.trim()}</ThemedText>
                      </View>
                    )) : null}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="gift-outline" size={40} color={gray400} />
                <ThemedText type="sm" weight="bold" style={{ color: gray400, marginTop: 12 }}>No packages listed.</ThemedText>
              </View>
            )}
          </View>
        ) : null}

        {activeTab === 'Reviews' ? (
          <View style={{ rowGap: 12 }}>
            {photographer.reviews && photographer.reviews.length > 0 ? (
              photographer.reviews.map((r: any) => (
                <View key={r.review_id} style={[styles.reviewCard, { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }]}>
                  <View style={styles.reviewHeader}>
                    {r.reviewer?.profile_image && toAbsoluteImageUrl(r.reviewer.profile_image) ? (
                      <Image source={{ uri: toAbsoluteImageUrl(r.reviewer.profile_image)! }} style={styles.reviewAvatar} />
                    ) : (
                      <View style={[styles.reviewAvatar, styles.avatarPlaceholder, { backgroundColor: '#e5e7eb' }]}>
                        <ThemedText type="lg" weight="bold" style={{ color: gray600 }}>{r.reviewer?.full_name?.charAt(0) || 'U'}</ThemedText>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <ThemedText type="sm" weight="extrabold" style={{ color: gray900 }}>{r.reviewer?.full_name}</ThemedText>
                      <View style={styles.ratingLine}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Ionicons key={i} name={i < r.rating ? 'star' : 'star-outline'} size={12} color="#f59e0b" />
                        ))}
                      </View>
                    </View>
                  </View>
                  <ThemedText type="sm" weight="bold" style={{ color: gray600, lineHeight: 18 }}>{r.comment}</ThemedText>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="star-outline" size={40} color={gray400} />
                <ThemedText type="sm" weight="bold" style={{ color: gray400, marginTop: 12 }}>No reviews yet.</ThemedText>
              </View>
            )}
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: background, borderTopColor: '#f3f4f6' }]}>
        <TouchableOpacity
          onPress={() => setIsFavorite((s) => !s)}
          style={[styles.bottomIconBtn, { borderColor: '#e5e7eb' }]}
        >
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#ef4444' : gray500} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomIconBtn, { borderColor: '#e5e7eb' }]}
          onPress={async () => {
            try {
              const token = await storage.getToken();
              if (!token) {
                Alert.alert('Error', 'You must be logged in to chat.');
                return;
              }
              router.push({
                pathname: '/Client/ClientMessages',
                params: {
                  otherUserId: photographer.user_id.toString(),
                  userName: photographer.full_name,
                  userAvatar: photographer.profile_image || ''
                }
              });
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to start chat');
            }
          }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={gray500} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: primary }]}
          activeOpacity={0.85}
          onPress={() => {
            const pkg = selectedPackage || (photographer.packages && photographer.packages[0]);
            if (!pkg) {
              Alert.alert('Notice', 'No packages available for this photographer.');
              return;
            }
            router.push({
              pathname: '/Client/BookingForm',
              params: {
                photographerId: photographer.user_id,
                photographerName: photographer.full_name,
                photographerAvatar: photographer.profile_image,
                packageId: pkg.package_id,
                packageName: pkg.name,
                packagePrice: pkg.price
              }
            });
          }}
        >
          <ThemedText type="base" weight="extrabold" style={{ color: '#fff' }}>Book Now</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Image Modal */}
      <Modal visible={selectedImageIndex !== null} transparent animationType="fade" onRequestClose={() => setSelectedImageIndex(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setSelectedImageIndex(null)}
          />
          <View style={[styles.imageModalCard, { backgroundColor: background }]}>
            <View style={styles.imageModalHeader}>
              <TouchableOpacity onPress={() => setSelectedImageIndex(null)} style={styles.iconBtn}>
                <Ionicons name="close" size={24} color={gray900} />
              </TouchableOpacity>
              <ThemedText type="sm" weight="extrabold" style={{ flex: 1, textAlign: 'center', color: gray900 }} numberOfLines={1}>{photographer.full_name}</ThemedText>
              <View style={{ width: 40 }} />
            </View>

            {selectedImageIndex !== null && toAbsoluteImageUrl(portfolioImages[selectedImageIndex]) && (
              <Image
                source={{ uri: toAbsoluteImageUrl(portfolioImages[selectedImageIndex])! }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.postActions}>
              <TouchableOpacity onPress={() => selectedImageIndex != null && toggleImageLike(selectedImageIndex)}>
                <Ionicons
                  name={selectedImageIndex != null && imageLikes[selectedImageIndex] ? 'heart' : 'heart-outline'}
                  size={24}
                  color={selectedImageIndex != null && imageLikes[selectedImageIndex] ? '#ef4444' : gray900}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => selectedImageIndex != null && toggleImageBookmark(selectedImageIndex)}>
                <Ionicons
                  name={selectedImageIndex != null && imageBookmarks[selectedImageIndex] ? 'bookmark' : 'bookmark-outline'}
                  size={24}
                  color={gray900}
                />
              </TouchableOpacity>
            </View>

            {selectedImageIndex !== null && (
              <View style={styles.captionBox}>
                <ThemedText type="sm" weight="bold" style={{ color: gray700 }}>{portfolioImages[selectedImageIndex].title || 'Untitled Portfolio Piece'}</ThemedText>
                {portfolioImages[selectedImageIndex].description ? (
                  <ThemedText type="sm" weight="bold" style={{ color: gray600, lineHeight: 20, marginTop: 4 }}>{portfolioImages[selectedImageIndex].description}</ThemedText>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  backBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  content: { paddingHorizontal: 16 },
  topBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: { padding: 8 },
  profileRow: { flexDirection: 'row', paddingTop: 16, paddingBottom: 10 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  infoRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center' },
  ratingLine: { marginTop: 8, flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  statsRow: { flexDirection: 'row', columnGap: 0, marginTop: 10, marginBottom: 16, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  statCard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: '#e5e7eb' },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  gridRow: { columnGap: 4 },
  gridItem: { flex: 1 / 3, aspectRatio: 1, marginBottom: 4 },
  gridImage: { width: '100%', height: '100%', borderRadius: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  packageCard: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 12 },
  packageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  featureRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8, marginBottom: 4 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  bottomIconBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bookBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center' },
  imageModalCard: { marginHorizontal: 12, borderRadius: 24, overflow: 'hidden' },
  imageModalHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  fullImage: { width: '100%', height: 400 },
  postActions: { flexDirection: 'row', padding: 16, columnGap: 20 },
  captionBox: { paddingHorizontal: 16, paddingBottom: 20 },
  reviewCard: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 12 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 12 },
});