import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BookingStatus = 'upcoming' | 'completed' | 'cancelled';

import ClientBottomNav from '../../components/ClientBottomNav';
import { API_HOST, apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { storage } from '../../utils/storage';

const toAbsoluteImageUrl = (url: string | null | undefined) => {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_HOST}${path}`;
};

interface Booking {
  id: string;
  photographerId: string;
  photographerName: string;
  photographerAvatar: string;
  photographerRating: number;
  serviceTitle: string;
  bookingDate: string;
  bookingTime: string;
  status: BookingStatus;
  location: string;
  amount: number;
  specialRequirements?: string;
  createdAt: string;
}

type Props = {
  onNavigate?: (screen: string, data?: any) => void;
};

export const ClientBookings: React.FC<Props> = ({ onNavigate }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<BookingStatus>('upcoming');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray600 = useThemeColor({}, 'gray600');
  const gray500 = useThemeColor({}, 'gray500');
  const gray400 = useThemeColor({}, 'gray400');
  const primary = useThemeColor({}, 'primary');
  const secondary = useThemeColor({}, 'secondary');
  const background = useThemeColor({}, 'background');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const token = await storage.getToken();
        if (!token) return;

        const res = await apiService.getMyBookings(token);
        if (res.success && res.data) {
          const mappedBookings = res.data.map((b: any) => {
            let mappedStatus = 'pending';
            const s = b.status?.status_name?.toUpperCase();
            if (s === 'ACCEPTED') mappedStatus = 'confirmed';
            else if (s === 'COMPLETED') mappedStatus = 'completed';
            else if (s === 'CANCELLED' || s === 'REJECTED') mappedStatus = 'cancelled';
            else mappedStatus = 'pending';

            return {
              id: String(b.booking_id),
              photographerId: b.photographer_id,
              photographerName: b.photographer?.full_name || 'Unknown',
              photographerAvatar: toAbsoluteImageUrl(b.photographer?.profile_image) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
              serviceTitle: b.package?.name || 'Service',
              bookingDate: b.event_date,
              bookingTime: new Date(b.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: mappedStatus,
              location: b.location,
              amount: Number(b.amount),
              packageName: b.package?.package_name || 'Standard Package',
              specialRequirements: b.notes,
              createdAt: b.created_at,
            };
          });
          setBookings(mappedBookings);
        }
      } catch (err: any) {
        console.error('Fetch bookings error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  useEffect(() => {
    const handleBookingUpdated = (updatedBooking: Booking) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
      );
      Alert.alert('Booking Update', `Your booking ${updatedBooking.id} has been ${updatedBooking.status}`);
    };

    socketService.on('booking_updated', handleBookingUpdated);
    return () => socketService.off('booking_updated', handleBookingUpdated);
  }, []);

  const filteredBookings = useMemo(() => {
    if (activeTab === 'upcoming') {
      return bookings.filter(b => b.status === 'pending' || b.status === 'confirmed');
    }
    return bookings.filter(b => b.status === activeTab);
  }, [activeTab, bookings]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusPillStyle = (status: string): StyleProp<ViewStyle> => {
    switch (status) {
      case 'pending': return [styles.statusPill, { backgroundColor: '#fef3c7' }];
      case 'confirmed': return [styles.statusPill, { backgroundColor: '#dcfce7' }];
      case 'completed': return [styles.statusPill, { backgroundColor: '#dbeafe' }];
      case 'cancelled':
      default: return [styles.statusPill, { backgroundColor: '#f3f4f6' }];
    }
  };

  const statusTextColor = (status: string): string => {
    switch (status) {
      case 'pending': return '#d97706';
      case 'confirmed': return '#16a34a';
      case 'completed': return '#2563eb';
      case 'cancelled':
      default: return '#6b7280';
    }
  };

  const TabButton = ({ tab }: { tab: BookingStatus }) => {
    const active = activeTab === tab;
    return (
      <TouchableOpacity
        onPress={() => setActiveTab(tab)}
        activeOpacity={0.8}
        style={[styles.tab, active ? { backgroundColor: '#2563eb' } : null]}
      >
        <ThemedText
          type="sm"
          weight={active ? "semibold" : "medium"}
          style={{ color: active ? '#fff' : gray600 }}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const renderBooking = ({ item: booking }: { item: any }) => {
    const statusLabel = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);

    return (
      <View style={[styles.card, { backgroundColor: background }]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Image source={{ uri: booking.photographerAvatar }} style={styles.avatar} />
            <View style={styles.headerInfo}>
              <View style={styles.nameStatusRow}>
                <ThemedText type="base" weight="semibold" style={{ color: gray900 }}>
                  {booking.photographerName}
                </ThemedText>
                <View style={statusPillStyle(booking.status)}>
                  <ThemedText
                    type="xs"
                    weight="medium"
                    style={{ color: statusTextColor(booking.status) }}
                  >
                    {statusLabel}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="sm" style={{ color: gray500 }}>
                {booking.serviceTitle || 'Product Shoot'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color={gray500} />
              <ThemedText type="sm" style={{ color: gray600 }}>{formatDate(booking.bookingDate)}</ThemedText>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color={gray500} />
              <ThemedText type="sm" style={{ color: gray600 }}>{booking.bookingTime}</ThemedText>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color={gray500} />
              <ThemedText type="sm" style={{ color: gray600 }}>{booking.location}</ThemedText>
            </View>
            <View style={styles.detailItem}>
              <ThemedText type="sm" weight="semibold" style={{ color: primary }}>
                NPR {booking.amount.toLocaleString()}
              </ThemedText>
              <ThemedText type="sm" style={{ color: gray500, marginLeft: 4 }}>
                • {booking.packageName}
              </ThemedText>
            </View>
          </View>

          <View style={styles.actionContainer}>
            {activeTab === 'upcoming' && (
              <TouchableOpacity
                style={[styles.messageBtn, { backgroundColor: '#eff6ff' }]}
                onPress={() => onNavigate?.('client-chat', { photographerId: booking.photographerId })}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#2563eb" />
                <ThemedText type="sm" weight="semibold" style={{ color: '#2563eb' }}>Message</ThemedText>
              </TouchableOpacity>
            )}

            {activeTab === 'completed' && (
              <TouchableOpacity
                style={[styles.reviewBtn, { backgroundColor: '#ffedd5' }]}
                onPress={() => router.push({ pathname: '/Client/client-write-review', params: { ...booking } })}
              >
                <Ionicons name="star-outline" size={18} color="#ea580c" />
                <ThemedText type="sm" weight="semibold" style={{ color: '#c2410c' }}>Write Review</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 12 }]}>
        <ThemedText type="2xl" weight="bold" style={{ color: gray900, marginBottom: 20 }}>
          My Bookings
        </ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {(['upcoming', 'completed', 'cancelled'] as const).map((tab) => (
            <TabButton key={tab} tab={tab} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={primary} />
          <ThemedText type="base" weight="medium" style={{ color: gray500, marginTop: 10 }}>
            Loading bookings...
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(b) => b.id}
          renderItem={renderBooking}
          contentContainerStyle={filteredBookings.length ? styles.listContent : styles.emptyWrap}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={34} color="#cbd5e1" />
              </View>
              <ThemedText type="lg" weight="semibold" style={{ color: gray900 }}>
                No bookings found
              </ThemedText>
              <ThemedText type="sm" style={{ color: gray500, textAlign: 'center', marginTop: 8, width: '80%' }}>
                {activeTab === 'upcoming'
                  ? "You don't have any upcoming bookings"
                  : `You have no ${activeTab} bookings`}
              </ThemedText>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: '#2563eb' }]}
                activeOpacity={0.85}
                onPress={() => onNavigate?.('client-advanced-search')}
              >
                <ThemedText type="sm" weight="semibold" style={{ color: '#fff' }}>
                  Browse Photographers
                </ThemedText>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      <ClientBottomNav />
    </View>
  );
};

export default ClientBookings;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 12
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    minWidth: 100,
    alignItems: 'center',
  },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  listContent: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    marginRight: 12
  },
  headerInfo: {
    flex: 1,
  },
  nameStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionContainer: {
    marginTop: 8,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyWrap: { flexGrow: 1, padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, marginTop: 60 },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyBtn: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
});
