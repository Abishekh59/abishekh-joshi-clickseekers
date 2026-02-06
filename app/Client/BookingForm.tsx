import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../../services/api';
import { storage } from '../../utils/storage';

interface BookingFormData {
  serviceId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  eventType: string;
  time: string;
  location: string;
  fullName: string;
  email: string;
  phone: string;
  specialRequirements: string;
}

type BookingFormProps = {
  onBack?: () => void;
  onNavigate?: (screen: string, data?: any) => void;
};

type FormErrors = Partial<Record<keyof BookingFormData, string>>;

function formatYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const BookingForm: React.FC<BookingFormProps> = ({ onBack, onNavigate }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const p_id = params.photographerId as string;
  const p_name = params.photographerName as string;
  const p_avatar = params.photographerAvatar as string;
  const pkg_id = parseInt(params.packageId as string);
  const pkg_name = params.packageName as string;
  const pkg_price = parseFloat(params.packagePrice as string) || 0;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    serviceId: String(pkg_id),
    startDate: '',
    endDate: '',
    eventType: '',
    time: '',
    location: '',
    fullName: '',
    email: '',
    phone: '',
    specialRequirements: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await storage.getToken();
        if (token) {
          const res = await apiService.getMe(token);
          if (res.success && res.data) {
            setFormData(prev => ({
              ...prev,
              fullName: res.data.full_name || '',
              email: res.data.email || '',
              phone: res.data.phone || '',
            }));
          }
        }
      } catch (err) {
        console.error('Fetch profile error:', err);
      }
    };
    fetchProfile();
  }, []);

  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEventTypePicker, setShowEventTypePicker] = useState(false);

  const eventTypes = [
    'Portrait', 'Event', 'Product', 'Wedding', 'Aerial', 'Fashion',
    'Travel', 'Landscape', 'Culture', 'Nature', 'Wildlife', 'Sports',
    'Family', 'Newborn', 'Commercial', 'Fine Art', 'Real Estate', 'Other'
  ];

  const photographer = {
    name: p_name || 'Photographer',
    avatar: p_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    rating: 4.9,
    service: pkg_name || 'Photography Service',
  };

  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
    '4:00 PM', '5:00 PM', '6:00 PM',
  ];

  const totalAmount = pkg_price;

  const upcomingDates = useMemo(() => {
    const out: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      out.push(formatYYYYMMDD(d));
    }
    return out;
  }, []);

  const todayStr = useMemo(() => formatYYYYMMDD(new Date()), []);
  const maxDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90); // Allow booking up to 90 days in advance
    return formatYYYYMMDD(d);
  }, []);

  const handleInputChange = <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.eventType) newErrors.eventType = 'Please select an event type';
    if (!formData.time) newErrors.time = 'Please select a time';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!isValidEmail(formData.email)) newErrors.email = 'Enter a valid email';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const token = await storage.getToken();
      if (!token) {
        alert('Please login to continue');
        return;
      }

      const payload = {
        photographer_id: p_id,
        package_id: pkg_id,
        date: `${formData.startDate} ${formData.time}`,
        end_date: formData.endDate ? `${formData.endDate} ${formData.time}` : undefined,
        event_type: formData.eventType,
        amount: totalAmount,
        location: formData.location,
        notes: formData.specialRequirements,
      };

      const res = await apiService.createBooking(payload, token);
      if (res.success) {
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const stars = Array.from({ length: 5 }).map((_, i) => (
      <Ionicons
        key={i}
        name={i < full ? 'star' : 'star-outline'}
        size={14}
        color={i < full ? '#f59e0b' : '#d1d5db'}
      />
    ));
    return <View style={styles.starsRow}>{stars}</View>;
  };

  const FieldLabel = ({ label, required }: { label: string; required?: boolean }) => (
    <Text style={styles.label}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );

  const ErrorText = ({ msg }: { msg?: string }) =>
    msg ? (
      <View style={styles.errorRow}>
        <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
        <Text style={styles.errorText}>{msg}</Text>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photographer Summary */}
        <View style={styles.card}>
          <Image source={{ uri: photographer.avatar }} style={styles.avatar} />
          <View style={styles.cardBody}>
            <Text style={styles.name} numberOfLines={1}>{photographer.name}</Text>
            <Text style={styles.sub} numberOfLines={1}>{photographer.service}</Text>
            <View style={styles.ratingRow}>
              {renderStars(photographer.rating)}
              <Text style={styles.ratingValue}>{photographer.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Date & Time</Text>
          </View>

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <FieldLabel label="Start Date" required />
              <TouchableOpacity
                style={[styles.pickerField, errors.startDate ? styles.fieldError : null]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.pickerText, !formData.startDate ? styles.placeholder : null]}>
                  {formData.startDate || 'Select start date'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6b7280" />
              </TouchableOpacity>
              <ErrorText msg={errors.startDate} />
            </View>

            <View style={styles.gridItem}>
              <FieldLabel label="End Date (Optional)" />
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.pickerText, !formData.endDate ? styles.placeholder : null]}>
                  {formData.endDate || 'Select end date'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <FieldLabel label="Event Type" required />
            <TouchableOpacity
              style={[styles.pickerField, errors.eventType ? styles.fieldError : null]}
              onPress={() => setShowEventTypePicker(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.pickerText, !formData.eventType ? styles.placeholder : null]}>
                {formData.eventType || 'Select category'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6b7280" />
            </TouchableOpacity>
            <ErrorText msg={errors.eventType} />
          </View>

          <View style={{ marginTop: 12 }}>
            <FieldLabel label="Start Time" required />
            <TouchableOpacity
              style={[styles.pickerField, errors.time ? styles.fieldError : null]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.pickerText, !formData.time ? styles.placeholder : null]}>
                {formData.time || 'Select time'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6b7280" />
            </TouchableOpacity>
            <ErrorText msg={errors.time} />
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>

          <FieldLabel label="Event Location" required />
          <TextInput
            value={formData.location}
            onChangeText={(t) => handleInputChange('location', t)}
            placeholder="Enter full address"
            placeholderTextColor="#9ca3af"
            style={[styles.input, errors.location ? styles.fieldError : null]}
          />
          <ErrorText msg={errors.location} />
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <FieldLabel label="Full Name" required />
              <TextInput
                value={formData.fullName}
                onChangeText={(t) => handleInputChange('fullName', t)}
                placeholder="Full name"
                placeholderTextColor="#9ca3af"
                style={[styles.input, errors.fullName ? styles.fieldError : null]}
              />
              <ErrorText msg={errors.fullName} />
            </View>

            <View style={styles.gridItem}>
              <FieldLabel label="Phone" required />
              <TextInput
                value={formData.phone}
                onChangeText={(t) => handleInputChange('phone', t)}
                placeholder="+977 98XXXXXXXX"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                style={[styles.input, errors.phone ? styles.fieldError : null]}
              />
              <ErrorText msg={errors.phone} />
            </View>
          </View>

          <FieldLabel label="Email" required />
          <TextInput
            value={formData.email}
            onChangeText={(t) => handleInputChange('email', t)}
            placeholder="name@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, errors.email ? styles.fieldError : null]}
          />
          <ErrorText msg={errors.email} />
        </View>

        {/* Special Requirements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="create-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Special Requirements</Text>
          </View>

          <FieldLabel label="Additional Notes (Optional)" />
          <TextInput
            value={formData.specialRequirements}
            onChangeText={(t) => handleInputChange('specialRequirements', t)}
            placeholder="Any specific requirements or preferences..."
            placeholderTextColor="#9ca3af"
            multiline
            style={[styles.input, styles.textarea]}
          />
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Price Summary</Text>
          </View>

          <View style={styles.priceBox}>
            <View style={[styles.priceRow, styles.priceTotalRow]}>
              <Text style={styles.priceTotalLabel}>Total Amount</Text>
              <Text style={styles.priceTotalValue}>NPR {totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* spacer so bottom bar doesn't overlap */}
        <View style={{ height: 92 }} />
      </ScrollView>

      {/* Submit Section (fixed) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={loading}
          style={[styles.submitBtn, loading ? styles.submitBtnDisabled : null]}
        >
          {loading ? (
            <Text style={styles.submitText}>Processing...</Text>
          ) : (
            <Text style={styles.submitText}>Confirm Booking - NPR {totalAmount.toLocaleString()}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.iconBtn} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <Calendar
              current={formData.startDate || todayStr}
              minDate={todayStr}
              maxDate={maxDateStr}
              onDayPress={(day: any) => {
                if (!formData.startDate || (formData.startDate && formData.endDate)) {
                  handleInputChange('startDate', day.dateString);
                  handleInputChange('endDate', '');
                } else if (day.dateString > formData.startDate) {
                  handleInputChange('endDate', day.dateString);
                  setShowDatePicker(false);
                } else {
                  handleInputChange('startDate', day.dateString);
                  handleInputChange('endDate', '');
                }
              }}
              markedDates={{
                [formData.startDate]: { selected: true, startingDay: true, color: '#1e3a8a', textColor: 'white' },
                [formData.endDate]: { selected: true, endingDay: true, color: '#1e3a8a', textColor: 'white' },
              }}
              markingType={'period'}
              theme={{
                selectedDayBackgroundColor: '#1e3a8a',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#1e3a8a',
                arrowColor: '#1e3a8a',
                monthTextColor: '#111827',
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
                textDayHeaderFontWeight: '700',
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Event Type Picker Modal */}
      <Modal visible={showEventTypePicker} transparent animationType="fade" onRequestClose={() => setShowEventTypePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Event Type</Text>
              <TouchableOpacity onPress={() => setShowEventTypePicker(false)} style={styles.iconBtn} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={eventTypes}
              keyExtractor={(t) => t}
              renderItem={({ item }) => {
                const active = formData.eventType === item;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      handleInputChange('eventType', item);
                      setShowEventTypePicker(false);
                    }}
                    style={[styles.modalItem, active ? styles.modalItemActive : null]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modalItemText, active ? styles.modalItemTextActive : null]}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.iconBtn} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={timeSlots}
              keyExtractor={(t) => t}
              renderItem={({ item }) => {
                const active = formData.time === item;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      handleInputChange('time', item);
                      setShowTimePicker(false);
                    }}
                    style={[styles.modalItem, active ? styles.modalItemActive : null]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modalItemText, active ? styles.modalItemTextActive : null]}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
              style={{ maxHeight: 360 }}
            />
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </View>

            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successText}>
              Your booking request has been sent to {photographer.name}. You will receive a confirmation once the
              photographer accepts your request.
            </Text>


            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionSecondary]}
                activeOpacity={0.85}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push('/Client/ClientBookings');
                }}
              >
                <Text style={styles.actionSecondaryText}>View Booking</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionPrimary]}
                activeOpacity={0.85}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.dismissAll();
                  router.replace('/Client/ClientDashboard');
                }}
              >
                <Text style={styles.actionPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default BookingForm;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

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

  content: { padding: 16, paddingBottom: 0 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  avatar: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#e5e7eb' },
  cardBody: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '900', color: '#111827' },
  sub: { marginTop: 2, fontSize: 13, color: '#6b7280', fontWeight: '600' },
  ratingRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  starsRow: { flexDirection: 'row', marginRight: 8 },
  ratingValue: { fontSize: 13, fontWeight: '800', color: '#111827' },

  section: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { marginLeft: 8, fontSize: 14, fontWeight: '900', color: '#111827' },

  label: { fontSize: 12, color: '#374151', fontWeight: '800', marginBottom: 6 },
  required: { color: '#ef4444' },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textarea: { minHeight: 96, textAlignVertical: 'top' },

  grid2: { flexDirection: 'row', gap: 10 },
  gridItem: { flex: 1 },

  pickerField: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  placeholder: { color: '#9ca3af', fontWeight: '700' },

  fieldError: { borderColor: '#ef4444' },
  errorRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  priceBox: { marginTop: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  priceLabel: { color: '#6b7280', fontWeight: '700' },
  priceValue: { color: '#111827', fontWeight: '800' },
  priceTotalRow: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 6, paddingTop: 12 },
  priceTotalLabel: { color: '#111827', fontWeight: '900' },
  priceTotalValue: { color: '#111827', fontWeight: '900' },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },

  submitBtn: {
    marginTop: 10,
    backgroundColor: '#1e3a8a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#9ca3af' },
  submitText: { color: '#fff', fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  modalItem: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  modalItemActive: { backgroundColor: '#1e3a8a' },
  modalItemText: { fontWeight: '800', color: '#111827' },
  modalItemTextActive: { color: '#fff' },
  modalSep: { height: 6 },

  successCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16 },
  successIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  successTitle: { textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#111827' },
  successText: { textAlign: 'center', marginTop: 8, color: '#4b5563', fontWeight: '600', lineHeight: 18 },
  refBox: { marginTop: 14, backgroundColor: '#f3f4f6', borderRadius: 14, padding: 12 },
  refLabel: { color: '#6b7280', fontWeight: '800', fontSize: 12 },
  refValue: { marginTop: 6, color: '#111827', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  successActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  actionSecondary: { backgroundColor: '#f3f4f6' },
  actionPrimary: { backgroundColor: '#1e3a8a' },
  actionSecondaryText: { color: '#111827', fontWeight: '900' },
  actionPrimaryText: { color: '#fff', fontWeight: '900' },
});
