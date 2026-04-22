import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PaymentReceipt from '../../components/PaymentReceipt';
import { ThemedText } from '../../components/themed-text';
import { useAppTheme } from '../../hooks/use-app-theme';
import { apiService, API_HOST } from '../../services/api';
import { socketService } from '../../services/socket';
import { storage } from '../../utils/storage';
import { RouteMap } from '../../components/RouteMap';

interface BookingManagementProps {
  onViewBooking?: (booking: any) => void;
}

export default function BookingManagement({ onViewBooking }: BookingManagementProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);

  const {
    primary,
    background,
    gray900,
    gray700,
    gray600,
    gray500,
    gray400,
    gray300,
    gray200,
    gray100,
    white,
    success,
    warning,
    error: errorColor,
    info
  } = useAppTheme();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [bookingToReject, setBookingToReject] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [fetchingClientDetail, setFetchingClientDetail] = useState(false);

  const handleViewClientProfile = async (client: any) => {
    // Set initial data immediately so the modal opens even if fetch fails
    setSelectedClient(client);
    setClientModalVisible(true);
    setFetchingClientDetail(true);

    const userId = client?.user_id || client?.id || client?.userId;
    if (!userId) {
      setFetchingClientDetail(false);
      return;
    }

    try {
      const token = await storage.getToken();
      if (!token) return;
      
      const res = await apiService.getUserById(userId, token);
      if (res.success && res.data) {
        // Handle nested user object, direct data, or single-item array
        let userData = res.data;
        if (Array.isArray(res.data) && res.data.length > 0) {
          userData = res.data[0];
        } else if (res.data.user) {
          userData = res.data.user;
        }
        
        setSelectedClient((prev: any) => ({
          ...prev, 
          ...userData,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch detailed client info:', err);
    } finally {
      setFetchingClientDetail(false);
    }
  };

  const avatarUri = (name: string, img?: any) => {
    if (!img) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=${primary.replace('#', '')}&color=fff&bold=true&size=128`;
    if (typeof img === "string" && img.startsWith("http")) return img;
    if (typeof img === "string" && img.startsWith("data:image")) return img;
    if (typeof img === "string") return `${API_HOST}${img.startsWith("/") ? "" : "/"}${img}`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=${primary.replace('#', '')}&color=fff&bold=true&size=128`;
  };
  const [allBookings, setAllBookings] = useState<{
    all: any[];
    pending: any[];
    confirmed: any[];
    completed: any[];
    cancelled: any[];
  }>({
    all: [],
    pending: [],
    confirmed: [],
    completed: [],
    cancelled: []
  });

  const fetchBookings = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      const response = await apiService.getMyBookings(token);
      const bookings = (response.data || []).map((b: any) => {
        const pStatus = (b.payment_status || b.payment?.status?.status_name || '')?.toUpperCase();
        const hasPaymentRecord = !!b.payment;
        const isPaid = ['COMPLETED', 'PAID', 'SUCCESSFUL'].includes(pStatus) || (hasPaymentRecord && pStatus !== 'FAILED');

        console.log(`[DEBUG] Booking ${b.booking_id}: pStatus=${pStatus}, hasPayment=${hasPaymentRecord}, isPaid=${isPaid}`);

        return {
          ...b,
          rawPaymentStatus: pStatus,
          paymentStatus: isPaid ? 'PAID' : 'UNPAID'
        };
      });
      const now = new Date();
      // Auto-complete ACCEPTED bookings whose date has passed
      for (const booking of bookings) {
        if (booking.status?.status_name === 'ACCEPTED' && booking.event_date) {
          const bookingEndDate = booking.end_date ? new Date(booking.end_date) : new Date(booking.event_date);
          // Set to end of day to be safe, or just check if now passed it
          if (bookingEndDate < now) {
            try {
              await apiService.updateBookingStatus(booking.booking_id, 'COMPLETED', token);
              booking.status = { ...booking.status, status_name: 'COMPLETED' };
            } catch (e) {
              console.error('Auto-complete failed for booking', booking.booking_id, e);
            }
          }
        }
      }

      setAllBookings({
        all: bookings,
        pending: bookings.filter((b: any) => b.status?.status_name === 'PENDING'),
        confirmed: bookings.filter((b: any) => b.status?.status_name === 'ACCEPTED'),
        completed: bookings.filter((b: any) => b.status?.status_name === 'COMPLETED'),
        cancelled: bookings.filter((b: any) => ['CANCELLED', 'REJECTED'].includes(b.status?.status_name)),
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    const handleNewBooking = (booking: any) => {
      fetchBookings();
    };

    const handleBookingCancelled = (bookingId: number) => {
      fetchBookings();
    };

    const handleBookingStatusUpdated = () => {
      fetchBookings();
    };

    socketService.on('new_booking', handleNewBooking);
    socketService.on('booking_cancelled', handleBookingCancelled);
    socketService.on('booking_status_updated', handleBookingStatusUpdated);
    socketService.on('booking_updated', handleBookingStatusUpdated);

    return () => {
      socketService.off('new_booking', handleNewBooking);
      socketService.off('booking_cancelled', handleBookingCancelled);
      socketService.off('booking_status_updated', handleBookingStatusUpdated);
      socketService.off('booking_updated', handleBookingStatusUpdated);
    };
  }, []);

  const handleAccept = async (bookingId: number) => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      // Find the booking to get its details
      const booking = allBookings.all.find(b => b.booking_id === bookingId);

      const response = await apiService.updateBookingStatus(bookingId, 'ACCEPTED', token);
      if (response.success) {
        // Automatically block the booking dates in the photographer's calendar
        if (booking) {
          try {
            // 1. Fetch CURRENT availability first to avoid overwriting
            const photographerId = booking.photographer_id;
            const currentAvailRes = await apiService.getPhotographerAvailability(photographerId);
            let currentBlockedDates: Array<{ date: string; reason: string }> = [];
            
            if (currentAvailRes.success && currentAvailRes.data) {
              currentBlockedDates = currentAvailRes.data.map(item => ({
                date: item.date.split('T')[0],
                reason: item.reason || ''
              }));
            }

            // 2. Prepare new dates to block
            const newDatesToBlock: Array<{ date: string; reason: string }> = [];
            const eventDate = new Date(booking.event_date);
            const endDate = booking.end_date ? new Date(booking.end_date) : null;

            const clientName = booking.client?.full_name || 'Client';
            const eventType = booking.event_type || 'Event';
            const reason = `Booked: ${eventType} - ${clientName}`;

            if (endDate) {
              const currentDate = new Date(eventDate);
              while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                newDatesToBlock.push({ date: dateStr, reason });
                currentDate.setDate(currentDate.getDate() + 1);
              }
            } else {
              const dateStr = eventDate.toISOString().split('T')[0];
              newDatesToBlock.push({ date: dateStr, reason });
            }

            // 3. Merge current and new, ensuring uniqueness by date
            const mergedMap = new Map<string, string>();
            currentBlockedDates.forEach(d => mergedMap.set(d.date, d.reason));
            newDatesToBlock.forEach(d => mergedMap.set(d.date, d.reason));

            const finalDates = Array.from(mergedMap.entries()).map(([date, reason]) => ({
              date,
              reason
            }));

            // 4. Save the merged list
            await apiService.savePhotographerAvailability(finalDates, token);
          } catch (availabilityError) {
            console.error('Error blocking dates in calendar:', availabilityError);
          }
        }

        Alert.alert('Success', 'Booking accepted! Client will be notified.');
        fetchBookings();
      }
    } catch (error) {
      console.error('Error accepting booking:', error);
      Alert.alert('Error', 'Failed to accept booking');
    }
  };

  const handleReject = (bookingId: number) => {
    setBookingToReject(bookingId);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const confirmRejection = async () => {
    if (!bookingToReject) return;
    if (!rejectReason.trim()) {
      Alert.alert("Reason Required", "Please provide a reason for rejection.");
      return;
    }

    try {
      setRejecting(true);
      const token = await storage.getToken();
      if (!token) return;

      const response = await apiService.updateBookingStatus(
        bookingToReject,
        "REJECTED",
        token,
        rejectReason.trim()
      );
      if (response.success) {
        Alert.alert("Rejected", "Booking rejected.");
        setRejectModalVisible(false);
        setBookingToReject(null);
        setRejectReason("");
        fetchBookings();
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      Alert.alert("Error", "Failed to reject booking");
    } finally {
      setRejecting(false);
    }
  };



  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status?: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'PENDING': return { bg: '#fef3c7', text: '#d97706' };
      case 'ACCEPTED': return { bg: '#dcfce7', text: '#16a34a' };
      case 'COMPLETED': return { bg: '#dbeafe', text: '#2563eb' };
      case 'CANCELLED':
      case 'REJECTED': return { bg: '#f3f4f6', text: '#6b7280' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderBookingCard = (booking: any) => {
    const statusLabel = booking.status?.status_name || 'PENDING';
    const statusStyle = getStatusColor(statusLabel);

    return (
      <View key={booking.booking_id} style={[styles.card, { backgroundColor: background }]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <TouchableOpacity onPress={() => handleViewClientProfile(booking.client)}>
              <Image
                source={{
                  uri: avatarUri(booking.client?.full_name || 'Client', booking.client?.profile_image)
                }}
                style={styles.clientAvatar}
              />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <View style={styles.nameStatusRow}>
                <ThemedText type="base" weight="semibold" style={{ color: gray900 }}>
                  {booking.client?.full_name || 'Generic Client'}
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <ThemedText
                      type="xs"
                      weight="medium"
                      style={{ color: statusStyle.text }}
                    >
                      {statusLabel}
                    </ThemedText>
                  </View>
                  {booking.paymentStatus === 'PAID' ? (
                    <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                      <ThemedText type="xs" weight="bold" style={{ color: '#16a34a' }}>PAID</ThemedText>
                    </View>
                  ) : (
                    booking.status?.status_name === 'ACCEPTED' && (
                      <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
                        <ThemedText type="xs" weight="bold" style={{ color: '#ef4444' }}>UNPAID</ThemedText>
                      </View>
                    )
                  )}
                </View>
              </View>
              <ThemedText type="sm" style={{ color: gray500 }}>
                {booking.event_type || 'Photography Session'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color={gray500} />
              <ThemedText type="sm" style={{ color: gray600 }}>{formatDate(booking.event_date)}</ThemedText>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color={gray500} />
              <ThemedText type="sm" style={{ color: gray600 }}>
                {new Date(booking.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </ThemedText>
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
                • {booking.package?.package_name || 'Standard'} Package
              </ThemedText>
            </View>
          </View>

          {booking.notes && (
            <View style={[styles.messageBox, { backgroundColor: gray100, marginBottom: 16 }]}>
              <ThemedText type="xs" style={{ color: gray600, fontStyle: 'italic' }}>
                "{booking.notes}"
              </ThemedText>
            </View>
          )}

          <View style={styles.actionContainer}>
            {(activeTab === 'pending' || (activeTab === 'all' && booking.status?.status_name === 'PENDING')) && (
              <>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(booking.booking_id)}
                >
                  <Ionicons name="close-outline" size={18} color="#ef4444" />
                  <ThemedText style={styles.rejectButtonText}>Reject</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAccept(booking.booking_id)}
                >
                  <Ionicons name="checkmark-outline" size={18} color="#fff" />
                  <ThemedText style={styles.acceptButtonText}>Accept</ThemedText>
                </TouchableOpacity>
              </>
            )}

            {(activeTab === 'confirmed' || activeTab === 'completed' || 
              (activeTab === 'all' && ['ACCEPTED', 'COMPLETED'].includes(booking.status?.status_name))) && (
              <>
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => {
                    setSelectedBooking(booking);
                    setDetailsModalVisible(true);
                  }}
                >
                  <Ionicons name="information-circle-outline" size={18} color={gray600} />
                  <ThemedText style={styles.viewDetailsButtonText}>View Details</ThemedText>
                </TouchableOpacity>

                {booking.paymentStatus === 'PAID' && (
                  <TouchableOpacity
                    style={[styles.viewDetailsButton, { backgroundColor: '#f0fdf4', borderColor: '#16a34a', borderWidth: 1 }]}
                    onPress={async () => {
                      try {
                        setReceiptLoading(true);
                        const token = await storage.getToken();
                        if (!token) return;
                        const res = await apiService.getPaymentDetails(booking.booking_id, token);
                        if (res.success && res.data) {
                          setReceiptData(res.data);
                          setShowReceiptModal(true);
                        }
                      } catch (err) {
                        console.error('Failed to fetch receipt:', err);
                        Alert.alert('Error', 'Failed to load receipt.');
                      } finally {
                        setReceiptLoading(false);
                      }
                    }}
                  >
                    <Ionicons name="receipt-outline" size={18} color="#16a34a" />
                    <ThemedText style={[styles.viewDetailsButtonText, { color: '#16a34a' }]}>Receipt</ThemedText>
                  </TouchableOpacity>
                )}
              </>
            )}

            {(activeTab === 'cancelled' || (activeTab === 'all' && ['CANCELLED', 'REJECTED'].includes(booking.status?.status_name))) && (
              <View style={[styles.viewDetailsButton, { backgroundColor: '#fee2e2', flex: 1 }]}>
                <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                <ThemedText style={[styles.viewDetailsButtonText, { color: '#ef4444' }]}>
                  {booking.status?.status_name === 'REJECTED' ? 'Rejected' : 'Cancelled'}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const currentBookings = allBookings[activeTab];

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 12 }]}>
        <ThemedText type="2xl" weight="bold" style={{ color: gray900, marginBottom: 20 }}>
          Booking Management
        </ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabsContainer}>
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  activeTab === tab && styles.tabButtonActive
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <ThemedText
                  type="sm"
                  weight={activeTab === tab ? "semibold" : "medium"}
                  style={{ color: activeTab === tab ? '#fff' : gray600 }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({allBookings[tab]?.length || 0})
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={primary} />
          <ThemedText type="base" weight="medium" style={{ color: gray500, marginTop: 10 }}>
            Loading bookings...
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={currentBookings.length ? styles.listContent : { flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {currentBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
              </View>
              <ThemedText type="lg" weight="semibold" style={{ color: gray900 }}>
                No bookings found
              </ThemedText>
              <ThemedText type="sm" style={styles.emptySubtext}>
                {activeTab === 'all'
                  ? "You don't have any bookings yet"
                  : `You have no ${activeTab} bookings`}
              </ThemedText>
            </View>
          ) : (
            currentBookings.map((booking) => renderBookingCard(booking))
          )}
        </ScrollView>
      )}

      {/* Booking Details Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="lg" weight="bold" style={styles.modalTitle}>Booking Details</ThemedText>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color={gray500} />
              </TouchableOpacity>
            </View>

            {selectedBooking ? (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Client Information */}
                <View style={[styles.modalSection, { borderBottomWidth: 1, borderBottomColor: gray100, paddingBottom: 20 }]}>
                  <ThemedText type="sm" weight="bold" style={styles.sectionTitle}>Client Information</ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => handleViewClientProfile(selectedBooking.client)}>
                        {selectedBooking.client?.profile_image ? (
                        <Image
                            source={{
                            uri: avatarUri(selectedBooking.client?.full_name || 'Client', selectedBooking.client?.profile_image)
                            }}
                            style={[styles.clientAvatar, { width: 50, height: 50, borderRadius: 25 }]}
                        />
                        ) : (
                        <View style={[styles.clientAvatar, { width: 50, height: 50, borderRadius: 25, backgroundColor: primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                            <ThemedText weight="bold" style={{ color: primary, fontSize: 18 }}>
                            {getInitials(selectedBooking.client?.full_name || 'Client')}
                            </ThemedText>
                        </View>
                        )}
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                      <ThemedText weight="bold" type="lg">{selectedBooking.client?.full_name || 'Client'}</ThemedText>
                      {selectedBooking.client?.email && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Ionicons name="mail-outline" size={14} color={gray500} />
                          <ThemedText type="xs" style={{ color: gray500, marginLeft: 4 }}>{selectedBooking.client?.email}</ThemedText>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={[styles.chatBtnCircle, { backgroundColor: primary + '15' }]}
                      onPress={() => {
                        setDetailsModalVisible(false);
                        onViewBooking?.(selectedBooking.booking_id);
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses" size={22} color={primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Event Details */}
                <View style={styles.modalSection}>
                  <ThemedText type="sm" weight="bold" style={styles.sectionTitle}>Event Details</ThemedText>
                  <View style={styles.infoRow}>
                    <Ionicons name="camera-outline" size={20} color={gray500} />
                    <ThemedText type="sm" style={styles.infoText}>{selectedBooking.event_type || 'Event'}</ThemedText>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color={gray500} />
                    <View>
                      <ThemedText type="sm" style={styles.infoText}>{formatDate(selectedBooking.event_date)}</ThemedText>
                      <ThemedText type="xs" style={styles.subInfoText}>
                        {new Date(selectedBooking.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {selectedBooking.end_date ? ` - ${new Date(selectedBooking.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={20} color={gray500} />
                    <ThemedText type="sm" style={styles.infoText}>{selectedBooking.location}</ThemedText>
                  </View>

                  {/* Route Map Section - Moved to standalone page */}
                  {selectedBooking.status?.status_name === 'ACCEPTED' && selectedBooking.location && (
                    <TouchableOpacity 
                      style={[styles.navigationPrompt, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }]}
                      onPress={() => router.push({ 
                        pathname: '/Photographer/NavigationMap' as any, 
                        params: { address: selectedBooking.location } 
                      })}
                    >
                      <View style={[styles.navIconCircle, { backgroundColor: primary }]}>
                        <Ionicons name="navigate" size={24} color="white" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 15 }}>
                        <ThemedText weight="bold" type="base" style={{ color: gray900 }}>Launch Navigation</ThemedText>
                        <ThemedText type="xs" style={{ color: gray500 }}>Turn-by-turn route to event</ThemedText>
                      </View>
                      <View style={{ backgroundColor: primary + '10', padding: 8, borderRadius: 20 }}>
                        <Ionicons name="chevron-forward" size={18} color={primary} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Package & Payment */}
                <View style={styles.modalSection}>
                  <ThemedText type="sm" weight="bold" style={styles.sectionTitle}>Package & Payment</ThemedText>
                  <View style={styles.infoRow}>
                    <Ionicons name="gift-outline" size={20} color={gray500} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="sm" style={styles.infoText}>{selectedBooking.package?.package_name || 'Standard Package'}</ThemedText>
                      {selectedBooking.package?.features && (
                        <ThemedText type="xs" style={styles.subInfoText}>{selectedBooking.package.features}</ThemedText>
                      )}
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="cash-outline" size={20} color={gray500} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <ThemedText type="sm" style={styles.infoText}>Status</ThemedText>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: (selectedBooking.paymentStatus === 'PAID') ? '#dcfce7' : '#fee2e2' }
                        ]}>
                          <ThemedText
                            weight="extrabold"
                            style={[
                              styles.statusBadgeText,
                              { color: (selectedBooking.paymentStatus === 'PAID') ? '#16a34a' : '#ef4444' }
                            ]}
                          >
                            {selectedBooking.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID'}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Earnings Breakdown */}
                      <View style={styles.breakdownBox}>
                        <View style={styles.breakdownRow}>
                          <ThemedText type="xs" style={styles.breakdownLabel}>Total Amount</ThemedText>
                          <ThemedText type="xs" weight="bold" style={styles.breakdownValue}>NPR {Number(selectedBooking.amount).toLocaleString()}</ThemedText>
                        </View>

                        {selectedBooking.payment?.commission_amount !== undefined && (
                          <>
                            <View style={styles.breakdownRow}>
                              <ThemedText type="xs" style={styles.breakdownLabel}>Platform Fee ({selectedBooking.payment.platform_fee_percentage}%)</ThemedText>
                              <ThemedText type="xs" weight="bold" style={[styles.breakdownValue, { color: '#ef4444' }]}>- NPR {Number(selectedBooking.payment.commission_amount).toLocaleString()}</ThemedText>
                            </View>
                            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                              <ThemedText type="sm" weight="bold" style={styles.breakdownLabelTotal}>Your Net Payout</ThemedText>
                              <ThemedText type="sm" weight="extrabold" style={[styles.breakdownValueTotal, { color: '#16a34a' }]}>NPR {Number(selectedBooking.payment.photographer_amount).toLocaleString()}</ThemedText>
                            </View>
                          </>
                        )}

                        {selectedBooking.payment?.commission_amount === undefined && (
                          <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                            <ThemedText type="sm" weight="bold" style={styles.breakdownLabelTotal}>Expected Earnings</ThemedText>
                            <ThemedText type="sm" weight="extrabold" style={[styles.breakdownValueTotal, { color: primary }]}>NPR {Number(selectedBooking.amount).toLocaleString()}*</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Notes */}
                {selectedBooking.notes && (
                  <View style={styles.modalSection}>
                    <ThemedText type="sm" weight="bold" style={styles.sectionTitle}>Client Notes</ThemedText>
                    <View style={styles.modalMessageBox}>
                      <ThemedText type="sm" style={styles.messageText}>{selectedBooking.notes}</ThemedText>
                    </View>
                  </View>
                )}

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                  {selectedBooking.status?.status_name === 'PENDING' ? (
                    <View style={styles.modalActionButtons}>
                      <TouchableOpacity
                        style={[styles.rejectButton, { flex: 1, paddingVertical: 14 }]}
                        onPress={() => {
                          setDetailsModalVisible(false);
                          handleReject(selectedBooking.booking_id);
                        }}
                      >
                        <ThemedText type="sm" weight="bold" style={styles.rejectButtonText}>Reject Booking</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.acceptButton, { flex: 1, paddingVertical: 14 }]}
                        onPress={() => {
                          setDetailsModalVisible(false);
                          handleAccept(selectedBooking.booking_id);
                        }}
                      >
                        <ThemedText type="sm" weight="bold" style={styles.acceptButtonText}>Accept Booking</ThemedText>
                      </TouchableOpacity>
                    </View>
                  ) : selectedBooking.status?.status_name === 'ACCEPTED' ? (
                    <View style={styles.modalActionButtons}>
                      {selectedBooking.paymentStatus === 'PAID' && (
                        <TouchableOpacity
                          style={[styles.acceptButton, { flex: 1, paddingVertical: 14, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#16a34a' }]}
                          onPress={async () => {
                            try {
                              setReceiptLoading(true);
                              const token = await storage.getToken();
                              if (!token) return;
                              const res = await apiService.getPaymentDetails(selectedBooking.booking_id, token);
                              if (res.success && res.data) {
                                setReceiptData(res.data);
                                setDetailsModalVisible(false);
                                setShowReceiptModal(true);
                              }
                            } catch (err) {
                              console.error('Failed to fetch receipt:', err);
                              Alert.alert('Error', 'Failed to load receipt.');
                            } finally {
                              setReceiptLoading(false);
                            }
                          }}
                        >
                          <Ionicons name="receipt-outline" size={16} color="#16a34a" style={{ marginRight: 6 }} />
                          <ThemedText type="sm" weight="bold" style={{ color: '#16a34a' }}>View Receipt</ThemedText>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.closeModalButton, { flex: 1 }]}
                        onPress={() => setDetailsModalVisible(false)}
                      >
                        <ThemedText type="sm" weight="bold" style={styles.closeModalButtonText}>Close</ThemedText>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.closeModalButton}
                      onPress={() => setDetailsModalVisible(false)}
                    >
                      <ThemedText type="sm" weight="bold" style={styles.closeModalButtonText}>Close</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            ) : (
              <View style={[styles.modalBody, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={primary} />
                <ThemedText style={{ marginTop: 12, color: gray500 }}>Loading details...</ThemedText>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Client Detail Modal (Admin Style) */}
      <ClientDetailModal
        user={selectedClient}
        loading={fetchingClientDetail}
        visible={clientModalVisible}
        onClose={() => {
            setClientModalVisible(false);
            setSelectedClient(null);
        }}
        avatarUri={avatarUri}
        primary={primary}
      />

      {/* Rejection Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setRejectModalVisible(false)}
        >
          <View style={[styles.modalContent, { height: 'auto', marginBottom: 20, borderRadius: 24 }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="lg" weight="bold" style={[styles.modalTitle, { color: errorColor }]}>Reject Booking</ThemedText>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={24} color={gray500} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <ThemedText type="sm" weight="bold" style={styles.modalRejectLabel}>Reason for Rejection</ThemedText>
              <ThemedText type="xs" style={{ color: gray500, marginBottom: 12 }}>Please let the client know why you're unable to accept this booking.</ThemedText>
              
              <TextInput
                style={[styles.rejectionTextInput, { borderColor: gray200, color: gray900, backgroundColor: '#f9fafb' }]}
                placeholder="e.g. I am already booked for another event on this date."
                placeholderTextColor={gray400}
                multiline
                numberOfLines={4}
                value={rejectReason}
                onChangeText={setRejectReason}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalRejectActions}>
              <TouchableOpacity 
                style={[styles.closeModalButton, { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: gray200 }]}
                onPress={() => setRejectModalVisible(false)}
              >
                <ThemedText type="sm" weight="bold" style={{ color: gray600 }}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmRejectButton, { flex: 1, backgroundColor: errorColor }]}
                onPress={confirmRejection}
                disabled={rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ThemedText type="sm" weight="bold" style={{ color: 'white' }}>Confirm Reject</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Receipt Modal */}
      {receiptData && (
        <PaymentReceipt
          visible={showReceiptModal}
          data={receiptData}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </View>
  );
}

// ── Client Detail Modal (Admin Style) ──────────────────────────────────────────
function ClientDetailModal({
    user, visible, onClose, avatarUri, primary, loading
  }: {
    user: any; visible: boolean; onClose: () => void;
    avatarUri: (n: string, img?: any) => string;
    primary: string;
    loading: boolean;
  }) {
    if (!user && !loading) return null;
  
    const STATUS_CFG = {
      ACTIVE: { label: "Active", dot: "#22c55e", bg: "#f0fdf4", text: "#15803d" },
      WARNING: { label: "Warning", dot: "#f59e0b", bg: "#fefce8", text: "#a16207" },
      BLOCKED: { label: "Blocked", dot: "#ef4444", bg: "#fef2f2", text: "#b91c1c" },
    };
    const st = (user.status || "ACTIVE") as keyof typeof STATUS_CFG;
    const cfg = STATUS_CFG[st] || STATUS_CFG.ACTIVE;
    const bookings = user._count?.bookings_as_client || user.bookings_count || user.totalBookings || 0;
    
    // Check for multiple possible phone keys (including nested profiles)
    const phone = user.phone || user.contact_number || user.phoneNumber || user.mobile || user.contact || 
                  user.profile?.phone || user.clientProfile?.phone || "Not provided";
                  
    // Check for multiple possible location keys
    const loc = user.location || user.address || user.city || user.district || 
                user.profile?.location || user.clientProfile?.location || "Not provided";
                
    const kyc = user.kyc_verified || user.is_kyc_verified ? "Verified" : "Not Verified";
    const joined = user.created_at || user.createdAt || user.date_joined || user.joined_date || null;
  
    const infoRows = [
      { icon: "person-outline" as const, label: "Role", value: user.role || "CLIENT" },
      { icon: "mail-outline" as const, label: "Email", value: user.email || "Not provided" },
      { icon: "calendar-outline" as const, label: "Total Bookings", value: String(bookings) },
      { icon: "call-outline" as const, label: "Phone", value: phone },
      { icon: "location-outline" as const, label: "Location", value: loc },
      { icon: "shield-checkmark-outline" as const, label: "KYC Status", value: kyc },
      { icon: "time-outline" as const, label: "Joined", value: joined ? new Date(joined).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—" },
    ].filter(row => {
      // Hide KYC for clients
      if (row.label === "KYC Status" && (user.role === "CLIENT" || !user.role)) return false;
      return true;
    });
  
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={ms.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
          <View style={ms.sheet}>
            <View style={ms.handle} />
  
            {/* Profile header */}
            <View style={ms.profileRow}>
              <Image
                source={{ uri: avatarUri(user.full_name, user.profile_image) }}
                style={ms.avatar}
              />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <ThemedText weight="extrabold" style={ms.name}>{user.full_name}</ThemedText>
                <ThemedText style={ms.emailText}>{user.email}</ThemedText>
                <View style={[ms.badge, { backgroundColor: cfg.bg }]}>
                  <View style={[ms.dot, { backgroundColor: cfg.dot }]} />
                  <ThemedText weight="bold" style={[ms.badgeText, { color: cfg.text }]}>{cfg.label}</ThemedText>
                </View>
              </View>
            </View>
  
            {/* Info rows */}
            <View style={ms.infoCard}>
              {loading ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={primary} />
                    <ThemedText style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>Fetching details...</ThemedText>
                </View>
              ) : (
                infoRows.map((r, i) => (
                    <View key={i} style={[ms.infoRow, i < infoRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }]}>
                    <View style={ms.infoIcon}>
                        <Ionicons name={r.icon} size={15} color={primary} />
                    </View>
                    <ThemedText style={ms.infoLabel}>{r.label}</ThemedText>
                    <ThemedText weight="bold" style={ms.infoVal}>{r.value}</ThemedText>
                    </View>
                ))
              )}
            </View>
  
            <TouchableOpacity onPress={onClose} style={[ms.closeBtn, { backgroundColor: primary }]}>
              <ThemedText weight="bold" style={{ color: "#fff", fontSize: 14 }}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
  
  const ms = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 36 },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#e2e8f0", alignSelf: "center", marginBottom: 20 },
    profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#f1f5f9" },
    name: { fontSize: 18, color: "#0f172a", marginBottom: 3 },
    emailText: { fontSize: 12, color: "#64748b", marginBottom: 8 },
    badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    badgeText: { fontSize: 11 },
    infoCard: { backgroundColor: "#f8fafc", borderRadius: 12, marginBottom: 20, overflow: "hidden", borderWidth: 1, borderColor: "#e9edf2" },
    infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
    infoIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center" },
    infoLabel: { flex: 1, fontSize: 13, color: "#64748b" },
    infoVal: { fontSize: 13, color: "#0f172a" },
    closeBtn: { paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  });

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    color: '#111827',
    marginBottom: 20,
  },
  tabsScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    minWidth: 100,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#4b5563',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
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
  messageBox: {
    padding: 12,
    borderRadius: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  navigationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  navIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#ef4444',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 14,
  },
  viewDetailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    backgroundColor: '#f3f4f6',
  },
  viewDetailsButtonText: {
    color: '#4b5563',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#111827',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    width: '80%',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: 'white',
  },
  messageButtonText: {
    fontSize: 13,
    color: '#2563eb',
  },
  deliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  deliveredButton: {
    backgroundColor: '#e5e7eb',
  },
  deliveredButtonText: {
    fontSize: 13,
    color: '#4b5563',
  },
  uploadButtonText: {
    fontSize: 13,
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    color: '#111827',
  },
  modalBody: {
    flex: 1,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modalClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 16,
  },
  modalClientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  modalClientName: {
    fontSize: 18,
    color: '#111827',
  },
  modalClientContact: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  subInfoText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  modalMessageBox: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  modalActions: {
    marginTop: 8,
    marginBottom: 30,
    gap: 12,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  closeModalButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  closeModalButtonText: {
    fontSize: 16,
    color: '#4b5563',
  },
  breakdownBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: {
    color: '#64748b',
  },
  breakdownValue: {
    color: '#1e293b',
  },
  breakdownTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginBottom: 0,
  },
  breakdownLabelTotal: {
    color: '#0f172a',
  },
  breakdownValueTotal: {
    fontSize: 15,
  },
  modalRejectLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '700',
  },
  rejectionTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  modalRejectActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  confirmRejectButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});
