import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  location: string;
  bio: string;
  totalBookings: number;
  totalReviews: number;
  totalSpent: number;
  createdAt: string;
}

type Props = {
  onLogout?: () => void;
};

export const ClientProfile: React.FC<Props> = ({ onLogout }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray600 = useThemeColor({}, 'gray600');
  const gray500 = useThemeColor({}, 'gray500');
  const gray400 = useThemeColor({}, 'gray400');
  const primary = useThemeColor({}, 'primary');
  const background = useThemeColor({}, 'background');
  const errorColor = useThemeColor({}, 'error');

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const token = await storage.getToken();
        if (!token) {
          router.replace('/login');
          return;
        }

        const res = await apiService.getMe(token);
        if (res.success && res.data) {
          const d = res.data;
          setProfile({
            name: d.full_name || 'User',
            email: d.email || '',
            phone: d.phone || '',
            avatar: toAbsoluteImageUrl(d.profile_image) || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
            location: d.location || 'Nepal',
            bio: d.bio || '',
            totalBookings: d.totalBookings || 0,
            totalReviews: d.totalReviews || 0,
            totalSpent: d.totalSpent || 0,
            createdAt: d.created_at || new Date().toISOString(),
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    const handleSocketUpdate = (data: { user_id: string; profile_image: string }) => {
      if (data.profile_image) {
        setProfile(prev => prev ? ({ ...prev, avatar: toAbsoluteImageUrl(data.profile_image) || prev.avatar }) : null);
      }
    };

    socketService.on('user_profile_updated', handleSocketUpdate);

    return () => {
      socketService.off('user_profile_updated', handleSocketUpdate);
    };
  }, [router]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

  const handleSaveProfile = async () => {
    if (!editedProfile) return;

    try {
      const token = await storage.getToken();
      if (!token) return;

      await apiService.updateProfile({
        full_name: editedProfile.name,
        phone: editedProfile.phone,
        bio: editedProfile.bio,
        location: editedProfile.location,
      }, token);

      setProfile(editedProfile);
      setEditModalOpen(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      try {
        setLoading(true);
        const token = await storage.getToken();
        if (!token) return;

        const file = {
          uri: asset.uri,
          name: asset.uri.split('/').pop() || 'profile.jpg',
          type: 'image/jpeg',
        };

        const uploadRes = await apiService.uploadProfileImage(file, token);
        if (uploadRes.success && uploadRes.data) {
          const newAvatar = toAbsoluteImageUrl(uploadRes.data.profile_image);
          if (newAvatar) {
            setProfile(prev => prev ? ({ ...prev, avatar: newAvatar }) : null);
          }
          Alert.alert('Success', 'Profile photo updated!');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to upload image');
      } finally {
        setLoading(false);
      }
    }
  };


  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await storage.clearAuth();
            router.replace('/');
          } catch (e) {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: background }]}>
        <ThemedText type="base" weight="bold" style={{ color: gray600 }}>Loading profile...</ThemedText>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={errorColor} />
        <ThemedText type="base" weight="bold" style={{ color: errorColor, marginTop: 12, textAlign: 'center' }}>
          {error || 'Profile not found'}
        </ThemedText>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: primary }]} onPress={() => router.replace('/Client/ClientProfile')}>
          <ThemedText type="sm" weight="extrabold" style={{ color: '#fff' }}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <ThemedText type="2xl" weight="bold" style={{ color: '#fff' }}>Profile</ThemedText>
            <TouchableOpacity
              onPress={() => {
                setEditedProfile(profile);
                setEditModalOpen(true);
              }}
              style={styles.headerIconButton}
            >
              <Ionicons name="pencil" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card Container */}
        <View style={styles.profileCardContainer}>
          <View style={[styles.profileCard, { backgroundColor: background }]}>
            <View style={styles.profileImageSection}>
              <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick} activeOpacity={0.8}>
                <Image source={{ uri: profile.avatar }} style={styles.avatar} />
                <View style={[styles.avatarEditOverlay, { backgroundColor: '#3b82f6', borderColor: background }]}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>

              <ThemedText type="2xl" weight="bold" style={{ color: gray900, marginTop: 12 }}>{profile.name}</ThemedText>
            </View>

            {/* Quick Stats Section - New Minimalist Design */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText type="2xl" weight="extrabold" style={{ color: gray900 }}>{profile.totalBookings}</ThemedText>
                <ThemedText type="sm" weight="medium" style={{ color: gray900, marginTop: 4 }}>Bookings</ThemedText>
                <ThemedText type="sm" style={{ color: gray500, marginTop: 2 }}>Completed</ThemedText>
              </View>

              <View style={[styles.statItem, styles.statDivider, { borderLeftColor: '#e5e7eb', borderRightColor: '#e5e7eb' }]}>
                <ThemedText type="2xl" weight="extrabold" style={{ color: gray900 }}>0</ThemedText>
                <ThemedText type="sm" weight="medium" style={{ color: gray900, marginTop: 4 }}>Favorites</ThemedText>
                <ThemedText type="sm" style={{ color: gray500, marginTop: 2 }}>Photographers</ThemedText>
              </View>

              <View style={styles.statItem}>
                <ThemedText type="2xl" weight="extrabold" style={{ color: gray900 }}>{profile.totalReviews}</ThemedText>
                <ThemedText type="sm" weight="medium" style={{ color: gray900, marginTop: 4 }}>Reviews</ThemedText>
                <ThemedText type="sm" style={{ color: gray500, marginTop: 2 }}>Given</ThemedText>
              </View>
            </View>

            {/* Contact Info Section */}
            <View style={styles.contactSection}>
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={20} color={gray500} />
                <ThemedText type="base" weight="bold" style={{ color: gray700, marginLeft: 15 }}>{profile.email}</ThemedText>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={20} color={gray500} />
                <ThemedText type="base" weight="bold" style={{ color: gray700, marginLeft: 15 }}>{profile.phone || '+977 123456789'}</ThemedText>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="location-outline" size={20} color={gray500} />
                <ThemedText type="base" weight="bold" style={{ color: gray700, marginLeft: 15 }}>{profile.location}</ThemedText>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="calendar-outline" size={20} color={gray500} />
                <ThemedText type="base" weight="bold" style={{ color: gray700, marginLeft: 15 }}>
                  Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </ThemedText>
              </View>

            </View>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemFirst]}>
            <Ionicons name="settings-outline" size={22} color={gray700} />
            <ThemedText type="base" weight="bold" style={[styles.menuItemText, { marginLeft: 15 }]}>Settings</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={22} color={gray700} />
            <ThemedText type="base" weight="bold" style={[styles.menuItemText, { marginLeft: 15 }]}>Help & Support</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={errorColor} />
            <ThemedText type="base" weight="bold" style={[styles.menuItemText, styles.menuItemTextLogout, { marginLeft: 15 }]}>Logout</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={gray400} />
          </TouchableOpacity>
        </View>

        <ThemedText type="xs" weight="bold" style={[styles.versionTag, { color: gray400 }]}>ClickSeekers v1.0.0</ThemedText>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalOpen} transparent animationType="fade" onRequestClose={() => setEditModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: '#f1f5f9' }]}>
              <ThemedText type="lg" weight="extrabold" style={{ color: gray900 }}>Edit Profile</ThemedText>
              <TouchableOpacity onPress={() => setEditModalOpen(false)} style={styles.iconBtn} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={gray900} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {editedProfile && (
                <>
                  <ThemedText type="xs" weight="extrabold" style={[styles.fieldLabel, { color: gray500 }]}>Full Name</ThemedText>
                  <TextInput
                    value={editedProfile.name}
                    onChangeText={(t) => setEditedProfile((p) => p ? ({ ...p, name: t }) : null)}
                    style={[styles.fieldInput, { color: gray900, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}
                    placeholder="Full name"
                    placeholderTextColor={gray400}
                  />

                  <ThemedText type="xs" weight="extrabold" style={[styles.fieldLabel, { color: gray500 }]}>Email</ThemedText>
                  <TextInput
                    value={editedProfile.email}
                    onChangeText={(t) => setEditedProfile((p) => p ? ({ ...p, email: t }) : null)}
                    style={[styles.fieldInput, { color: gray900, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}
                    placeholder="Email"
                    placeholderTextColor={gray400}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <ThemedText type="xs" weight="extrabold" style={[styles.fieldLabel, { color: gray500 }]}>Phone</ThemedText>
                  <TextInput
                    value={editedProfile.phone}
                    onChangeText={(t) => setEditedProfile((p) => p ? ({ ...p, phone: t }) : null)}
                    style={[styles.fieldInput, { color: gray900, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}
                    placeholder="Phone"
                    placeholderTextColor={gray400}
                    keyboardType="phone-pad"
                  />

                  <ThemedText type="xs" weight="extrabold" style={[styles.fieldLabel, { color: gray500 }]}>Location</ThemedText>
                  <TextInput
                    value={editedProfile.location}
                    onChangeText={(t) => setEditedProfile((p) => p ? ({ ...p, location: t }) : null)}
                    style={[styles.fieldInput, { color: gray900, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}
                    placeholder="Location"
                    placeholderTextColor={gray400}
                  />


                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#f1f5f9' }]} onPress={() => setEditModalOpen(false)} activeOpacity={0.85}>
                <ThemedText type="base" weight="bold" style={{ color: gray600 }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: primary }]} onPress={handleSaveProfile} activeOpacity={0.85}>
                <ThemedText type="base" weight="bold" style={{ color: '#fff' }}>Save Changes</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ClientBottomNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  retryBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  content: { paddingBottom: 120 },

  header: {
    backgroundColor: '#1e3a8a',
    paddingTop: 16,
    paddingBottom: 60,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)'
  },

  profileCardContainer: {
    paddingHorizontal: 16,
    marginTop: -40,
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },

  contactSection: {
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuItemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  menuItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  menuItemTextLogout: {
    color: '#dc2626',
  },

  versionTag: {
    textAlign: 'center',
    marginTop: 10,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { borderRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 15, borderBottomWidth: 1 },
  iconBtn: { padding: 5 },
  fieldLabel: { marginTop: 15, marginBottom: 8 },
  fieldInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  bioInput: { minHeight: 90, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', columnGap: 12, marginTop: 25 },
  modalBtn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
});

export default ClientProfile;
