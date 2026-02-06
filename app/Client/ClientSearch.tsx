import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SearchFilters {
  categories: string[];
  locations: string[];
  priceRange: { min: number; max: number };
  ratings: number[];
}

interface Photographer {
  id: string;
  name: string;
  location: string;
  avatar: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  categories: string[];
  price: number;
  completedBookings: number;
}

type Props = {
  onNavigate?: (screen: string, data?: any) => void;
};

export const ClientSearch: React.FC<Props> = ({ onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [activeSort, setActiveSort] = useState('Recommended');

  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    locations: [],
    priceRange: { min: 0, max: 100000 },
    ratings: [],
  });

  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray600 = useThemeColor({}, 'gray600');
  const gray500 = useThemeColor({}, 'gray500');
  const gray400 = useThemeColor({}, 'gray400');
  const primary = useThemeColor({}, 'primary');
  const background = useThemeColor({}, 'background');

  const results: Photographer[] = [
    {
      id: '1',
      name: 'Ramesh Shrestha',
      location: 'Kathmandu',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      coverImage: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600',
      rating: 4.9,
      reviewCount: 127,
      categories: ['Wedding', 'Portrait'],
      price: 15000,
      completedBookings: 150,
    },
    {
      id: '2',
      name: 'Sita Maharjan',
      location: 'Pokhara',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
      coverImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600',
      rating: 4.8,
      reviewCount: 89,
      categories: ['Fashion', 'Portrait'],
      price: 12000,
      completedBookings: 75,
    },
  ];

  const categories = ['Wedding', 'Portrait', 'Events', 'Product', 'Fashion', 'Nature', 'Food', 'Architecture'];
  const locations = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Biratnagar', 'Chitwan'];
  const sortOptions = ['Recommended', 'Price: Low to High', 'Price: High to Low', 'Rating', 'Most Reviewed'];
  const ratingOptions = [5, 4, 3];

  const toggleCategory = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const toggleLocation = (location: string) => {
    setFilters((prev) => ({
      ...prev,
      locations: prev.locations.includes(location)
        ? prev.locations.filter((l) => l !== location)
        : [...prev.locations, location],
    }));
  };

  const toggleRating = (rating: number) => {
    setFilters((prev) => ({
      ...prev,
      ratings: prev.ratings.includes(rating) ? prev.ratings.filter((r) => r !== rating) : [...prev.ratings, rating],
    }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      locations: [],
      priceRange: { min: 0, max: 100000 },
      ratings: [],
    });
  };

  const activeFilterCount = filters.categories.length + filters.locations.length + filters.ratings.length;

  const removeFilter = (type: 'category' | 'location' | 'rating', value: string) => {
    if (type === 'category') toggleCategory(value);
    if (type === 'location') toggleLocation(value);
    if (type === 'rating') toggleRating(Number(value));
  };

  const filteredSortedResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let out = results.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.categories.some((c) => c.toLowerCase().includes(q));

      const matchesCategories =
        filters.categories.length === 0 || filters.categories.some((c) => p.categories.includes(c));

      const matchesLocations =
        filters.locations.length === 0 || filters.locations.includes(p.location);

      const matchesPrice = p.price >= filters.priceRange.min && p.price <= filters.priceRange.max;

      const matchesRatings =
        filters.ratings.length === 0 || filters.ratings.some((min) => p.rating >= min);

      return matchesSearch && matchesCategories && matchesLocations && matchesPrice && matchesRatings;
    });

    out = [...out].sort((a, b) => {
      switch (activeSort) {
        case 'Price: Low to High':
          return a.price - b.price;
        case 'Price: High to Low':
          return b.price - a.price;
        case 'Rating':
          return b.rating - a.rating;
        case 'Most Reviewed':
          return b.reviewCount - a.reviewCount;
        case 'Recommended':
        default:
          // simple heuristic: rating + reviews + bookings
          return (b.rating * 10 + b.reviewCount / 10 + b.completedBookings / 50) - (a.rating * 10 + a.reviewCount / 10 + a.completedBookings / 50);
      }
    });

    return out;
  }, [activeSort, filters, results, searchQuery]);

  const Stars = ({ rating }: { rating: number }) => {
    const full = Math.floor(rating);
    return (
      <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < full ? 'star' : 'star-outline'}
            size={14}
            color={i < full ? '#f59e0b' : gray400}
          />
        ))}
      </View>
    );
  };

  const FilterChip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active ? { backgroundColor: primary } : { backgroundColor: '#f3f4f6' }]}
    >
      <ThemedText type="xs" weight="bold" style={{ color: active ? '#fff' : gray900 }}>{label}</ThemedText>
    </TouchableOpacity>
  );

  const ActiveTag = ({ text, onRemove }: { text: string; onRemove: () => void }) => (
    <View style={[styles.activeTag, { backgroundColor: primary }]}>
      <ThemedText type="xs" weight="extrabold" style={{ color: '#fff' }}>{text}</ThemedText>
      <TouchableOpacity onPress={onRemove} style={styles.activeTagRemove} activeOpacity={0.85}>
        <Ionicons name="close" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderPhotographer = ({ item }: { item: Photographer }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: background, borderColor: '#f3f4f6' }]}
      activeOpacity={0.9}
      onPress={() => onNavigate?.('client-photographer-profile', item)}
    >
      <View style={styles.coverWrap}>
        <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
        <View style={[styles.avatarWrap, { backgroundColor: background }]}>
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        </View>
      </View>

      <View style={styles.cardBody}>
        <ThemedText type="base" weight="extrabold" style={{ color: primary }} numberOfLines={1}>{item.name}</ThemedText>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={gray500} />
          <ThemedText type="sm" weight="bold" style={{ color: gray500, flex: 1 }} numberOfLines={1}>
            {item.location}
          </ThemedText>
        </View>

        <View style={styles.ratingRow}>
          <Stars rating={item.rating} />
          <ThemedText type="sm" weight="extrabold" style={{ color: gray900, marginLeft: 8 }}>{item.rating.toFixed(1)}</ThemedText>
          <ThemedText type="sm" weight="extrabold" style={{ color: gray400, marginLeft: 6 }}>({item.reviewCount})</ThemedText>
        </View>

        <View style={styles.tagsRow}>
          {item.categories.map((c) => (
            <View key={c} style={[styles.tag, { backgroundColor: '#eff6ff' }]}>
              <ThemedText type="xs" weight="extrabold" style={{ color: '#1d4ed8' }}>{c}</ThemedText>
            </View>
          ))}
        </View>

        <ThemedText type="sm" weight="extrabold" style={{ color: primary, marginTop: 4 }}>
          NPR {item.price.toLocaleString()}+
          <ThemedText type="xs" weight="extrabold" style={{ color: gray400 }}> /session</ThemedText>
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 12, backgroundColor: background, borderBottomColor: '#e5e7eb' }]}>
        <View style={[styles.searchBox, { backgroundColor: '#f3f4f6' }]}>
          <Ionicons name="search" size={18} color={gray500} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search photographers..."
            placeholderTextColor={gray400}
            style={[styles.searchInput, { color: gray900 }]}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, filterPanelOpen ? { backgroundColor: primary, borderColor: primary } : { backgroundColor: background, borderColor: '#e5e7eb' }]}
          activeOpacity={0.85}
          onPress={() => setFilterPanelOpen((v) => !v)}
        >
          <Ionicons name="options-outline" size={18} color={filterPanelOpen ? '#fff' : gray900} />
          <ThemedText type="sm" weight="extrabold" style={{ color: filterPanelOpen ? '#fff' : gray900 }}>Filters</ThemedText>
          {activeFilterCount > 0 ? (
            <View style={[styles.filterCount, { backgroundColor: '#f97316' }]}>
              <ThemedText type="xs" weight="extrabold" style={{ color: '#fff' }}>{activeFilterCount}</ThemedText>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {filterPanelOpen ? (
        <View style={[styles.filterPanel, { backgroundColor: background, borderBottomColor: '#e5e7eb' }]}>
          <ThemedText type="xs" weight="extrabold" style={{ color: primary, marginBottom: 10 }}>Categories</ThemedText>
          <View style={styles.chipsWrap}>
            {categories.map((c) => (
              <FilterChip key={c} label={c} active={filters.categories.includes(c)} onPress={() => toggleCategory(c)} />
            ))}
          </View>

          <ThemedText type="xs" weight="extrabold" style={{ color: primary, marginTop: 14, marginBottom: 10 }}>Location</ThemedText>
          <View style={styles.chipsWrap}>
            {locations.map((l) => (
              <FilterChip key={l} label={l} active={filters.locations.includes(l)} onPress={() => toggleLocation(l)} />
            ))}
          </View>

          <ThemedText type="xs" weight="extrabold" style={{ color: primary, marginTop: 14, marginBottom: 10 }}>Minimum Rating</ThemedText>
          <View style={styles.chipsWrap}>
            {ratingOptions.map((r) => (
              <FilterChip
                key={r}
                label={`${r}+`}
                active={filters.ratings.includes(r)}
                onPress={() => toggleRating(r)}
              />
            ))}
          </View>

          <ThemedText type="xs" weight="extrabold" style={{ color: primary, marginTop: 14, marginBottom: 10 }}>Price Range (NPR)</ThemedText>
          <View style={styles.priceRow}>
            <View style={styles.priceCol}>
              <ThemedText type="xs" weight="extrabold" style={{ color: gray500, marginBottom: 6 }}>Min</ThemedText>
              <TextInput
                value={String(filters.priceRange.min)}
                onChangeText={(t) =>
                  setFilters((p) => ({ ...p, priceRange: { ...p.priceRange, min: Number(t || 0) } }))
                }
                keyboardType="numeric"
                style={[styles.priceInput, { color: gray900, backgroundColor: background, borderColor: '#e5e7eb' }]}
              />
            </View>
            <View style={styles.priceCol}>
              <ThemedText type="xs" weight="extrabold" style={{ color: gray500, marginBottom: 6 }}>Max</ThemedText>
              <TextInput
                value={String(filters.priceRange.max)}
                onChangeText={(t) =>
                  setFilters((p) => ({ ...p, priceRange: { ...p.priceRange, max: Number(t || 0) } }))
                }
                keyboardType="numeric"
                style={[styles.priceInput, { color: gray900, backgroundColor: background, borderColor: '#e5e7eb' }]}
              />
            </View>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={[styles.clearBtn, { backgroundColor: background, borderColor: '#e5e7eb' }]} activeOpacity={0.85} onPress={clearFilters}>
              <ThemedText type="sm" weight="extrabold" style={{ color: gray900 }}>Clear All</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: primary }]} activeOpacity={0.85} onPress={() => setFilterPanelOpen(false)}>
              <ThemedText type="sm" weight="extrabold" style={{ color: '#fff' }}>Apply Filters</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Results */}
      <FlatList
        data={filteredSortedResults}
        keyExtractor={(p) => p.id}
        renderItem={renderPhotographer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.resultsHeader}>
            <ThemedText type="sm" weight="bold" style={{ color: gray500 }}>
              <ThemedText type="sm" weight="extrabold" style={{ color: gray900 }}>{filteredSortedResults.length}</ThemedText> photographers found
            </ThemedText>

            <TouchableOpacity style={[styles.sortBtn, { backgroundColor: background, borderColor: '#e5e7eb' }]} activeOpacity={0.85} onPress={() => setSortMenuOpen(true)}>
              <ThemedText type="sm" weight="extrabold" style={{ color: gray900 }}>{activeSort}</ThemedText>
              <Ionicons name="chevron-down" size={16} color={gray900} />
            </TouchableOpacity>

            {activeFilterCount > 0 ? (
              <View style={styles.activeTagsWrap}>
                {filters.categories.map((c) => (
                  <ActiveTag key={`cat-${c}`} text={c} onRemove={() => removeFilter('category', c)} />
                ))}
                {filters.locations.map((l) => (
                  <ActiveTag key={`loc-${l}`} text={`📍 ${l}`} onRemove={() => removeFilter('location', l)} />
                ))}
                {filters.ratings.map((r) => (
                  <ActiveTag key={`rat-${r}`} text={`${r}+ ★`} onRemove={() => removeFilter('rating', String(r))} />
                ))}
              </View>
            ) : null}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* Sort Modal */}
      <Modal visible={sortMenuOpen} transparent animationType="fade" onRequestClose={() => setSortMenuOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortMenuOpen(false)}>
          <View style={[styles.modalCard, { backgroundColor: background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="base" weight="extrabold" style={{ color: gray900 }}>Sort by</ThemedText>
              <TouchableOpacity onPress={() => setSortMenuOpen(false)} style={styles.iconBtnSm} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color={gray900} />
              </TouchableOpacity>
            </View>

            {sortOptions.map((opt) => {
              const active = opt === activeSort;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.modalItem, active ? { backgroundColor: '#eff6ff' } : null]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setActiveSort(opt);
                    setSortMenuOpen(false);
                  }}
                >
                  <ThemedText type="sm" weight={active ? "extrabold" : "bold"} style={{ color: active ? primary : gray900 }}>{opt}</ThemedText>
                  {active ? <Ionicons name="checkmark" size={18} color={primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default ClientSearch;

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, fontWeight: '700' },

  filterBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    columnGap: 8,
  },
  filterCount: {
    marginLeft: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterPanel: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },

  priceRow: { flexDirection: 'row', columnGap: 12, marginTop: 8 },
  priceCol: { flex: 1 },
  priceInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '800',
  },

  filterActions: { flexDirection: 'row', columnGap: 10, marginTop: 14 },
  clearBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  applyBtn: { flex: 2, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },

  listContent: { paddingHorizontal: 16, paddingBottom: 18 },
  resultsHeader: { paddingVertical: 14 },

  sortBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  activeTagsWrap: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  activeTag: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingLeft: 12, paddingRight: 6, paddingVertical: 8, columnGap: 8 },
  activeTagRemove: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },

  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  coverWrap: { height: 170, backgroundColor: '#e5e7eb' },
  coverImage: { width: '100%', height: '100%' },
  avatarWrap: { position: 'absolute', left: 14, bottom: -22, width: 56, height: 56, borderRadius: 16, padding: 3 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 14, backgroundColor: '#e5e7eb' },

  cardBody: { paddingHorizontal: 14, paddingTop: 30, paddingBottom: 14 },

  locationRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', columnGap: 6 },

  ratingRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  starsRow: { flexDirection: 'row', marginRight: 8, columnGap: 2 },

  tagsRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 8, marginBottom: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', justifyContent: 'center', padding: 16 },
  modalCard: { borderRadius: 18, padding: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 },
  iconBtnSm: { padding: 8 },

  modalItem: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
