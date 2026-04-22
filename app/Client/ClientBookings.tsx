import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

import ClientBottomNav from '../../components/ClientBottomNav';
import PaymentReceipt from '../../components/PaymentReceipt';
import { API_HOST, apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { storage } from '../../utils/storage';
import KhaltiWebView from './KhaltiWebView';

const toAbsoluteImageUrl = (url: string | null | undefined) => {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_HOST}${path}`;
};

// Define types for Tabs and Booking Status
type TabType = 'upcoming' | 'completed' | 'cancelled';
type BookingStatusType = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';

interface Booking {
  id: string;
  photographerId: string;
  photographerName: string;
  photographerAvatar: string;
  photographerRating: number;
  serviceTitle: string;
  bookingDate: string;
  bookingTime: string;
  status: BookingStatusType;
  location: string;
  amount: number;
  specialRequirements?: string;
  createdAt: string;
  paymentStatus?: 'COMPLETED' | 'PENDING' | 'FAILED';
  paymentMethod?: string;
  packageName?: string;
}

type Props = {
  onNavigate?: (screen: string, data?: any) => void;
};

export const ClientBookings: React.FC<Props> = ({ onNavigate }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment State
  const [showKhaltiWebView, setShowKhaltiWebView] = useState(false);
  const [khaltiUrl, setKhaltiUrl] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [currentPaymentBooking, setCurrentPaymentBooking] = useState<Booking | null>(null);

  // Receipt State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const currentBookingIdRef = useRef<string | null>(null);

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
          const mappedBookings: Booking[] = res.data.map((b: any) => {
            let mappedStatus: BookingStatusType = 'pending';
            const s = b.status?.status_name?.toUpperCase();
            if (s === 'ACCEPTED') mappedStatus = 'confirmed';
            else if (s === 'COMPLETED') mappedStatus = 'completed';
            else if (s === 'CANCELLED') mappedStatus = 'cancelled';
            else if (s === 'REJECTED') mappedStatus = 'rejected';
            else mappedStatus = 'pending';

            // Check payment status from direct field or nested object
            const pStatus = (b.payment_status || b.payment?.status?.status_name)?.toUpperCase();
            const paymentStatus = pStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING';

            return {
              id: String(b.booking_id),
              photographerId: b.photographer_id,
              photographerName: b.photographer?.full_name || 'Unknown',
              photographerAvatar: toAbsoluteImageUrl(b.photographer?.profile_image) || '',
              photographerRating: 0, // Default rating as it's missing in API response
              serviceTitle: b.package?.name || 'Service',
              bookingDate: b.event_date,
              bookingTime: new Date(b.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: mappedStatus,
              location: b.location,
              amount: Number(b.amount),
              packageName: b.package?.name || 'Standard Package',
              specialRequirements: b.notes,
              createdAt: b.created_at,
              paymentStatus: paymentStatus,
              paymentMethod: b.payment?.method?.method_name
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
    const handleBookingUpdated = (updatedBooking: any) => {
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id === updatedBooking.id) {
            // Normalize status from socket (which sends lowercase status name)
            let mappedStatus = b.status; // default to current
            if (updatedBooking.status) {
              const s = updatedBooking.status.toUpperCase();
              if (s === 'ACCEPTED') mappedStatus = 'confirmed';
              else if (s === 'COMPLETED') mappedStatus = 'completed';
              else if (s === 'CANCELLED') mappedStatus = 'cancelled';
              else if (s === 'REJECTED') mappedStatus = 'rejected';
              else if (s === 'PENDING') mappedStatus = 'pending';
            }

            return {
              ...b,
              ...updatedBooking,
              status: mappedStatus,
              paymentStatus: updatedBooking.paymentStatus || b.paymentStatus
            };
          }
          return b;
        })
      );

      // If receipt data is present in the socket event, show it
      if (updatedBooking.receiptData) {
        setReceiptData(updatedBooking.receiptData);
        setShowReceiptModal(true);
        // Also close webview if open (though it should be closed by intercept logic)
        setShowKhaltiWebView(false);
      }

      Alert.alert('Booking Update', `Your booking payment #${updatedBooking.id} has been updated.`);
    };


    socketService.on('booking_updated', handleBookingUpdated);

    // Ensure we join the user's room to receive updates
    const joinSocketRoom = async () => {
      try {
        const token = await storage.getToken();
        if (token) {
          // Decode token to get user ID (simple decode or use a library)
          // Assuming simple JWT structure where payload is part 2
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.user_id || payload.id || payload.sub;

          if (userId) {
            socketService.emit('join_room', userId);
            console.log('Joined socket room:', userId);
          }
        }
      } catch (e) {
        console.error('Error joining socket room:', e);
      }
    };

    joinSocketRoom();

    return () => socketService.off('booking_updated', handleBookingUpdated);
  }, []);

  const handlePayNow = async (booking: Booking) => {
    try {
      setPaymentLoading(true);
      setCurrentPaymentBooking(booking);
      currentBookingIdRef.current = String(booking.id);
      console.log("[Payment] Initiating for booking:", booking.id);
      const token = await storage.getToken();

      if (!token) return;

      const initiateRes = await apiService.initiatePayment({
        booking_id: Number(booking.id),
        amount: booking.amount * 100, // Convert to paisa
        return_url: `https://example.com/payment/?booking_id=${booking.id}`,
        website_url: "https://example.com/"
      }, token);

      if (initiateRes.success && initiateRes.data && initiateRes.data.payment_url) {
        setKhaltiUrl(initiateRes.data.payment_url);
        setShowKhaltiWebView(true);
      } else {
        Alert.alert("Payment Error", "Failed to initiate payment. Please try again.");
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
      Alert.alert("Payment Error", "Failed to initiate payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleKhaltiSuccess = async (pidx: string, extractedBookingId?: string) => {
    setShowKhaltiWebView(false);
    setPaymentLoading(true);
    try {
      const token = await storage.getToken();
      if (!token) return;

      const bookingId = extractedBookingId || currentBookingIdRef.current || currentPaymentBooking?.id;
      console.log("[Payment] Verifying for pidx:", pidx, "Booking ID (Extracted/Ref/State):", bookingId);

      const verifyRes = await apiService.verifyPayment(pidx, token, bookingId ? Number(bookingId) : undefined);
      if (verifyRes.success) {
        // Manually update local state for immediate UI feedback
        if (currentPaymentBooking) {
          setBookings(prev => prev.map(b =>
            b.id === currentPaymentBooking.id
              ? { ...b, paymentStatus: 'COMPLETED', status: 'confirmed' }
              : b
          ));

          // Use payment details from backend response (includes commission breakdown)
          const pd = verifyRes.paymentDetails;
          const user = await storage.getUser();
          setReceiptData({
            transactionId: pd?.transactionId || pidx,
            date: pd?.date || new Date().toLocaleDateString(),
            amount: pd?.amount || Number(currentPaymentBooking.amount),
            method: pd?.method || 'Khalti',
            photographerName: pd?.photographerName || currentPaymentBooking.photographerName,
            packageName: pd?.packageName || currentPaymentBooking.packageName || "Package",
            bookingDates: pd?.bookingDates || [currentPaymentBooking.bookingDate],
            customerName: pd?.customerName || user?.full_name || "You",
            customerEmail: pd?.customerEmail || user?.email || "",
            platformFeePercentage: pd?.platformFeePercentage || 0,
            commissionAmount: pd?.commissionAmount || 0,
            photographerAmount: pd?.photographerAmount || 0
          });
          setShowReceiptModal(true);
        }
      } else {
        Alert.alert("Payment Verification Failed", "Payment was not verified. Please contact support.");
      }
    } catch (error) {
      console.error("Verification error", error);
      Alert.alert("Error", "Failed to verify payment.");
    } finally {
      setPaymentLoading(false);
      setCurrentPaymentBooking(null);
    }
  };

  const filteredBookings = useMemo(() => {
    if (activeTab === 'upcoming') {
      return bookings.filter(b => b.status === 'pending' || b.status === 'confirmed');
    }
    // Filter by exact status for other tabs
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
  }

  const TabButton = ({ tab }: { tab: TabType }) => {
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
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={statusPillStyle(booking.status)}>
                    <ThemedText
                      type="xs"
                      weight="medium"
                      style={{ color: statusTextColor(booking.status) }}
                    >
                      {statusLabel}
                    </ThemedText>
                  </View>
                  {booking.paymentStatus === 'COMPLETED' && (
                    <View style={[styles.statusPill, { backgroundColor: '#dcfce7' }]}>
                      <ThemedText type="xs" weight="bold" style={{ color: '#16a34a' }}>PAID</ThemedText>
                    </View>
                  )}
                  {booking.status === 'confirmed' && booking.paymentStatus !== 'COMPLETED' && (
                    <View style={[styles.statusPill, { backgroundColor: '#fee2e2' }]}>
                      <ThemedText type="xs" weight="bold" style={{ color: '#ef4444' }}>UNPAID</ThemedText>
                    </View>
                  )}
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
              <View />
            )}

            {booking.status === 'confirmed' && booking.paymentStatus !== 'COMPLETED' && (
              <TouchableOpacity
                style={styles.payViaKhaltiBtn}
                onPress={() => handlePayNow(booking)}
              >
                <Image
                  source={require('../../assets/images/khalti-logo.png')}
                  style={{ width: 80, height: 24, resizeMode: 'contain', marginRight: 8 }}
                />
                <ThemedText type="sm" weight="bold" style={{ color: '#ef4444' }}>Pay via Khalti</ThemedText>
              </TouchableOpacity>
            )}

            {booking.paymentStatus === 'COMPLETED' && (
              <TouchableOpacity
                style={[styles.payViaKhaltiBtn, { borderColor: '#16a34a', backgroundColor: '#f0fdf4' }]}
                onPress={async () => {
                  try {
                    const token = await storage.getToken();
                    if (!token) return;
                    const res = await apiService.getPaymentDetails(Number(booking.id), token);
                    if (res.success && res.data) {
                      setReceiptData(res.data);
                    } else {
                      // Fallback to basic data
                      setReceiptData({
                        transactionId: `BOOKING-${booking.id}`,
                        date: new Date(booking.bookingDate).toLocaleDateString(),
                        amount: booking.amount,
                        method: booking.paymentMethod || 'Khalti',
                        photographerName: booking.photographerName,
                        packageName: booking.packageName || "Package",
                        bookingDates: [new Date(booking.bookingDate).toLocaleDateString()],
                        customerName: "You",
                        customerEmail: ""
                      });
                    }
                    setShowReceiptModal(true);
                  } catch (err) {
                    console.error('Failed to fetch payment details:', err);
                    Alert.alert('Error', 'Failed to load receipt details.');
                  }
                }}
              >
                <Ionicons name="receipt-outline" size={20} color="#16a34a" style={{ marginRight: 8 }} />
                <ThemedText type="sm" weight="bold" style={{ color: '#16a34a' }}>Download Receipt</ThemedText>
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

      <KhaltiWebView
        visible={showKhaltiWebView}
        paymentUrl={khaltiUrl}
        onClose={() => setShowKhaltiWebView(false)}
        onPaymentComplete={(pidx, bId) => handleKhaltiSuccess(pidx, bId)}
      />

      {receiptData && (
        <PaymentReceipt
          visible={showReceiptModal}
          data={receiptData}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
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
  payViaKhaltiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#ef4444',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
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
