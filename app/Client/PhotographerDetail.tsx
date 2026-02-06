import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number;
}

interface Review {
  id: string;
  clientName: string;
  clientAvatar: string;
  rating: number;
  date: string;
  text: string;
}

interface PortfolioPhoto {
  id: string;
  url: string;
  category: string;
}

type Props = {
  onBack?: () => void;
  onNavigate?: (screen: string, data?: any) => void;
};

export const PhotographerDetail: React.FC<Props> = ({ onBack, onNavigate }) => {
  // All hooks must be called unconditionally at the top
  const insets = useSafeAreaInsets();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [activePortfolioFilter, setActivePortfolioFilter] = useState('All');
  const [bioExpanded, setBioExpanded] = useState(false);
  const params = useLocalSearchParams();
  const [photographer, setPhotographer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id as string;
    if (!id) {
      setError('No photographer id provided.');
      setPhotographer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`http://192.168.1.198:8000/api/photographer/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Network error: ' + res.status);
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'API error');
        setPhotographer(json.data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch photographer');
        setPhotographer(null);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  // Always call useMemo, but use [] if data not loaded
  const portfolioPhotos: PortfolioPhoto[] = photographer && photographer.portfolioPhotos ? photographer.portfolioPhotos : [];
  const services: Service[] = [
    {
      id: '1',
      title: 'Wedding Photography Premium',
      description: 'Full day coverage with 2 photographers, 500+ edited photos, album included',
      price: 25000,
      duration: 8,
    },
    {
      id: '2',
      title: 'Portrait Session',
      description: 'Professional portrait session with 50 edited photos and prints',
      price: 8000,
      duration: 2,
    },
    {
      id: '3',
      title: 'Event Coverage',
      description: 'Corporate or social event photography with highlights video',
      price: 15000,
      duration: 4,
    },
  ];
  const filteredPortfolio = useMemo(() => {
    return activePortfolioFilter === 'All'
      ? portfolioPhotos
      : portfolioPhotos.filter((p: any) => p.category === activePortfolioFilter);
  }, [activePortfolioFilter, portfolioPhotos]);

  // Always call useMemo for selectedServicePrice
  const selectedServicePrice = useMemo(() => {
    if (!services || !Array.isArray(services)) return 0;
    const s = services.find((x) => x.id === selectedService);
    return s?.price ?? (services[0]?.price ?? 0);
  }, [selectedService, services]);

  // Early return UI states, but do NOT call hooks conditionally
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading photographer...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'red' }}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!photographer) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>No photographer data found.</Text>
        </View>
      </View>
    );
  }


  const reviews: Review[] = [
    {
      id: '1',
      clientName: 'Anjali Poudel',
      clientAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
      rating: 5,
      date: '2 weeks ago',
      text: 'Ramesh did an amazing job at our wedding! The photos are absolutely stunning and captured every precious moment. Highly recommended!',
    },
    {
      id: '2',
      clientName: 'Suresh Karki',
      clientAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
      rating: 5,
      date: '1 month ago',
      text: 'Very professional and creative. The portrait session was fantastic and I love all the photos!',
    },
  ];



  const portfolioCategories = ['All', 'Wedding', 'Portrait', 'Events', 'Product'];




  const ratingBreakdown = [
    { stars: 5, count: 105, percentage: 83 },
    { stars: 4, count: 18, percentage: 14 },
    { stars: 3, count: 3, percentage: 2 },
    { stars: 2, count: 1, percentage: 1 },
    { stars: 1, count: 0, percentage: 0 },
  ];

  const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => {
    const full = Math.floor(rating);
    return (
      <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < full ? 'star' : 'star-outline'}
            size={size}
            color={i < full ? '#f59e0b' : '#d1d5db'}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header Image */}
        <View style={[styles.headerImageWrap, { height: 220 + insets.top }]}>
          <Image source={{ uri: photographer.coverImage }} style={styles.headerImage} />
          <View style={styles.headerOverlay} />

          <TouchableOpacity onPress={onBack} style={[styles.headerBtn, { left: 12, top: insets.top + 12 }]} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.headerBtn, { right: 12, top: insets.top + 12 }]} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <Image source={{ uri: photographer.avatar }} style={styles.profileAvatar} />

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.profileName} numberOfLines={1}>
                {photographer.name}
              </Text>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {photographer.location}
                </Text>
              </View>

              <View style={styles.ratingRow}>
                <Stars rating={photographer.rating} />
                <Text style={styles.ratingValue}>{photographer.rating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({photographer.reviewCount} reviews)</Text>
              </View>
            </View>
          </View>

          <View style={styles.badgesRow}>
            {photographer.badges.map((badge: string) => (
              <View key={badge} style={styles.badge}>
                <Ionicons name="star-outline" size={14} color="#1e3a8a" />
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{photographer.completedProjects}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{photographer.totalPhotos}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{photographer.responseTime}</Text>
            <Text style={styles.statLabel}>Response</Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>
            {bioExpanded ? photographer.bio : `${photographer.bio.substring(0, 150)}...`}
          </Text>
          <TouchableOpacity onPress={() => setBioExpanded((s) => !s)} activeOpacity={0.85}>
            <Text style={styles.readMore}>{bioExpanded ? 'Show less' : 'Read more'}</Text>
          </TouchableOpacity>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>

          {services.map((service) => {
            const active = selectedService === service.id;
            return (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceCard, active ? styles.serviceCardActive : null]}
                activeOpacity={0.9}
                onPress={() => setSelectedService(service.id)}
              >
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceTitle} numberOfLines={1}>
                    {service.title}
                  </Text>
                  <Text style={styles.servicePrice}>NPR {service.price.toLocaleString()}</Text>
                </View>

                <Text style={styles.serviceDesc}>{service.description}</Text>

                <View style={styles.serviceMetaRow}>
                  <Ionicons name="time-outline" size={14} color="#6b7280" />
                  <Text style={styles.serviceMetaText}>{service.duration} hours</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Portfolio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {portfolioCategories.map((category) => {
              const active = activePortfolioFilter === category;
              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => setActivePortfolioFilter(category)}
                  activeOpacity={0.85}
                  style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipInactive]}
                >
                  <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : styles.filterChipTextInactive]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <FlatList
            data={filteredPortfolio}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <View style={styles.portfolioItem}>
                <Image source={{ uri: item.url }} style={styles.portfolioImage} />
              </View>
            )}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={styles.portfolioRow}
            contentContainerStyle={{ paddingTop: 10 }}
          />

          <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.85}>
            <Text style={styles.viewAllBtnText}>View All Photos ({photographer.totalPhotos})</Text>
          </TouchableOpacity>
        </View>

        {/* Reviews */}
        <View style={[styles.section, { paddingBottom: 24 }]}>
          <Text style={styles.sectionTitle}>Reviews</Text>

          <View style={styles.reviewsSummary}>
            <View style={styles.reviewsScore}>
              <Text style={styles.scoreValue}>{photographer.rating.toFixed(1)}</Text>
              <Stars rating={photographer.rating} size={16} />
              <Text style={styles.scoreCount}>{photographer.reviewCount} reviews</Text>
            </View>

            <View style={styles.breakdown}>
              {ratingBreakdown.map((item) => (
                <View key={item.stars} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{item.stars}★</Text>
                  <View style={styles.breakdownBar}>
                    <View style={[styles.breakdownFill, { width: `${item.percentage}%` }]} />
                  </View>
                  <Text style={styles.breakdownCount}>{item.count}</Text>
                </View>
              ))}
            </View>
          </View>

          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Image source={{ uri: review.clientAvatar }} style={styles.reviewAvatar} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.reviewName}>{review.clientName}</Text>
                  <View style={styles.reviewMeta}>
                    <Stars rating={review.rating} />
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.85}>
            <Text style={styles.viewAllBtnText}>View All Reviews ({photographer.reviewCount})</Text>
          </TouchableOpacity>

          {/* spacer for fixed bar */}
          <View style={{ height: 86 }} />
        </View>
      </ScrollView>

      {/* Fixed Booking Bar */}
      <View style={styles.bookingBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bookingAmount}>NPR {selectedServicePrice.toLocaleString()}+</Text>
          <Text style={styles.bookingLabel}>Starting price</Text>
        </View>

        <TouchableOpacity
          style={[styles.bookingBtn, styles.bookingBtnSecondary]}
          activeOpacity={0.85}
          onPress={() => onNavigate?.('client-chat', { photographerId: photographer.id })}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#1e3a8a" />
          <Text style={styles.bookingBtnSecondaryText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bookingBtn, styles.bookingBtnPrimary]}
          activeOpacity={0.85}
          onPress={() => onNavigate?.('client-booking-request', { photographer, selectedService })}
        >
          <Text style={styles.bookingBtnPrimaryText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PhotographerDetail;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 0 },

  headerImageWrap: { height: 220, backgroundColor: '#e5e7eb' },
  headerImage: { width: '100%', height: '100%' },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  headerBtn: {
    position: 'absolute',
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(17,24,39,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  profileTop: { flexDirection: 'row', alignItems: 'center' },
  profileAvatar: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#e5e7eb' },
  profileName: { fontSize: 16, fontWeight: '900', color: '#111827' },

  locationRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  locationText: { color: '#6b7280', fontWeight: '700', flex: 1 },

  ratingRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  starsRow: { flexDirection: 'row', columnGap: 2, marginRight: 8 },
  ratingValue: { color: '#111827', fontWeight: '900', marginRight: 6 },
  ratingCount: { color: '#9ca3af', fontWeight: '800', fontSize: 12 },

  badgesRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: { color: '#1e3a8a', fontWeight: '900', fontSize: 12 },

  statsRow: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    flexDirection: 'row',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#111827', fontWeight: '900', fontSize: 15 },
  statLabel: { marginTop: 4, color: '#9ca3af', fontWeight: '800', fontSize: 12 },

  section: { marginTop: 12, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#f3f4f6' },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 10 },

  bioText: { color: '#374151', fontWeight: '700', lineHeight: 18 },
  readMore: { marginTop: 10, color: '#2563eb', fontWeight: '900' },

  serviceCard: { padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10, backgroundColor: '#fff' },
  serviceCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceTitle: { flex: 1, paddingRight: 10, color: '#111827', fontWeight: '900' },
  servicePrice: { color: '#1e3a8a', fontWeight: '900' },
  serviceDesc: { marginTop: 6, color: '#6b7280', fontWeight: '700', lineHeight: 18 },
  serviceMetaRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  serviceMetaText: { color: '#6b7280', fontWeight: '800' },

  filterRow: { paddingVertical: 6, columnGap: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  filterChipActive: { backgroundColor: '#2563eb' },
  filterChipInactive: { backgroundColor: '#f3f4f6' },
  filterChipText: { fontWeight: '900', fontSize: 13 },
  filterChipTextActive: { color: '#fff' },
  filterChipTextInactive: { color: '#374151' },

  portfolioRow: { columnGap: 10 },
  portfolioItem: { flex: 1, aspectRatio: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#e5e7eb', marginBottom: 10 },
  portfolioImage: { width: '100%', height: '100%' },

  viewAllBtn: { marginTop: 6, backgroundColor: '#f3f4f6', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  viewAllBtnText: { fontWeight: '900', color: '#111827' },

  reviewsSummary: { flexDirection: 'row', columnGap: 12 },
  reviewsScore: { width: 120, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  scoreValue: { fontSize: 26, fontWeight: '900', color: '#111827' },
  scoreCount: { marginTop: 6, color: '#6b7280', fontWeight: '800', fontSize: 12, textAlign: 'center' },

  breakdown: { flex: 1, justifyContent: 'center' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  breakdownLabel: { width: 34, color: '#6b7280', fontWeight: '900', fontSize: 12 },
  breakdownBar: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' },
  breakdownFill: { height: '100%', backgroundColor: '#f59e0b' },
  breakdownCount: { width: 34, textAlign: 'right', color: '#6b7280', fontWeight: '900', fontSize: 12 },

  reviewCard: { marginTop: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', backgroundColor: '#fff' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center' },
  reviewAvatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#e5e7eb' },
  reviewName: { fontWeight: '900', color: '#111827' },
  reviewMeta: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewDate: { marginLeft: 10, color: '#9ca3af', fontWeight: '800', fontSize: 12 },
  reviewText: { marginTop: 10, color: '#374151', fontWeight: '700', lineHeight: 18 },

  bookingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  bookingAmount: { color: '#111827', fontWeight: '900', fontSize: 16 },
  bookingLabel: { marginTop: 2, color: '#9ca3af', fontWeight: '800', fontSize: 12 },

  bookingBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', columnGap: 8 },
  bookingBtnSecondary: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  bookingBtnSecondaryText: { color: '#1e3a8a', fontWeight: '900' },
  bookingBtnPrimary: { backgroundColor: '#2563eb' },
  bookingBtnPrimaryText: { color: '#fff', fontWeight: '900' },
});


