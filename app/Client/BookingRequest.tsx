import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BookingRequestProps {
  photographer?: any;
  onSubmit?: () => void;
  onBack?: () => void;
}

type FormData = {
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:00 AM"
  duration: string;
  location: string;
  eventType: string;
  package: string;
  additionalDetails: string;
};

function formatYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function BookingRequest({ photographer, onSubmit, onBack }: BookingRequestProps) {
  const insets = useSafeAreaInsets();

  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray600 = useThemeColor({}, 'gray600');
  const gray500 = useThemeColor({}, 'gray500');
  const primary = useThemeColor({}, 'primary');
  const background = useThemeColor({}, 'background');

  const [formData, setFormData] = useState<FormData>({
    date: '',
    time: '',
    duration: '4',
    location: '',
    eventType: '',
    package: '',
    additionalDetails: '',
  });

  const [showEventTypePicker, setShowEventTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const defaultPhotographer = {
    name: 'Rajesh Shrestha',
    category: 'Wedding Photography',
    isVerified: true,
    rating: 4.9,
  };

  const currentPhotographer = photographer || defaultPhotographer;

  const packages = [
    { id: 'basic', name: 'Basic Package', price: 15000, duration: '4 hours' },
    { id: 'standard', name: 'Standard Package', price: 25000, duration: '8 hours' },
    { id: 'premium', name: 'Premium Package', price: 40000, duration: 'Full day' },
  ];

  const eventTypes = ['Wedding', 'Birthday', 'Corporate Event', 'Product Shoot', 'Portrait', 'Other'];

  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
    '4:00 PM', '5:00 PM', '6:00 PM',
  ];

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

  const canSubmit =
    !!formData.eventType &&
    !!formData.date &&
    !!formData.time &&
    !!formData.location.trim() &&
    !!formData.package;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.();
  };

  const PickerField = ({
    label,
    value,
    placeholder,
    icon,
    onPress,
  }: {
    label: string;
    value: string;
    placeholder: string;
    icon?: React.ReactNode;
    onPress: () => void;
  }) => (
    <View style={{ marginTop: 12 }}>
      <ThemedText type="xs" weight="bold" style={{ color: gray700, marginBottom: 6 }}>{label}</ThemedText>
      <TouchableOpacity style={styles.pickerField} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.pickerLeft}>
          {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
          <ThemedText
            type="sm"
            weight="semibold"
            style={{ color: value ? gray900 : '#9ca3af', flex: 1 }}
            numberOfLines={1}
          >
            {value || placeholder}
          </ThemedText>
        </View>
        <Ionicons name="chevron-down" size={18} color={gray500} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityLabel="Back" activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={24} color={gray900} />
        </TouchableOpacity>
        <ThemedText type="lg" weight="bold" style={{ flex: 1, textAlign: 'center', color: gray900 }}>
          Booking Request
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photographer mini summary */}
        <View style={[styles.photographerCard, { backgroundColor: background }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="base" weight="bold" style={{ color: gray900 }} numberOfLines={1}>
              {currentPhotographer.name}
            </ThemedText>
            <ThemedText type="xs" weight="semibold" style={{ color: gray500, marginTop: 4 }} numberOfLines={1}>
              {currentPhotographer.category}
              {currentPhotographer.isVerified ? ' • Verified' : ''}
            </ThemedText>
          </View>
          <View style={[styles.ratingPill, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
            <Ionicons name="star" size={14} color="#f59e0b" />
            <ThemedText type="xs" weight="bold" style={{ color: gray900, marginLeft: 6 }}>
              {Number(currentPhotographer.rating).toFixed(1)}
            </ThemedText>
          </View>
        </View>

        {/* Event Type */}
        <PickerField
          label="Event Type"
          value={formData.eventType}
          placeholder="Select event type"
          onPress={() => setShowEventTypePicker(true)}
        />

        {/* Date & Time */}
        <View style={styles.grid2}>
          <View style={{ flex: 1 }}>
            <PickerField
              label="Date"
              value={formData.date}
              placeholder="Select date"
              onPress={() => setShowDatePicker(true)}
              icon={<Ionicons name="calendar-outline" size={16} color={gray500} />}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PickerField
              label="Time"
              value={formData.time}
              placeholder="Select time"
              onPress={() => setShowTimePicker(true)}
              icon={<Ionicons name="time-outline" size={16} color={gray500} />}
            />
          </View>
        </View>

        {/* Location */}
        <View style={{ marginTop: 12 }}>
          <ThemedText type="xs" weight="bold" style={{ color: gray700, marginBottom: 6 }}>
            <Ionicons name="location-outline" size={14} color={gray500} /> Location
          </ThemedText>
          <TextInput
            value={formData.location}
            onChangeText={(t) => setFormData((p) => ({ ...p, location: t }))}
            placeholder="Enter event location"
            placeholderTextColor="#9ca3af"
            style={[styles.input, { color: gray900 }]}
          />
        </View>

        {/* Package Selection */}
        <View style={{ marginTop: 12 }}>
          <ThemedText type="xs" weight="bold" style={{ color: gray700, marginBottom: 6 }}>Select Package</ThemedText>
          <View style={{ marginTop: 8 }}>
            {packages.map((pkg) => {
              const active = formData.package === pkg.id;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  onPress={() => setFormData((p) => ({ ...p, package: pkg.id }))}
                  activeOpacity={0.85}
                  style={[
                    styles.packageCard,
                    active ? { borderColor: primary, backgroundColor: '#eff6ff' } : { borderColor: '#e5e7eb', backgroundColor: background }
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="sm" weight="bold" style={{ color: gray900 }}>{pkg.name}</ThemedText>
                    <ThemedText type="xs" weight="semibold" style={{ color: gray500, marginTop: 4 }}>{pkg.duration}</ThemedText>
                  </View>
                  <View style={styles.packageRight}>
                    <ThemedText type="sm" weight="bold" style={{ color: primary, marginBottom: 6 }}>
                      NPR {pkg.price.toLocaleString()}
                    </ThemedText>
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={active ? primary : '#9ca3af'}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Additional Details */}
        <View style={{ marginTop: 12 }}>
          <ThemedText type="xs" weight="bold" style={{ color: gray700, marginBottom: 6 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={gray500} /> Additional Details
          </ThemedText>
          <TextInput
            value={formData.additionalDetails}
            onChangeText={(t) => setFormData((p) => ({ ...p, additionalDetails: t }))}
            placeholder="Any specific requirements or preferences?"
            placeholderTextColor="#9ca3af"
            multiline
            style={[styles.input, styles.textarea, { color: gray900 }]}
          />
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.bottomBar, { backgroundColor: background }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={[styles.submitBtn, !canSubmit ? { backgroundColor: '#9ca3af' } : { backgroundColor: primary }]}
        >
          <ThemedText type="sm" weight="bold" style={{ color: '#fff' }}>Continue to Payment</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Event Type Picker */}
      <Modal
        visible={showEventTypePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEventTypePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="base" weight="bold" style={{ color: gray900 }}>Select event type</ThemedText>
              <TouchableOpacity onPress={() => setShowEventTypePicker(false)} style={styles.iconBtn} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={gray900} />
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
                      setFormData((p) => ({ ...p, eventType: item }));
                      setShowEventTypePicker(false);
                    }}
                    style={[styles.modalItem, active ? { backgroundColor: primary } : null]}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      type="sm"
                      weight="semibold"
                      style={{ color: active ? '#fff' : gray900 }}
                    >
                      {item}
                    </ThemedText>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
              style={{ maxHeight: 360 }}
            />
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="base" weight="bold" style={{ color: gray900 }}>Select date</ThemedText>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.iconBtn} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={gray900} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={upcomingDates}
              keyExtractor={(d) => d}
              renderItem={({ item }) => {
                const active = formData.date === item;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setFormData((p) => ({ ...p, date: item }));
                      setShowDatePicker(false);
                    }}
                    style={[styles.modalItem, active ? { backgroundColor: primary } : null]}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      type="sm"
                      weight="semibold"
                      style={{ color: active ? '#fff' : gray900 }}
                    >
                      {item}
                    </ThemedText>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
              style={{ maxHeight: 360 }}
            />
          </View>
        </View>
      </Modal>

      {/* Time Picker */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="base" weight="bold" style={{ color: gray900 }}>Select time</ThemedText>
              <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.iconBtn} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={gray900} />
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
                      setFormData((p) => ({ ...p, time: item }));
                      setShowTimePicker(false);
                    }}
                    style={[styles.modalItem, active ? { backgroundColor: primary } : null]}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      type="sm"
                      weight="semibold"
                      style={{ color: active ? '#fff' : gray900 }}
                    >
                      {item}
                    </ThemedText>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
              style={{ maxHeight: 360 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  iconBtn: { padding: 8 },
  content: { padding: 16, paddingBottom: 110 },
  photographerCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  grid2: { flexDirection: 'row', marginTop: 2, columnGap: 10 },
  pickerField: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  packageCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  packageRight: { alignItems: 'flex-end' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  submitBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'center', padding: 16 },
  modalCard: { borderRadius: 16, padding: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  modalItem: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  modalSep: { height: 6 },
});