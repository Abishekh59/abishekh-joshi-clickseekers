import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FavoritePhotographersProps {
  onNavigate?: (screen: string, data?: any) => void;
  onBack?: () => void;
}

type FavoritePhotographer = {
  id: number;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  price: string;
  location: string;
  verified: boolean;
  image: string; // search keyword(s)
  savedOn: string;
};

export default function FavoritePhotographers({ onNavigate, onBack }: FavoritePhotographersProps) {
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<FavoritePhotographer[]>([
    {
      id: 1,
      name: 'Rajesh Sharma',
      category: 'Wedding Photography',
      rating: 4.9,
      reviews: 156,
      price: 'From NPR 25,000',
      location: 'Kathmandu',
      verified: true,
      image: 'photographer portrait professional',
      savedOn: '2 days ago',
    },
    {
      id: 2,
      name: 'Anjali Thapa',
      category: 'Event Photography',
      rating: 4.8,
      reviews: 98,
      price: 'From NPR 18,000',
      location: 'Pokhara',
      verified: true,
      image: 'woman photographer camera professional',
      savedOn: '5 days ago',
    },
    {
      id: 3,
      name: 'Maya Gurung',
      category: 'Portrait Photography',
      rating: 5.0,
      reviews: 203,
      price: 'From NPR 20,000',
      location: 'Kathmandu',
      verified: true,
      image: 'portrait photographer woman',
      savedOn: '1 week ago',
    },
  ]);

  const headerSubtitle = useMemo(() => `${favorites.length} saved photographers`, [favorites.length]);

  const handleRemoveFavorite = (id: number) => {
    setFavorites((prev) => prev.filter((p) => p.id !== id));
  };

  const renderItem = ({ item }: { item: FavoritePhotographer }) => {
    const imageUri = `https://source.unsplash.com/120x120/?${encodeURIComponent(item.image)}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          {/* Image */}
          <View style={styles.imageWrap}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            {item.verified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            ) : null}
          </View>

          {/* Details */}
          <View style={styles.body}>
            <View style={styles.topRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.category} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleRemoveFavorite(item.id)}
                style={styles.removeBtn}
                activeOpacity={0.85}
                accessibilityLabel="Remove from favorites"
              >
                <Ionicons name="close" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
                <Text style={styles.metaMuted}>({item.reviews})</Text>
              </View>

              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={[styles.metaMuted, { flex: 1 }]} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            </View>

            <View style={styles.bottomRow}>
              <Text style={styles.price} numberOfLines={1}>
                {item.price}
              </Text>
              <Text style={styles.savedOn} numberOfLines={1}>
                Saved {item.savedOn}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnPrimary]}
            activeOpacity={0.85}
            onPress={() => onNavigate?.('client-photographer-profile', item)}
          >
            <Text style={styles.btnPrimaryText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnAccent]}
            activeOpacity={0.85}
            onPress={() => onNavigate?.('client-booking-request', item)}
          >
            <Text style={styles.btnAccentText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="heart-outline" size={34} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptyText}>Save your favorite photographers to easily find them later</Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        activeOpacity={0.85}
        onPress={() => onNavigate?.('client-explore')}
      >
        <Text style={styles.emptyBtnText}>Explore Photographers</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityLabel="Back" activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Favorites</Text>
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={favorites}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={favorites.length ? styles.listContent : styles.emptyWrap}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  iconBtn: { padding: 8, marginRight: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerSubtitle: { marginTop: 4, color: '#bfdbfe', fontWeight: '800', fontSize: 12 },

  listContent: { padding: 16, paddingBottom: 18 },
  emptyWrap: { flexGrow: 1, padding: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardRow: { flexDirection: 'row', padding: 14 },

  imageWrap: { position: 'relative', marginRight: 12 },
  image: { width: 88, height: 88, borderRadius: 14, backgroundColor: '#e5e7eb' },
  verifiedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  body: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { color: '#111827', fontSize: 15, fontWeight: '900' },
  category: { marginTop: 2, color: '#6b7280', fontSize: 12, fontWeight: '700' },
  removeBtn: { padding: 8, borderRadius: 10, backgroundColor: '#fef2f2' },

  metaRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flexDirection: 'row', alignItems: 'center', columnGap: 6, maxWidth: '55%' },
  metaText: { color: '#111827', fontWeight: '900', fontSize: 12 },
  metaMuted: { color: '#6b7280', fontWeight: '700', fontSize: 12 },

  bottomRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { color: '#1e3a8a', fontWeight: '900', fontSize: 12, flex: 1, paddingRight: 8 },
  savedOn: { color: '#9ca3af', fontWeight: '800', fontSize: 11 },

  actionsRow: { flexDirection: 'row', columnGap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  actionBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#1e3a8a' },
  btnPrimaryText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  btnAccent: { backgroundColor: '#f97316' },
  btnAccentText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  emptyText: { marginTop: 6, textAlign: 'center', color: '#6b7280', fontWeight: '700' },
  emptyBtn: { marginTop: 14, backgroundColor: '#1e3a8a', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '900' },
});
