import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BadgeDisplay } from "../../components/BadgeDisplay";
import HelpSupportModal from "../../components/HelpSupportModal";
import LogoLoader from "../../components/LogoLoader";
import { ThemedText } from "../../components/themed-text";
import { NEPAL_CITIES } from "../../constants/nepalCities";
import { PHOTOGRAPHER_TYPES } from "../../constants/photographerTypes";
import { useAppTheme } from "../../hooks/use-app-theme";
import { API_HOST, apiService } from "../../services/api";
import { socketService } from "../../services/socket";
import { storage } from "../../utils/storage";
import KYCVerification from "./KYCVerification";


type ProfileImageValue =
  | string
  | {
    file_name?: string;
    mime_type?: string;
    encoding?: "base64";
    data?: string;
    base64?: string;
    url?: string;
    image_url?: string;
    uri?: string;
  }
  | null
  | undefined;

const toAbsoluteImageUrl = (url: string | null | undefined) => {
  if (!url || url.trim() === "") return null;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_HOST}${path}`;
};

const getProfileImageUri = (value: ProfileImageValue) => {
  if (!value) return null;

  if (typeof value === "string") {
    return toAbsoluteImageUrl(value);
  }

  const remoteUrl = value.url || value.image_url || value.uri;
  if (typeof remoteUrl === "string" && remoteUrl.trim() !== "") {
    return toAbsoluteImageUrl(remoteUrl);
  }

  const base64 = value.data || value.base64;
  if (typeof base64 === "string" && base64.trim() !== "") {
    if (base64.startsWith("data:")) return base64;
    const mimeType = value.mime_type || "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  }

  return null;
};

interface PhotographerProfile {
  onBack?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  onKYCVerify?: () => void;
}

interface EditableProfile {
  name: string;
  phone: string;
  bio: string;
  location: string;
  specialization: string;
  profile_image: ProfileImageValue;
}

export default function PhotographerProfile({
  onBack,
  onSettings,
  onLogout,
  onKYCVerify,
}: PhotographerProfile) {
  const [kycStatus, setKycStatus] = useState<
    "pending" | "verified" | "not_submitted" | "rejected"
  >("not_submitted");
  const [showKYC, setShowKYC] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  const isProfileIncomplete = !user?.bio?.trim() || !user?.specialization?.trim() || !user?.profile_image;
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'form' | 'specialization' | 'location'>('form');
  const [editedProfile, setEditedProfile] = useState<EditableProfile | null>(
    null,
  );
  const [imageUploading, setImageUploading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
    info,
  } = useAppTheme();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await storage.clearAuth();
            router.replace("/");
          } catch (e) {
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to make this work!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      try {
        setImageUploading(true);
        const token = await storage.getToken();
        if (!token) return;

        const file = {
          uri: asset.uri,
          name: asset.fileName || asset.uri.split("/").pop() || "profile.jpg",
          type: asset.mimeType || "image/jpeg",
        };

        const uploadRes = await apiService.uploadProfileImage(file, token);

        const updatedUserFromApi =
          (uploadRes as any)?.data ?? (uploadRes as any);
        if (updatedUserFromApi) {
          const currentUser = await storage.getUser();
          const mergedUser = { ...(currentUser || {}), ...updatedUserFromApi };
          await storage.saveUser(mergedUser);
          setUser(mergedUser);
          Alert.alert("Success", "Profile photo updated!");
        }
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to upload image");
      } finally {
        setImageUploading(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editedProfile) return;

    if (!editedProfile.name.trim()) {
      Alert.alert("Error", "Full name is required");
      return;
    }

    try {
      setLoading(true);
      const token = await storage.getToken();
      if (!token) return;

      const response = await apiService.updatePhotographerProfile(
        {
          full_name: editedProfile.name.trim(),
          phone: editedProfile.phone.trim() || undefined,
          bio: editedProfile.bio.trim() || undefined,
          location: editedProfile.location.trim() || undefined,
          specialization: editedProfile.specialization.trim() || undefined,
        },
        token,
      );

      const updatedUserFromApi = (response as any)?.data ?? (response as any);
      if (updatedUserFromApi) {
        const currentUser = await storage.getUser();
        const mergedUser = { ...(currentUser || {}), ...updatedUserFromApi };
        await storage.saveUser(mergedUser);
        setUser(mergedUser);
      }

      setEditModalOpen(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh profile data from backend
  const refreshProfile = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      const response = await apiService.getMe(token);
      if (response.success && response.data) {
        const freshUserData = response.data;
        // Update local storage
        await storage.saveUser(freshUserData);
        // Update state
        setUser(freshUserData);
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await storage.getToken();
        const storedUser = await storage.getUser();
        if (token && storedUser) {
          if (mounted) setUser(storedUser);
        } else if (token) {
          // Fallback to decode if user not in storage
          const decoded = jwtDecode(token);
          if (mounted) setUser(decoded);
        }

        // Fetch fresh profile data from API to get updated stats
        if (token) {
          try {
            const profileResponse = await apiService.getMe(token);
            if (profileResponse.success && profileResponse.data) {
              const freshUserData = profileResponse.data;
              await storage.saveUser(freshUserData);
              if (mounted) setUser(freshUserData);
            }
          } catch (error) {
            console.error("Error fetching fresh profile:", error);
          }
        }

        // Fetch fresh KYC status from API (don't rely on stale JWT data)
        if (token) {
          try {
            const response = await apiService.getKycStatus(token);
            if (response.success && response.data) {
              const kycData = response.data;
              if (kycData.status === "APPROVED") {
                if (mounted) setKycStatus("verified");
              } else if (kycData.status === "PENDING") {
                if (mounted) setKycStatus("pending");
              } else if (kycData.status === "REJECTED") {
                if (mounted) setKycStatus("rejected");
              } else {
                if (mounted) setKycStatus("not_submitted");
              }
            } else {
              // No KYC record found
              if (mounted) setKycStatus("not_submitted");
            }
          } catch (error) {
            // If API call fails or returns 404, assume not submitted
            if (mounted) setKycStatus("not_submitted");
          }
        }
      } catch (e) {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const handleSocketUpdate = (data: {
      user_id: string;
      profile_image: ProfileImageValue;
    }) => {
      if (data.profile_image) {
        setUser((prev: any) =>
          prev
            ? {
              ...prev,
              profile_image: data.profile_image,
            }
            : null,
        );
      }
    };

    // Handle booking status updates to refresh profile stats
    const handleBookingStatusUpdate = () => {
      refreshProfile();
    };

    socketService.on("user_profile_updated", handleSocketUpdate);
    socketService.on("booking_status_updated", handleBookingStatusUpdate);

    return () => {
      mounted = false;
      socketService.off("user_profile_updated", handleSocketUpdate);
      socketService.off("booking_status_updated", handleBookingStatusUpdate);
    };
  }, []);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <LogoLoader size={120} />
        <ThemedText weight="bold" style={{ marginTop: 20, color: primary }}>
          Loading Profile...
        </ThemedText>
      </View>
    );
  }

  const photographer = {
    userId: user?.user_id ?? "",
    name: user?.full_name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    bio: user?.bio ?? "",
    location: user?.location ?? "",
    memberSince: user?.created_at
      ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
      : "N/A",
    specialization: user?.specialization ?? "",
    badge: user?.badge ?? "Rookie",
    rank: user?.rank ?? "N/A",
    points: user?.points ?? 0,
    rating: user?.rating ?? "0.0",
    totalBookings: user?.total_bookings ?? 0,
    earnings: user?.earnings ?? 0,
    reviews: user?.reviews ?? 0,
    kycStatus: user?.kycStatus ?? "",
    role: user?.role ?? "",
    profile_image: user?.profile_image ?? "",
  };

  const profileImageUri = getProfileImageUri(photographer.profile_image);

  const stats = [
    {
      icon: "calendar",
      label: "Total Bookings",
      value: photographer.totalBookings.toString(),
      color: "#dbeafe",
      iconColor: "#2563eb",
    },
    {
      icon: "star",
      label: "Rating",
      value: photographer.rating.toString(),
      color: "#fef3c7",
      iconColor: "#f59e0b",
    },
    {
      icon: "cash",
      label: "Total Earnings",
      value: `${photographer.earnings / 1000}K`,
      color: "#dcfce7",
      iconColor: "#16a34a",
    },
  ];

  if (showKYC) {
    return (
      <KYCVerification
        onBack={() => setShowKYC(false)}
        onComplete={() => {
          setKycStatus("pending");
          setShowKYC(false);
        }}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: gray100 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: Platform.OS === "ios" ? 10 : insets.top + 16,
              backgroundColor: primary,
            },
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.headerIconButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={22} color={white} />
            </TouchableOpacity>
            <ThemedText type="xl" weight="bold" style={styles.headerTitle}>
              Profile
            </ThemedText>
            <TouchableOpacity
              testID="edit-profile-button"
              style={styles.headerIconButton}
              onPress={() => {
                setEditedProfile({
                  name: photographer.name,
                  phone: photographer.phone,
                  bio: user?.bio || "",
                  location: photographer.location,
                  specialization: photographer.specialization,
                  profile_image: photographer.profile_image,
                });
                setActiveSubView('form');
                setEditModalOpen(true);
              }}
            >
              <Ionicons name="pencil" size={22} color={white} />
              {isProfileIncomplete && (
                <View style={[styles.incompleteDot, { backgroundColor: errorColor }]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCardContainer}>
          <View style={[styles.profileCard, { backgroundColor: white }]}>
            <View style={styles.profileImageSection}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={handleImagePick}
                activeOpacity={0.8}
              >
                <Image
                  source={
                    profileImageUri
                      ? { uri: profileImageUri }
                      : {
                        uri: `https://ui-avatars.com/api/?name=${photographer.name}&background=f1f5f9&color=64748b`,
                      }
                  }
                  style={styles.profileImage}
                />
                <View
                  style={[
                    styles.avatarEditOverlay,
                    { backgroundColor: primary, borderColor: white },
                  ]}
                >
                  {imageUploading ? (
                    <ActivityIndicator size="small" color={white} />
                  ) : (
                    <Ionicons name="camera" size={16} color={white} />
                  )}
                </View>
              </TouchableOpacity>
              <ThemedText type="2xl" weight="bold" style={{ color: gray900 }}>
                {photographer.name}
              </ThemedText>
              <ThemedText weight="medium" style={{ color: gray700 }}>
                {photographer.specialization || "Professional Photographer"}
              </ThemedText>

              {photographer.bio && (
                <ThemedText
                  type="sm"
                  style={{
                    color: gray600,
                    marginTop: 8,
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  {photographer.bio}
                </ThemedText>
              )}

              <View style={styles.badgesContainer}>
                <BadgeDisplay
                  badgeName={photographer.badge || "Rookie"}
                  size="small"
                />
                {kycStatus === "verified" && (
                  <View
                    style={[
                      styles.badgeVerified,
                      { backgroundColor: success + "33" },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={14}
                      color={success}
                    />
                    <ThemedText
                      type="xs"
                      weight="bold"
                      style={{ color: success }}
                    >
                      Verified
                    </ThemedText>
                  </View>
                )}
                {kycStatus === "pending" && (
                  <View
                    style={[
                      styles.badgePending,
                      { backgroundColor: warning + "33" },
                    ]}
                  >
                    <Ionicons name="shield" size={14} color={warning} />
                    <ThemedText
                      type="xs"
                      weight="bold"
                      style={{ color: warning }}
                    >
                      Pending
                    </ThemedText>
                  </View>
                )}
                {kycStatus === "rejected" && (
                  <View
                    style={[
                      styles.badgeRejected,
                      { backgroundColor: errorColor + "33" },
                    ]}
                  >
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={errorColor}
                    />
                    <ThemedText
                      type="xs"
                      weight="bold"
                      style={{ color: errorColor }}
                    >
                      Rejected
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            {/* Stats Section - New Design */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText
                  type="2xl"
                  weight="extrabold"
                  style={{ color: gray900 }}
                >
                  {photographer.rank}
                </ThemedText>
                <ThemedText
                  type="sm"
                  weight="medium"
                  style={{ color: gray900, marginTop: 4 }}
                >
                  Rank
                </ThemedText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 2,
                  }}
                >
                  <ThemedText
                    style={{ fontSize: 12, marginRight: 2 }}
                  ></ThemedText>
                  <ThemedText type="sm" style={{ color: gray500 }}>
                    {photographer.points.toLocaleString()} pts
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.statItem,
                  styles.statDivider,
                  { borderLeftColor: gray200, borderRightColor: gray200 },
                ]}
              >
                <ThemedText
                  type="2xl"
                  weight="extrabold"
                  style={{ color: gray900 }}
                >
                  {photographer.rating}
                </ThemedText>
                <ThemedText
                  type="sm"
                  weight="medium"
                  style={{ color: gray900, marginTop: 4 }}
                >
                  Rating
                </ThemedText>
                <ThemedText type="sm" style={{ color: gray500, marginTop: 2 }}>
                  {photographer.reviews} reviews
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText
                  type="2xl"
                  weight="extrabold"
                  style={{ color: gray900 }}
                >
                  {photographer.totalBookings}
                </ThemedText>
                <ThemedText
                  type="sm"
                  weight="medium"
                  style={{ color: gray900, marginTop: 4 }}
                >
                  Bookings
                </ThemedText>
                <ThemedText type="sm" style={{ color: gray500, marginTop: 2 }}>
                  Completed
                </ThemedText>
              </View>
            </View>

            {/* KYC Alert - Four States */}
            {kycStatus === "verified" ? (
              <View style={[styles.kycVerified, { backgroundColor: success }]}>
                <Ionicons name="shield-checkmark" size={28} color={white} />
                <View style={styles.kycAlertContent}>
                  <ThemedText
                    type="base"
                    weight="bold"
                    style={{ color: white }}
                  >
                    KYC Verified Account
                  </ThemedText>
                  <ThemedText type="sm" style={{ color: white, marginTop: 2 }}>
                    Your account is verified and trusted by ClickSeekers
                  </ThemedText>
                </View>
              </View>
            ) : kycStatus === "pending" ? (
              <View
                style={[
                  styles.kycUnderReview,
                  {
                    backgroundColor: primary + "1A",
                    borderColor: primary + "40",
                  },
                ]}
              >
                <Ionicons name="shield" size={24} color={primary} />
                <ThemedText
                  type="sm"
                  weight="medium"
                  style={{ color: primary, marginLeft: 12 }}
                >
                  Your KYC verification is under review
                </ThemedText>
              </View>
            ) : kycStatus === "rejected" ? (
              <View
                style={[
                  styles.kycRejected,
                  {
                    backgroundColor: errorColor + "1A",
                    borderColor: errorColor + "40",
                  },
                ]}
              >
                <Ionicons name="close-circle" size={28} color={errorColor} />
                <View style={styles.kycAlertContent}>
                  <ThemedText
                    type="base"
                    weight="bold"
                    style={{ color: errorColor }}
                  >
                    KYC Verification Rejected
                  </ThemedText>
                  <ThemedText
                    type="sm"
                    style={{ color: errorColor, marginTop: 4 }}
                  >
                    Your KYC submission was rejected. Please review the feedback
                    and resubmit with correct information.
                  </ThemedText>
                  <TouchableOpacity
                    testID="kyc-verify-button"
                    style={[styles.kycButton, { backgroundColor: errorColor }]}
                    onPress={() => setShowKYC(true)}
                  >
                    <ThemedText
                      type="sm"
                      weight="bold"
                      style={styles.kycButtonText}
                    >
                      Resubmit KYC
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.kycNotSubmitted,
                  {
                    backgroundColor: primary + "1A",
                    borderColor: primary + "40",
                  },
                ]}
              >
                <Ionicons name="shield-outline" size={28} color={primary} />
                <View style={styles.kycAlertContent}>
                  <ThemedText
                    type="sm"
                    weight="medium"
                    style={{ color: primary }}
                  >
                    Complete KYC verification to get verified badge and boost
                    your bookings!
                  </ThemedText>
                  <TouchableOpacity
                    testID="kyc-verify-button"
                    style={[styles.kycButton, { backgroundColor: primary }]}
                    onPress={() => setShowKYC(true)}
                  >
                    <ThemedText
                      type="sm"
                      weight="bold"
                      style={styles.kycButtonText}
                    >
                      Verify Now
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Contact Info */}
            <View style={styles.contactInfo}>
              <View style={styles.contactItem}>
                <Ionicons name="mail" size={20} color={gray600} />
                <ThemedText type="sm" style={styles.contactText}>
                  {photographer.email}
                </ThemedText>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="call" size={20} color={gray600} />
                <ThemedText type="sm" style={styles.contactText}>
                  {photographer.phone}
                </ThemedText>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="location" size={20} color={gray600} />
                <ThemedText type="sm" style={styles.contactText}>
                  {photographer.location || "Not Specified"}
                </ThemedText>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="camera" size={20} color={gray600} />
                <ThemedText type="sm" style={styles.contactText}>
                  Member since {photographer.memberSince}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemFirst]}
            onPress={onSettings}
          >
            <Ionicons name="settings" size={24} color={gray600} />
            <ThemedText weight="medium" style={styles.menuItemText}>
              Settings
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={gray400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setHelpModalOpen(true)}
          >
            <Ionicons name="help-circle" size={24} color={gray600} />
            <ThemedText weight="medium" style={styles.menuItemText}>
              Help & Support
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={gray400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={24} color={errorColor} />
            <ThemedText
              weight="medium"
              style={[styles.menuItemText, styles.menuItemTextLogout]}
            >
              Logout
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={gray400} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: gray200 }]}>
              <TouchableOpacity
                onPress={() => {
                  if (activeSubView !== 'form') {
                    setActiveSubView('form');
                  } else {
                    setEditModalOpen(false);
                  }
                }}
                style={styles.iconBtn}
              >
                <Ionicons name={activeSubView === 'form' ? "close" : "arrow-back"} size={22} color={gray900} />
              </TouchableOpacity>
              <ThemedText type="lg" weight="extrabold" style={{ color: gray900 }}>
                {activeSubView === 'form' ? "Edit Profile" : (activeSubView === 'specialization' ? "Select Specialization" : "Select City")}
              </ThemedText>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
              {editedProfile && activeSubView === 'form' && (
                <>
                  <ThemedText type="xs" weight="extrabold" style={[styles.fieldLabel, { color: gray500 }]}>Full Name</ThemedText>
                  <TextInput
                    testID="edit-name-input"
                    value={editedProfile.name}
                    onChangeText={(t) => setEditedProfile((p) => (p ? { ...p, name: t } : null))}
                    style={[styles.fieldInput, { color: gray900, backgroundColor: gray100, borderColor: gray300 }]}
                    placeholder="Full name"
                    placeholderTextColor={gray400}
                  />
                  <ThemedText type="xs" weight="extrabold" style={[styles.fieldLabel, { color: gray500 }]}>Specialization</ThemedText>
                  <TouchableOpacity
                    onPress={() => setActiveSubView('specialization')}
                    style={[styles.fieldInput, { backgroundColor: gray100, borderColor: gray300, justifyContent: 'center' }]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ThemedText style={{ color: editedProfile.specialization ? gray900 : gray400 }}>{editedProfile.specialization || "Select specialization"}</ThemedText>
                      <Ionicons name="chevron-down" size={18} color={gray400} />
                    </View>
                  </TouchableOpacity>
                  <ThemedText type="xs" weight="extrabold" style={[styles.fieldLabel, { color: gray500 }]}>Phone</ThemedText>
                  <TextInput
                    value={editedProfile.phone}
                    onChangeText={(t) => setEditedProfile((p) => (p ? { ...p, phone: t } : null))}
                    style={[styles.fieldInput, { color: gray900, backgroundColor: gray100, borderColor: gray300 }]}
                    placeholder="Phone"
                    placeholderTextColor={gray400}
                    keyboardType="phone-pad"
                  />
                  <ThemedText type="xs" weight="extrabold" style={[styles.fieldLabel, { color: gray500 }]}>Location</ThemedText>
                  <TouchableOpacity
                    onPress={() => setActiveSubView('location')}
                    style={[styles.fieldInput, { backgroundColor: gray100, borderColor: gray300, justifyContent: 'center' }]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ThemedText style={{ color: editedProfile.location ? gray900 : gray400 }}>{editedProfile.location || "Select city"}</ThemedText>
                      <Ionicons name="chevron-down" size={18} color={gray400} />
                    </View>
                  </TouchableOpacity>
                  <ThemedText type="xs" weight="extrabold" style={[styles.fieldLabel, { color: gray500 }]}>Bio</ThemedText>
                  <TextInput
                    testID="edit-bio-input"
                    value={editedProfile.bio}
                    onChangeText={(t) => setEditedProfile((p) => (p ? { ...p, bio: t } : null))}
                    style={[styles.fieldInput, styles.bioInput, { color: gray900, backgroundColor: gray100, borderColor: gray300 }]}
                    placeholder="Tell clients about your photography style..."
                    placeholderTextColor={gray400}
                    multiline
                  />
                </>
              )}
              {editedProfile && activeSubView === 'specialization' && (
                <View style={{ marginTop: 10 }}>
                  {PHOTOGRAPHER_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.pickerItem, { borderBottomColor: gray200 }]}
                      onPress={() => {
                        setEditedProfile(p => p ? { ...p, specialization: type } : null);
                        setActiveSubView('form');
                      }}
                    >
                      <ThemedText weight="medium" style={{ color: editedProfile?.specialization === type ? primary : gray700 }}>{type}</ThemedText>
                      {editedProfile?.specialization === type && <Ionicons name="checkmark" size={20} color={primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {editedProfile && activeSubView === 'location' && (
                <View style={{ marginTop: 10 }}>
                  {NEPAL_CITIES.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={[styles.pickerItem, { borderBottomColor: gray200 }]}
                      onPress={() => {
                        setEditedProfile(p => p ? { ...p, location: city } : null);
                        setActiveSubView('form');
                      }}
                    >
                      <ThemedText weight="medium" style={{ color: editedProfile?.location === city ? primary : gray700 }}>{city}</ThemedText>
                      {editedProfile?.location === city && <Ionicons name="checkmark" size={20} color={primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              {activeSubView === 'form' ? (
                <>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: gray200 }]}
                    onPress={() => setEditModalOpen(false)}
                    activeOpacity={0.85}
                  >
                    <ThemedText type="base" weight="bold" style={{ color: gray600 }}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="save-profile-button"
                    style={[styles.modalBtn, { backgroundColor: primary }]}
                    onPress={handleSaveProfile}
                    activeOpacity={0.85}
                  >
                    <ThemedText type="base" weight="bold" style={{ color: white }}>Save Changes</ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: gray200, flex: 1 }]}
                  onPress={() => setActiveSubView('form')}
                  activeOpacity={0.85}
                >
                  <ThemedText type="base" weight="bold" style={{ color: gray600 }}>Back to Form</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <HelpSupportModal visible={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: {
    color: "#111827",
    marginBottom: 4,
  },
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    backgroundColor: "#1e3a8a",
    paddingTop: 16,
    paddingBottom: 60,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: {
    color: "white",
  },
  profileCardContainer: {
    paddingHorizontal: 16,
    marginTop: -40,
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  profileImageSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
  },
  profileName: {
    color: "#111827",
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  profileLocation: {
    color: "#6b7280",
    marginLeft: 4,
  },
  profileRole: {
    color: "#6b7280",
    marginBottom: 8,
  },
  specialization: {
    color: "#4b5563",
    marginBottom: 8,
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  badgeElite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fed7aa",
    borderRadius: 20,
  },
  badgeEmojiText: {
    // fontSize: 14,
  },
  badgeText: {
    color: "#92400e",
  },
  badgeVerified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#d1fae5",
    borderRadius: 20,
  },
  badgeVerifiedText: {
    color: "#065f46",
  },
  badgePending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fcd34d",
    borderRadius: 20,
  },
  badgePendingText: {
    color: "#92400e",
  },
  badgeRejected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fee2e2",
    borderRadius: 20,
  },
  kycVerified: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  kycUnderReview: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "center",
  },
  kycNotSubmitted: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  kycRejected: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  kycAlertContent: {
    flex: 1,
  },
  kycAlertText: {
    color: "#1e3a8a",
    marginBottom: 8,
  },
  kycButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  kycButtonText: {
    color: "white",
  },
  contactInfo: {
    gap: 12,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactText: {
    color: "#4b5563",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    color: "#4b5563",
    textAlign: "center",
  },
  menuContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
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
    color: "#111827",
  },
  menuItemTextLogout: {
    color: "#dc2626",
  },
  // Avatar edit styles
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    position: "relative",
  },
  avatarEditOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  iconBtn: {
    padding: 5,
  },
  fieldLabel: {
    marginTop: 15,
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
  },
  bioInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    columnGap: 12,
    marginTop: 25,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  // Specialization Picker Modal Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pickerModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  miniStrengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  miniBar: {
    flexDirection: "row",
    width: 60,
    height: 4,
    gap: 3,
  },
  miniSegment: {
    flex: 1,
    borderRadius: 2,
  },
  incompleteDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "white",
  },
});
