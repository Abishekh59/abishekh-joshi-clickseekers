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
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/themed-text';
import { useAppTheme } from '../../hooks/use-app-theme';
import { API_HOST, apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { storage } from '../../utils/storage';

interface BookingManagementProps {
  onViewBooking?: (booking: any) => void;
}

export default function BookingManagement({ onViewBooking }: BookingManagementProps) {
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
      if (response.success && response.data) {
        const bookings = response.data;
        setAllBookings({
          all: bookings,
          pending: bookings.filter((b: any) => b.status?.status_name === 'PENDING'),
          confirmed: bookings.filter((b: any) => b.status?.status_name === 'ACCEPTED'),
          completed: bookings.filter((b: any) => b.status?.status_name === 'COMPLETED'),
          cancelled: bookings.filter((b: any) => ['CANCELLED', 'REJECTED'].includes(b.status?.status_name)),
        });
      }
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

    return () => {
      socketService.off('new_booking', handleNewBooking);
      socketService.off('booking_cancelled', handleBookingCancelled);
      socketService.off('booking_status_updated', handleBookingStatusUpdated);
    };
  }, []);

  const handleAccept = async (bookingId: number) => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      const response = await apiService.updateBookingStatus(bookingId, 'ACCEPTED', token);
      if (response.success) {
        Alert.alert('Success', 'Booking accepted! Client will be notified.');
        fetchBookings();
      }
    } catch (error) {
      console.error('Error accepting booking:', error);
      Alert.alert('Error', 'Failed to accept booking');
    }
  };

  const handleReject = (bookingId: number) => {
    Alert.alert(
      'Reject Booking',
      'Are you sure you want to reject this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: async () => {
            try {
              const token = await storage.getToken();
              if (!token) return;

              const response = await apiService.updateBookingStatus(bookingId, 'REJECTED', token);
              if (response.success) {
                Alert.alert('Rejected', 'Booking rejected.');
                fetchBookings();
              }
            } catch (error) {
              console.error('Error rejecting booking:', error);
              Alert.alert('Error', 'Failed to reject booking');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleMarkCompleted = (bookingId: number) => {
    Alert.alert(
      'Mark as Completed',
      'Are you sure you want to mark this booking as completed? This will verify that photos have been delivered.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const token = await storage.getToken();
              if (!token) return;

              const response = await apiService.updateBookingStatus(bookingId, 'COMPLETED', token);
              if (response.success) {
                Alert.alert('Success', 'Booking marked as completed.');
                fetchBookings();
              }
            } catch (error) {
              console.error('Error completing booking:', error);
              Alert.alert('Error', 'Failed to update status');
            }
          }
        }
      ]
    );
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
    switch (status) {
      case 'PENDING': return { bg: '#fef3c7', text: warning };
      case 'ACCEPTED': return { bg: '#d1fae5', text: success };
      case 'COMPLETED': return { bg: '#dbeafe', text: info };
      case 'CANCELLED':
      case 'REJECTED': return { bg: '#fee2e2', text: errorColor };
      default: return { bg: gray100, text: gray600 };
    }
  };

  const renderBookingCard = (booking: any) => (
    <View key={booking.booking_id} style={styles.bookingCard}>
      {/* Client Section */}
      <View style={styles.clientSection}>
        <Image
          source={{
            uri: booking.client?.profile_image
              ? `${API_HOST}${booking.client.profile_image}`
              : 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200'
          }}
          style={styles.clientAvatar}
        />
        <View style={styles.clientInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <ThemedText weight="bold" style={styles.clientName}>{booking.client?.full_name || 'Generic Client'}</ThemedText>
              <ThemedText type="xs" weight="medium" style={styles.eventType}>{booking.event_type || 'Event'}</ThemedText>
            </View>
            {activeTab === 'all' && (
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(booking.status?.status_name).bg }
              ]}>
                <ThemedText weight="extrabold" style={[
                  styles.statusBadgeText,
                  { color: getStatusColor(booking.status?.status_name).text }
                ]}>{booking.status?.status_name}</ThemedText>
              </View>
            )}
          </View>
          <ThemedText type="sm" weight="bold" style={styles.bookingAmount}>NPR {booking.amount.toLocaleString()}</ThemedText>
        </View>
      </View>

      {/* Booking Details */}
      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={gray400} />
          <View style={styles.detailContent}>
            <ThemedText type="sm" weight="medium" style={styles.detailDate}>{formatDate(booking.event_date)}</ThemedText>
            {/* Booking model doesn't seem to have a explicit time field, using date for now */}
            <ThemedText type="xs" style={styles.detailTime}>{new Date(booking.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color={gray400} />
          <ThemedText type="sm" style={styles.detailLocation}>{booking.location}</ThemedText>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="gift" size={16} color={gray400} />
          <ThemedText type="sm" style={styles.detailPackage}>{booking.package?.package_name || 'Standard'} Package</ThemedText>
        </View>

        {booking.notes && (
          <View style={styles.messageBox}>
            <ThemedText type="xs" style={styles.messageText}>{booking.notes}</ThemedText>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        {(activeTab === 'pending' || (activeTab === 'all' && booking.status?.status_name === 'PENDING')) && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.rejectButton, { flex: 0.8, paddingHorizontal: 4 }]}
              onPress={() => handleReject(booking.booking_id)}
            >
              <Ionicons name="close" size={16} color={errorColor} />
              <ThemedText type="xs" weight="bold" style={styles.rejectButtonText} numberOfLines={1}>Reject</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewDetailsButton, { backgroundColor: white, flex: 1.2, borderWidth: 1, borderColor: gray300, marginHorizontal: 4 }]}
              onPress={() => {
                setSelectedBooking(booking);
                setDetailsModalVisible(true);
              }}
            >
              <ThemedText type="xs" weight="bold" style={[styles.viewDetailsButtonText, { color: gray700 }]} numberOfLines={1}>View Details</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, { flex: 0.8, paddingHorizontal: 4 }]}
              onPress={() => handleAccept(booking.booking_id)}
            >
              <Ionicons name="checkmark" size={16} color={white} />
              <ThemedText type="xs" weight="bold" style={styles.acceptButtonText} numberOfLines={1}>Accept</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {(activeTab === 'confirmed' || (activeTab === 'all' && booking.status?.status_name === 'ACCEPTED')) && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => onViewBooking?.(booking)}
            >
              <Ionicons name="chatbubble" size={16} color={info} />
              <ThemedText type="xs" weight="bold" style={styles.messageButtonText}>Message</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deliveryButton, { flex: 1, backgroundColor: success, paddingTop: 10, paddingBottom: 10 }]}
              onPress={() => handleMarkCompleted(booking.booking_id)}
            >
              <Ionicons name="checkmark-done-circle" size={18} color={white} />
              <ThemedText type="xs" weight="bold" style={styles.uploadButtonText}>Complete</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewDetailsButton, { flex: 0.8 }]}
              onPress={() => {
                setSelectedBooking(booking);
                setDetailsModalVisible(true);
              }}
            >
              <ThemedText type="xs" weight="bold" style={styles.viewDetailsButtonText}>Details</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {(activeTab === 'completed' || (activeTab === 'all' && booking.status?.status_name === 'COMPLETED')) && (
          <View style={[styles.deliveryButton, styles.deliveredButton]}>
            <Ionicons name="checkmark-circle" size={16} color={gray600} />
            <ThemedText type="xs" weight="bold" style={styles.deliveredButtonText}>✓ Photos Delivered</ThemedText>
          </View>
        )}

        {(activeTab === 'cancelled' || (activeTab === 'all' && ['CANCELLED', 'REJECTED'].includes(booking.status?.status_name))) && (
          <View style={[styles.deliveryButton, { backgroundColor: '#fee2e2' }]}>
            <Ionicons name="close-circle" size={16} color={errorColor} />
            <ThemedText type="xs" weight="bold" style={[styles.deliveredButtonText, { color: errorColor }]}>
              {booking.status?.status_name === 'REJECTED' ? 'Booking Rejected' : 'Booking Cancelled'}
            </ThemedText>
          </View>
        )}
      </View>
    </View >
  );

  const currentBookings = allBookings[activeTab];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 16 }]}>
        <ThemedText type="2xl" weight="bold" style={styles.headerTitle}>Booking Management</ThemedText>

        {/* Tabs */}
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
                  type="xs"
                  weight="bold"
                  style={[
                    styles.tabButtonText,
                    activeTab === tab && styles.tabButtonTextActive
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({allBookings[tab]?.length || 0})
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Bookings List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => { }}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={primary} />
            <ThemedText style={styles.emptyText}>Loading bookings...</ThemedText>
          </View>
        ) : currentBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar" size={64} color={gray300} />
            <ThemedText style={styles.emptyText}>No {activeTab} bookings</ThemedText>
          </View>
        ) : (
          currentBookings.map((booking) => renderBookingCard(booking))
        )}
      </ScrollView>

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
                {/* Client Profile */}
                <View style={styles.modalSection}>
                  <ThemedText type="sm" weight="bold" style={styles.sectionTitle}>Client Information</ThemedText>
                  <View style={styles.modalClientRow}>
                    <Image
                      source={{
                        uri: selectedBooking.client?.profile_image
                          ? `${API_HOST}${selectedBooking.client.profile_image}`
                          : 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200'
                      }}
                      style={styles.modalClientAvatar}
                    />
                    <View>
                      <ThemedText weight="bold" style={styles.modalClientName}>{selectedBooking.client?.full_name || 'Generic Client'}</ThemedText>
                      {/* You might want to show email or phone here if available */}
                      <ThemedText type="xs" style={styles.modalClientContact}>{selectedBooking.client?.email}</ThemedText>
                    </View>
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
                    <ThemedText type="sm" weight="bold" style={[styles.infoText, { color: primary }]}>
                      Total: NPR {selectedBooking.amount.toLocaleString()}
                    </ThemedText>
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
                    <TouchableOpacity
                      style={[styles.messageButton, { width: '100%', paddingVertical: 14 }]}
                      onPress={() => {
                        setDetailsModalVisible(false);
                        onViewBooking?.(selectedBooking);
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses" size={20} color={info} />
                      <ThemedText type="sm" weight="bold" style={styles.messageButtonText}>Message Client</ThemedText>
                    </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    // fontWeight: 'bold', // Removed as ThemedText handles weight
    color: '#111827',
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabButtonText: {
    fontSize: 12,
    // fontWeight: '600', // Removed as ThemedText handles weight
    color: '#374151',
  },
  tabButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textTransform: 'capitalize',
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  clientSection: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  clientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    // fontWeight: '600', // Removed as ThemedText handles weight
    color: '#111827',
  },
  eventType: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 4,
  },
  bookingAmount: {
    fontSize: 13,
    color: '#2563eb',
    marginTop: 4,
    // fontWeight: '600', // Removed as ThemedText handles weight
  },
  detailsSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  detailContent: {
    flex: 1,
  },
  detailDate: {
    fontSize: 14,
    color: '#111827',
    // fontWeight: '500', // Removed as ThemedText handles weight
  },
  detailTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  detailLocation: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  detailPackage: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  messageBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'white',
  },
  rejectButtonText: {
    fontSize: 13,
    // fontWeight: '600', // Removed as ThemedText handles weight
    color: '#ef4444',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  acceptButtonText: {
    fontSize: 13,
    // fontWeight: '600', // Removed as ThemedText handles weight
    color: 'white',
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
    // fontWeight: '600', // Removed as ThemedText handles weight
    color: '#2563eb',
  },
  viewDetailsButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  viewDetailsButtonText: {
    fontSize: 13,
    // fontWeight: '600', // Removed as ThemedText handles weight
    color: 'white',
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
    // fontWeight: '600', // Removed as ThemedText handles weight
    color: '#4b5563',
  },
  uploadButtonText: {
    fontSize: 13,
    // fontWeight: '600', // Removed as ThemedText handles weight
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
    // fontWeight: 'bold', // Removed as ThemedText handles weight
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
    // fontWeight: '600', // Removed as ThemedText handles weight
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
    // fontWeight: '600', // Removed as ThemedText handles weight
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
    // fontWeight: '600', // Removed as ThemedText handles weight
    color: '#4b5563',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tabsScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
});
