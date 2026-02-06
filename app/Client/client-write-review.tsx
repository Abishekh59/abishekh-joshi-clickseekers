import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../../services/api';
import { storage } from '../../utils/storage';

import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ClientWriteReview() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const booking = params; // Params will contain booking properties
  const onBack = () => router.back();
  const onSubmit = () => router.push('/Client/ClientBookings');
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const photographerName = booking?.photographerName || 'Rajesh Sharma';

  const ratingLabel = useMemo(() => {
    if (rating === 0) return 'Tap a star to rate';
    if (rating === 1) return 'Poor';
    if (rating === 2) return 'Fair';
    if (rating === 3) return 'Good';
    if (rating === 4) return 'Very Good';
    return 'Excellent';
  }, [rating]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }

    try {
      const token = await storage.getToken();
      if (!token) {
        Alert.alert('Error', 'You must be logged in to submit a review.');
        return;
      }

      const payload = {
        booking_id: typeof booking?.id === 'string' ? booking.id : String(booking?.id || ''),
        rating: rating,
        review: review,
      };

      const response = await apiService.submitReview(payload, token);
      if (response.success) {
        Alert.alert('Success', 'Thank you for your review!', [
          {
            text: 'OK', onPress: () => {
              onSubmit();
            }
          }
        ]);
      }
    } catch (error: any) {
      console.error('Submit review error:', error);
      Alert.alert('Error', error.message || 'Failed to submit review');
    }
  };

  const handleAddPhoto = () => {
    // Stub: wire this to expo-image-picker / react-native-image-picker later
    Alert.alert('Add Photo', 'Hook this button to an image picker (expo-image-picker).');
  };

  const removePhotoAt = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityLabel="Back" activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate & Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Photographer Info */}
        <View style={styles.card}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100' }}
            style={styles.photographerAvatar}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.photographerName} numberOfLines={1}>
              {photographerName}
            </Text>
            <Text style={styles.photographerSub}>How was your experience?</Text>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.card}>
          <Text style={styles.cardTitleCenter}>Rate your experience</Text>

          <View style={styles.starsPickRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.85} accessibilityLabel={`Rate ${s} star`}>
                <Ionicons name="star" size={42} color={s <= rating ? '#f59e0b' : '#d1d5db'} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.ratingLabel}>{ratingLabel}</Text>
        </View>

        {/* Written Review */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Write a review</Text>
          <TextInput
            value={review}
            onChangeText={setReview}
            placeholder="Share details of your experience..."
            placeholderTextColor="#9ca3af"
            multiline
            style={styles.textarea}
          />
        </View>

        {/* Photo Upload (placeholder) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add photos (optional)</Text>

          <View style={styles.photoGrid}>
            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoCell}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity
                  onPress={() => removePhotoAt(index)}
                  style={styles.photoRemoveBtn}
                  activeOpacity={0.85}
                  accessibilityLabel="Remove photo"
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < 6 ? (
              <TouchableOpacity onPress={handleAddPhoto} style={styles.addPhotoCell} activeOpacity={0.85}>
                <Ionicons name="cloud-upload-outline" size={26} color="#9ca3af" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={rating === 0}
          activeOpacity={0.85}
          style={[styles.submitBtn, rating === 0 ? styles.submitDisabled : null]}
        >
          <Text style={[styles.submitText, rating === 0 ? styles.submitTextDisabled : null]}>Submit Review</Text>
        </TouchableOpacity>

        <View style={{ height: 18 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },

  content: { padding: 16, paddingBottom: 0, rowGap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },

  photographerAvatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#e5e7eb' },
  photographerName: { fontSize: 16, fontWeight: '900', color: '#111827' },
  photographerSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#6b7280' },

  cardTitle: { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 10 },
  cardTitleCenter: { fontSize: 14, fontWeight: '900', color: '#111827', textAlign: 'center' },

  starsPickRow: { flexDirection: 'row', justifyContent: 'center', columnGap: 10, marginTop: 10 },
  ratingLabel: { marginTop: 10, textAlign: 'center', color: '#6b7280', fontWeight: '800' },

  textarea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 120,
    textAlignVertical: 'top',
    color: '#111827',
    fontWeight: '700',
    backgroundColor: '#fff',
  },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCell: { width: '30.5%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  photo: { width: '100%', height: '100%' },
  photoRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addPhotoCell: {
    width: '30.5%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  addPhotoText: { marginTop: 6, fontSize: 11, fontWeight: '800', color: '#9ca3af' },

  submitBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitDisabled: { backgroundColor: '#d1d5db' },
  submitText: { color: '#fff', fontWeight: '900' },
  submitTextDisabled: { color: '#6b7280' },
});
