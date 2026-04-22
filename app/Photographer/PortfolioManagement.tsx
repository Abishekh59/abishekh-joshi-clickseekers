import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { PHOTOGRAPHER_TYPES } from "../../constants/photographerTypes";
import { useAppTheme } from "../../hooks/use-app-theme";
import {
  Comment as APIComment,
  API_HOST,
  PortfolioCategoryName,
  PortfolioImage,
  apiService,
} from "../../services/api";
import { socketService } from "../../services/socket";
import { storage } from "../../utils/storage";
// Component to fetch and display image blob as base64

interface PortfolioManagementProps {
  onBack?: () => void;
}

const UPLOAD_CATEGORIES = PHOTOGRAPHER_TYPES;

type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

const CATEGORY_TO_API: Record<string, PortfolioCategoryName> = {
  Portrait: "PORTRAIT",
  Landscape: "LANDSCAPE",
  Wildlife: "WILDLIFE",
  Street: "STREET",
  Fashion: "FASHION",
  Event: "EVENT",
  Sports: "SPORTS",
  Product: "PRODUCT",
  Food: "FOOD",
  Travel: "TRAVEL",
  "Fine Art": "FINE_ART",
  Conceptual: "CONCEPTUAL",
  Abstract: "ABSTRACT",
  "Black & White": "BLACK_AND_WHITE",
  Silhouette: "SILHOUETTE",
  Macro: "MACRO",
  Astrophotography: "ASTROPHOTOGRAPHY",
  "Long Exposure": "LONG_EXPOSURE",
  "Aerial/Drone": "AERIAL_DRONE",
  Architectural: "ARCHITECTURAL",
  "Real Estate": "REAL_ESTATE",
  Commercial: "COMMERCIAL",
  Editorial: "EDITORIAL",
  Documentary: "DOCUMENTARY",
  Photojournalism: "PHOTOJOURNALISM",
  Lifestyle: "LIFESTYLE",
  "Influencer/Instagram": "INFLUENCER_INSTAGRAM",
  Cinematic: "CINEMATIC",
  Minimalist: "MINIMALIST",
  Other: "OTHER",
};

// Helper to format relative time
const getRelativeTime = (dateString?: string) => {
  if (!dateString) return "Recently";
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

type DisplayPortfolioItem = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  category: PortfolioCategoryName | "UNKNOWN";
  imageUrl: string | null;
  likes: number;
  views: number;
  comments: number;
  created_at?: string;
};

const CATEGORY_OPTIONS: {
  label: string;
  value: PortfolioCategoryName | null;
}[] = [
  { label: "All", value: null },
  ...PHOTOGRAPHER_TYPES.map((cat) => ({
    label: cat,
    value: CATEGORY_TO_API[cat] || ("OTHER" as PortfolioCategoryName),
  })),
];

const formatCategoryLabel = (value: PortfolioCategoryName | "UNKNOWN") => {
  const entry = Object.entries(CATEGORY_TO_API).find(
    ([_, val]) => val === value,
  );
  return entry ? entry[0] : "Uncategorized";
};

const toAbsoluteImageUrl = (
  img: PortfolioImage | string | null | undefined,
  timestamp?: number,
) => {
  if (!img) return null;
  const cacheBust = timestamp ? `?t=${timestamp}` : "";

  let url = "";
  if (typeof img === "string") {
    url = img;
  } else {
    url = img.image_url;
    // Fallback for older images stored only as binary in DB
    if (!url && img.image_id) {
      const fallbackUrl = `${API_HOST}/api/photographer/portfolio/image/${img.image_id}${cacheBust}`;
      console.log(
        `[toAbsoluteImageUrl] Using fallback for image ${img.image_id}:`,
        fallbackUrl,
      );
      return fallbackUrl;
    }
  }

  if (!url || url.trim() === "") {
    console.debug(`[toAbsoluteImageUrl] Empty URL, returning null`);
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url.includes("?")
      ? `${url}&t=${timestamp || Date.now()}`
      : `${url}${cacheBust}`;
  }
  const path = url.startsWith("/") ? url : `/${url}`;
  const finalUrl = `${API_HOST}${path}${cacheBust}`;
  return finalUrl;
};

export default function PortfolioManagement({
  onBack,
}: PortfolioManagementProps) {
  const insets = useSafeAreaInsets();
  const {
    primary,
    secondary,
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
  const [showUpload, setShowUpload] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<PortfolioCategoryName | null>(null);
  const [category, setCategory] = useState<UploadCategory | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
  const [userName, setUserName] = useState<string>("Photographer");
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);

  // Edit states
  const [editingItem, setEditingItem] = useState<DisplayPortfolioItem | null>(
    null,
  );
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCategory, setEditCategory] = useState<UploadCategory | "">("");
  const [showOptionsModal, setShowOptionsModal] =
    useState<DisplayPortfolioItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] =
    useState<DisplayPortfolioItem | null>(null);
  const [refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now());
  const [showLikesPanel, setShowLikesPanel] = useState(false);
  const [selectedPostForLikes, setSelectedPostForLikes] =
    useState<DisplayPortfolioItem | null>(null);
  const [viewDetailsUser, setViewDetailsUser] = useState<any | null>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [likedImageIds, setLikedImageIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await storage.getToken();
        if (token) {
          const res = await apiService.getMe(token);
          if (res.success && res.data) {
            setUserName(res.data.full_name || "Photographer");
            setUserId(res.data.user_id);
            setUserProfileImage(res.data.profile_image || null);
          } else {
            // Fallback for older data structures
            const decoded: any = jwtDecode(token);
            setUserName(decoded.full_name || "Photographer");
          }
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    };
    fetchProfile();
  }, []);

  const mappedItems: DisplayPortfolioItem[] = images.map((img) => {
    const displayItem = {
      id: img.image_id,
      title: img.title || "Untitled photo",
      description: img.description || null,
      location: img.location || null,
      category: (img.portfolio?.category?.category_name ||
        "UNKNOWN") as PortfolioCategoryName | "UNKNOWN",
      imageUrl: toAbsoluteImageUrl(img, refreshTimestamp),
      likes: img.likes_count || 0,
      views: img.views_count || 0,
      comments: img.comments_count || 0,
      created_at: img.created_at,
    };

    // Debug log
    if (!displayItem.imageUrl) {
      console.warn(
        `[mappedItems] Missing imageUrl for image ${img.image_id}:`,
        {
          raw_image_url: img.image_url,
          title: img.title,
          image_id: img.image_id,
          portfolio_id: img.portfolio_id,
        },
      );
    }

    return displayItem;
  });

  const filteredItems = selectedCategory
    ? mappedItems.filter((item) => item.category === selectedCategory)
    : mappedItems;

  const uploadedCount = mappedItems.length;
  const uploadedLabel = uploadedCount === 1 ? "photo" : "photos";

  const handleDeleteImage = async (imageId: number) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this photo from your portfolio?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await storage.getToken();
              if (!token) return;
              await apiService.deletePortfolioImage(imageId, token);
              setImages((prev) =>
                prev.filter((img) => img.image_id !== imageId),
              );

              // Close any open options or detail views
              setShowOptionsModal(null);
              setSelectedImageIndex(null);

              Alert.alert("Success", "Post deleted successfully");
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete image");
            }
          },
        },
      ],
    );
  };

  const handleEditPress = (item: DisplayPortfolioItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setEditLocation(item.location || "");
    setEditCategory(formatCategoryLabel(item.category) as UploadCategory);
    setShowOptionsModal(null);
  };

  const handleEditSubmit = async () => {
    if (!editingItem) return;
    if (!editTitle.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }

    try {
      const token = await storage.getToken();
      if (!token) return;

      setUpdating(true);
      const apiCategory = editCategory
        ? CATEGORY_TO_API[editCategory]
        : undefined;

      await apiService.updatePortfolioImage(
        editingItem.id,
        {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          location: editLocation.trim() || undefined,
          category: apiCategory,
        },
        token,
      );

      // Refresh images
      await fetchPortfolio();
      setEditingItem(null);
      Alert.alert("Success", "Post updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update post");
    } finally {
      setUpdating(false);
    }
  };

  const handleLike = async (item: DisplayPortfolioItem) => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      const isLiked = likedImageIds.includes(item.id);

      // Optimistic UI update
      setLikedImageIds((prev) =>
        isLiked ? prev.filter((id) => id !== item.id) : [...prev, item.id],
      );

      // Update the local images state to reflect count change
      setImages((prev) =>
        prev.map((img) => {
          if (img.image_id === item.id) {
            return {
              ...img,
              likes_count: (img.likes_count || 0) + (isLiked ? -1 : 1),
            };
          }
          return img;
        }),
      );

      const res = await apiService.likePortfolioImage(item.id, token);
      if (res.success && res.data) {
        // Sync with server response if possible
        const serverLiked = res.data.isLiked;
        setLikedImageIds((prev) => {
          const others = prev.filter((id) => id !== item.id);
          return serverLiked ? [...others, item.id] : others;
        });
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
      // Revert if needed, but usually not necessary for portfolio view
    }
  };

  const totalLikes = mappedItems.reduce((sum, item) => sum + item.likes, 0);
  const totalViews = mappedItems.reduce((sum, item) => sum + item.views, 0);
  const totalComments = mappedItems.reduce(
    (sum, item) => sum + item.comments,
    0,
  );
  const fetchPortfolio = useCallback(
    async (isRefresh = false) => {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const token = await storage.getToken();
        if (!token) {
          setError("You need to be logged in to view your portfolio");
          setImages([]);
          return;
        }

        const res = await apiService.getMyPortfolioImages(
          token,
          selectedCategory || undefined,
        );

        console.log("[fetchPortfolio] API Response:", {
          success: res.success,
          imageCount: res.data?.length || 0,
          firstImageUrl: res.data?.[0]?.image_url || "NONE",
          sample: res.data?.slice(0, 2).map((img) => ({
            id: img.image_id,
            title: img.title,
            image_url: img.image_url,
          })),
        });

        setImages(res.data || []);

        // Fetch liked image IDs to show correct heart state
        const likesRes = await apiService.getUserLikes(token);
        if (likesRes.success && likesRes.data) {
          setLikedImageIds(likesRes.data.likedImageIds || []);
        }

        setRefreshTimestamp(Date.now());
      } catch (err: any) {
        console.error("[PortfolioManagement] Fetch Error:", err);
        setError(err?.message || "Failed to load portfolio");
        setImages([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory],
  );

  useEffect(() => {
    fetchPortfolio();

    const handleUpdate = (data: any) => {
      // Only refresh if the update is for this photographer
      if (data && data.photographerId && userId) {
        if (
          String(data.photographerId).toLowerCase() ===
          String(userId).toLowerCase()
        ) {
          fetchPortfolio(true);
        }
      } else {
        // Fallback for legacy events or if userId not yet loaded
        fetchPortfolio(true);
      }
    };
    socketService.on("photographer_updated", handleUpdate);
    return () => {
      socketService.off("photographer_updated", handleUpdate);
    };
  }, [fetchPortfolio, userId]);

  const handleUploadPress = () => {
    if (!showUpload) {
      setShowUpload(true);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to upload images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a title for the photo.");
      return;
    }

    if (!category) {
      Alert.alert("Missing category", "Please choose a category.");
      return;
    }

    if (!selectedImage) {
      Alert.alert("No image", "Please pick an image to upload.");
      return;
    }

    const token = await storage.getToken();
    if (!token) {
      Alert.alert("Not logged in", "Please log in to upload portfolio images.");
      return;
    }

    const apiCategory = CATEGORY_TO_API[category];
    const fileName =
      selectedImage.fileName ||
      selectedImage.uri.split("/").pop() ||
      "photo.jpg";
    const fileType = selectedImage.mimeType || "image/jpeg";

    setUploading(true);
    try {
      // Ensure uri is present and valid
      if (!selectedImage.uri) {
        throw new Error("Image URI is missing. Please select a valid image.");
      }

      await apiService.uploadPortfolioImage(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          category: apiCategory,
          file: {
            uri: selectedImage.uri,
            name: fileName,
            type: fileType,
          },
        },
        token,
      );

      Alert.alert("Success", "Portfolio photo uploaded successfully!");
      setShowUpload(false);
      setTitle("");
      setDescription("");
      setLocation("");
      setCategory("");
      setSelectedImage(null);
      await fetchPortfolio();
    } catch (err: any) {
      Alert.alert("Upload failed", err?.message || "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  const renderPortfolioItem = ({
    item,
    index,
  }: {
    item: DisplayPortfolioItem;
    index: number;
  }) => {
    // Debug log to see what's happening
    console.log(`[PortfolioItem ${index}]`, {
      id: item.id,
      title: item.title,
      imageUrl: item.imageUrl ? "✓" : "✗ (NULL/EMPTY)",
      category: item.category,
    });

    return (
      <TouchableOpacity
        style={[styles.portfolioItemContainer, { backgroundColor: gray100 }]}
        onPress={() => setSelectedImageIndex(index)}
        activeOpacity={0.9}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.portfolioImage}
            resizeMode="cover"
            onError={(e) => console.log(`[Image Error ${item.id}]`, e)}
          />
        ) : (
          <View
            style={[
              styles.portfolioImage,
              {
                backgroundColor: gray200,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons name="image-outline" size={32} color={gray400} />
            <ThemedText
              type="xs"
              style={{ color: gray500, marginTop: 4, textAlign: "center" }}
            >
              No Image
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: gray100 }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "ios" ? 10 : insets.top + 12,
            backgroundColor: gray100,
            borderBottomColor: gray200,
          },
        ]}
      >
        <View style={styles.headerTop}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={gray900} />
            </TouchableOpacity>
          )}
          <View style={styles.headerContent}>
            <View>
              <ThemedText type="xl" weight="bold" style={styles.headerTitle}>
                My Portfolio
              </ThemedText>
            </View>
            <TouchableOpacity
              testID="add-photo-button"
              style={[
                styles.uploadButton,
                { backgroundColor: primary, shadowColor: primary },
              ]}
              onPress={handleUploadPress}
            >
              <Ionicons name="add" size={24} color={white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section - Profile Style */}
        <View
          style={[
            styles.statsRow,
            {
              backgroundColor: gray100,
              marginHorizontal: 16,
              marginTop: 16,
              padding: 16,
            },
          ]}
        >
          <View style={styles.statItem}>
            <ThemedText
              type="2xl"
              weight="extrabold"
              style={{ color: gray900 }}
            >
              {mappedItems.length}
            </ThemedText>
            <ThemedText
              type="sm"
              weight="medium"
              style={{ color: gray900, marginTop: 4 }}
            >
              Photos
            </ThemedText>
            <ThemedText type="sm" style={{ color: gray500, marginTop: 2 }}>
              Uploaded
            </ThemedText>
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
              {totalLikes}
            </ThemedText>
            <ThemedText
              type="sm"
              weight="medium"
              style={{ color: gray900, marginTop: 4 }}
            >
              Likes
            </ThemedText>
            <ThemedText type="sm" style={{ color: gray500, marginTop: 2 }}>
              Total
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText
              type="2xl"
              weight="extrabold"
              style={{ color: gray900 }}
            >
              {totalComments}
            </ThemedText>
            <ThemedText
              type="sm"
              weight="medium"
              style={{ color: gray900, marginTop: 4 }}
            >
              Comments
            </ThemedText>
            <ThemedText type="sm" style={{ color: gray500, marginTop: 2 }}>
              Total
            </ThemedText>
          </View>
        </View>

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {CATEGORY_OPTIONS.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              style={[
                styles.categoryButton,
                { backgroundColor: gray100 },
                selectedCategory === cat.value && { backgroundColor: primary },
              ]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <ThemedText
                type="xs"
                weight="medium"
                style={[
                  styles.categoryText,
                  { color: gray700 },
                  selectedCategory === cat.value && { color: white },
                ]}
              >
                {cat.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <View
          style={[styles.errorBanner, { backgroundColor: errorColor + "15" }]}
        >
          <ThemedText
            weight="bold"
            style={[styles.errorText, { color: errorColor }]}
          >
            {error}
          </ThemedText>
        </View>
      ) : null}

      {/* Portfolio Grid */}
      <FlatList
        data={filteredItems}
        renderItem={renderPortfolioItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPortfolio(true)}
          />
        }
        ListEmptyComponent={
          loading || refreshing ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={48} color={gray400} />
              <ThemedText
                type="lg"
                weight="bold"
                style={[styles.emptyTitle, { color: gray900, marginTop: 12 }]}
              >
                No photos yet
              </ThemedText>
              <ThemedText
                type="sm"
                style={[styles.emptySubtitle, { color: gray500, marginTop: 8 }]}
              >
                Upload your first portfolio image to showcase your work.
              </ThemedText>
            </View>
          )
        }
      />

      {/* Upload Modal */}
      <Modal
        visible={showUpload}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUpload(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: background }]}>
            <View
              style={[
                styles.modalHeader,
                { borderBottomWidth: 1, borderBottomColor: gray100 },
              ]}
            >
              <ThemedText
                type="lg"
                weight="bold"
                style={[styles.modalTitle, { color: gray900 }]}
              >
                Upload Photos
              </ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowUpload(false)}
              >
                <Ionicons name="close" size={24} color={gray500} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Title Input */}
              <View style={styles.formField}>
                <ThemedText
                  type="sm"
                  weight="bold"
                  style={[styles.formLabel, { color: gray900 }]}
                >
                  Title
                </ThemedText>
                <TextInput
                  testID="photo-title-input"
                  style={[
                    styles.textInput,
                    {
                      color: gray900,
                      borderColor: gray200,
                      backgroundColor: gray100,
                    },
                  ]}
                  placeholder="Enter photo title"
                  placeholderTextColor={gray400}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Description Input */}
              <View style={styles.formField}>
                <ThemedText
                  type="sm"
                  weight="bold"
                  style={[styles.formLabel, { color: gray900 }]}
                >
                  Description
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.descriptionInput,
                    {
                      color: gray900,
                      borderColor: gray200,
                      backgroundColor: gray100,
                    },
                  ]}
                  placeholder="Tell us about this photo..."
                  placeholderTextColor={gray400}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              {/* Location Input */}
              <View style={styles.formField}>
                <ThemedText
                  type="sm"
                  weight="bold"
                  style={[styles.formLabel, { color: gray900 }]}
                >
                  Location
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: gray900,
                      borderColor: gray200,
                      backgroundColor: gray100,
                    },
                  ]}
                  placeholder="e.g. Pokhara, Nepal"
                  placeholderTextColor={gray400}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              {/* Category Select */}
              <View style={styles.formField}>
                <ThemedText
                  type="sm"
                  weight="bold"
                  style={[styles.formLabel, { color: gray900 }]}
                >
                  Category
                </ThemedText>
                <TouchableOpacity
                  testID="category-picker"
                  style={[
                    styles.pickerContainer,
                    { backgroundColor: gray100, borderColor: gray200 },
                  ]}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <ThemedText
                    style={[styles.pickerText, !category && { color: gray400 }]}
                  >
                    {category || "Select a category"}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={20} color={gray500} />
                </TouchableOpacity>
              </View>

              {/* Upload Area */}
              <View style={styles.formField}>
                <ThemedText
                  type="sm"
                  weight="bold"
                  style={[styles.formLabel, { color: gray900 }]}
                >
                  Upload Photos
                </ThemedText>

                <TouchableOpacity
                  style={[
                    styles.uploadArea,
                    { borderColor: gray200, backgroundColor: gray100 },
                  ]}
                  onPress={pickImage}
                >
                  {selectedImage ? (
                    <View style={styles.previewWrapper}>
                      <Image
                        source={{ uri: selectedImage.uri }}
                        style={styles.previewImage}
                      />
                      <TouchableOpacity
                        style={styles.clearPreviewButton}
                        onPress={() => setSelectedImage(null)}
                      >
                        <Ionicons name="close" size={16} color={white} />
                      </TouchableOpacity>
                      <ThemedText
                        type="xs"
                        style={[styles.previewName, { color: gray900 }]}
                        numberOfLines={1}
                      >
                        {selectedImage.fileName || selectedImage.uri}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.uploadInner}>
                      <View
                        style={[
                          styles.uploadIconContainer,
                          { backgroundColor: primary + "15" },
                        ]}
                      >
                        <Ionicons
                          name="cloud-upload-outline"
                          size={32}
                          color={primary}
                        />
                      </View>
                      <ThemedText
                        weight="bold"
                        style={[styles.uploadText, { color: gray900 }]}
                      >
                        Tap to pick from device
                      </ThemedText>
                      <ThemedText
                        type="xs"
                        style={[styles.uploadHint, { color: gray500 }]}
                      >
                        PNG, JPG up to 10MB each
                      </ThemedText>

                      {/* Hidden button for E2E testing to simulate image Selection */}
                      <TouchableOpacity
                        testID="test-set-portfolio-image"
                        style={{ height: 1, width: 1, opacity: 0 }}
                        onPress={() => {
                          setSelectedImage({
                            uri: "https://placehold.co/600x400.png",
                            name: "test_portfolio.png",
                            type: "image/png",
                          } as any);
                        }}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View
              style={[
                styles.modalFooter,
                {
                  borderTopWidth: 1,
                  borderTopColor: gray100,
                  paddingTop: 16,
                  paddingBottom: 24,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { borderColor: gray200 },
                ]}
                onPress={() => setShowUpload(false)}
              >
                <ThemedText
                  weight="semibold"
                  style={[styles.cancelButtonText, { color: gray900 }]}
                >
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                testID="upload-submit-button"
                style={[
                  styles.button,
                  styles.submitButton,
                  { backgroundColor: primary },
                  uploading && { opacity: 0.75 },
                ]}
                onPress={handleUploadSubmit}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={white} />
                ) : (
                  <ThemedText
                    weight="bold"
                    style={[styles.submitButtonText, { color: white }]}
                  >
                    Upload
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {showCategoryPicker && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
              <View style={styles.categoryModalOverlay}>
                <TouchableWithoutFeedback
                  onPress={() => setShowCategoryPicker(false)}
                >
                  <View style={StyleSheet.absoluteFillObject} />
                </TouchableWithoutFeedback>

                <View
                  style={[
                    styles.categoryModalContent,
                    { backgroundColor: background },
                  ]}
                >
                  <ThemedText
                    type="lg"
                    weight="bold"
                    style={[styles.categoryModalTitle, { color: gray900 }]}
                  >
                    Select Category
                  </ThemedText>
                  <ScrollView
                    style={{ maxHeight: 420 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {UPLOAD_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryOption,
                          category === cat && {
                            backgroundColor: primary + "10",
                          },
                        ]}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.categoryOptionText,
                            { color: gray700 },
                            category === cat && {
                              color: primary,
                              fontWeight: "700",
                            },
                          ]}
                        >
                          {cat}
                        </ThemedText>
                        {category === cat && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Category Picker Modal */}

      {/* Premium Instagram-style Detail View (Feed View) */}
      {selectedImageIndex !== null && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
          <TouchableWithoutFeedback onPress={() => setSelectedImageIndex(null)}>
            <View style={StyleSheet.absoluteFillObject}>
              <View style={styles.detailOverlay} />
            </View>
          </TouchableWithoutFeedback>

          <View style={[styles.detailContent, { backgroundColor: background }]}>
            <View style={styles.feedHeader}>
              <TouchableOpacity
                onPress={() => setSelectedImageIndex(null)}
                style={{ padding: 8 }}
              >
                <Ionicons name="chevron-back" size={28} color={gray900} />
              </TouchableOpacity>
              <ThemedText
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  marginLeft: 8,
                  color: gray900,
                }}
              >
                Portfolio
              </ThemedText>
            </View>
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id.toString()}
              initialScrollIndex={selectedImageIndex ?? 0}
              onScrollToIndexFailed={(info) => {
                console.warn("Scroll to index failed:", info);
              }}
              getItemLayout={(_, index) => ({
                length: 600, // Approximate height of a post
                offset: 600 * index,
                index,
              })}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.postCard}>
                  {/* Post Header */}
                  <View style={styles.postHeader}>
                    <View style={styles.postHeaderLeft}>
                      <Image
                        source={(() => {
                          const profileUri = toAbsoluteImageUrl(
                            userProfileImage,
                            refreshTimestamp,
                          );
                          return profileUri
                            ? { uri: profileUri }
                            : {
                                uri: `https://ui-avatars.com/api/?name=${userName || "User"}&background=f1f5f9&color=64748b`,
                              };
                        })()}
                        style={styles.postAvatar}
                      />
                      <View>
                        <ThemedText
                          type="sm"
                          weight="bold"
                          style={{ color: gray900 }}
                        >
                          {userName}
                        </ThemedText>
                        <ThemedText type="xs" style={{ color: gray500 }}>
                          {formatCategoryLabel(item.category)}
                        </ThemedText>
                        {item.location ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginTop: 2,
                              gap: 2,
                            }}
                          >
                            <Ionicons
                              name="location-outline"
                              size={11}
                              color={gray500}
                            />
                            <ThemedText type="xs" style={{ color: gray500 }}>
                              {item.location}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <TouchableOpacity
                        onPress={() => setShowOptionsModal(item)}
                        style={{ padding: 8 }}
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={20}
                          color={gray900}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Post Image */}
                  <View style={styles.postImageContainer}>
                    {item.imageUrl && (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.postImageLarge}
                        resizeMode="cover"
                      />
                    )}
                  </View>

                  {/* Post Actions */}
                  <View style={styles.postActionsRow}>
                    <View style={styles.postActionsLeft}>
                      {/* Tappable heart + count (TikTok-style) */}
                      <TouchableOpacity
                        style={styles.postActionBtn}
                        onPress={() => handleLike(item)}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Ionicons
                            name={
                              likedImageIds.includes(item.id)
                                ? "heart"
                                : "heart-outline"
                            }
                            size={26}
                            color={
                              likedImageIds.includes(item.id)
                                ? "#e11d48"
                                : gray900
                            }
                          />
                          <ThemedText
                            type="sm"
                            weight="bold"
                            style={{ color: gray900 }}
                          >
                            {item.likes}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                      {/* Tappable comment icon + count */}
                      <TouchableOpacity
                        style={styles.postActionBtn}
                        onPress={() => {
                          setSelectedPostForComments(item);
                          setShowCommentsModal(true);
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Ionicons
                            name="chatbubble-outline"
                            size={24}
                            color={gray900}
                          />
                          <ThemedText
                            type="sm"
                            weight="bold"
                            style={{ color: gray900 }}
                          >
                            {item.comments}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity>
                      <Ionicons
                        name="bookmark-outline"
                        size={24}
                        color={gray900}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Post Info */}
                  <View style={styles.postInfoSection}>
                    {/* Tappable likes & comments line */}
                    <View
                      style={{ flexDirection: "row", gap: 12, marginBottom: 6 }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedPostForLikes(item);
                          setShowLikesPanel(true);
                        }}
                      >
                        <ThemedText
                          type="sm"
                          weight="bold"
                          style={{ color: gray900 }}
                        >
                          {item.likes} {item.likes === 1 ? "like" : "likes"}
                        </ThemedText>
                      </TouchableOpacity>
                      <ThemedText type="sm" style={{ color: gray500 }}>
                        •
                      </ThemedText>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedPostForComments(item);
                          setShowCommentsModal(true);
                        }}
                      >
                        <ThemedText
                          type="sm"
                          weight="bold"
                          style={{ color: gray900 }}
                        >
                          {item.comments}{" "}
                          {item.comments === 1 ? "comment" : "comments"}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>

                    <ThemedText
                      type="sm"
                      style={{ color: gray900, lineHeight: 18 }}
                    >
                      <ThemedText type="sm" weight="bold">
                        {userName}{" "}
                      </ThemedText>
                      <ThemedText
                        type="sm"
                        weight="semibold"
                        style={{ color: info }}
                      >
                        #{item.title.replace(/\s+/g, "")}{" "}
                      </ThemedText>
                      {item.description ||
                        "Captured some beautiful moments today!"}
                    </ThemedText>

                    <ThemedText
                      type="xs"
                      style={{
                        color: gray500,
                        marginTop: 12,
                        marginBottom: 20,
                      }}
                    >
                      {getRelativeTime(item.created_at).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: "#f1f1f1",
                      marginVertical: 10,
                    }}
                  />
                </View>
              )}
            />
          </View>
        </View>
      )}

      {/* Post Options Menu (Instagram style) */}
      <Modal
        visible={!!showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(null)}
      >
        <View style={{ flex: 1, zIndex: 100 }}>
          <TouchableWithoutFeedback onPress={() => setShowOptionsModal(null)}>
            <View style={styles.modalOverlay}>
              <View
                style={[styles.optionsSheet, { backgroundColor: background }]}
              >
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() =>
                    showOptionsModal && handleEditPress(showOptionsModal)
                  }
                >
                  <Ionicons name="create-outline" size={22} color={gray900} />
                  <ThemedText style={styles.optionText}>Edit Post</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() =>
                    showOptionsModal && handleDeleteImage(showOptionsModal.id)
                  }
                >
                  <Ionicons name="trash-outline" size={22} color={errorColor} />
                  <ThemedText
                    style={[styles.optionText, { color: errorColor }]}
                  >
                    Delete Post
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionItem, { borderBottomWidth: 0 }]}
                  onPress={() => setShowOptionsModal(null)}
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      { textAlign: "center", width: "100%", fontWeight: "400" },
                    ]}
                  >
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={!!editingItem}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={{ flex: 1, zIndex: 110 }}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: background, minHeight: 400 },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomWidth: 1, borderBottomColor: gray100 },
                ]}
              >
                <ThemedText
                  type="lg"
                  weight="bold"
                  style={[styles.modalTitle, { color: gray900 }]}
                >
                  Edit Post
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setEditingItem(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={gray500} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formField}>
                  <ThemedText
                    type="sm"
                    weight="bold"
                    style={[styles.formLabel, { color: gray900 }]}
                  >
                    Title
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: gray900,
                        borderColor: gray200,
                        backgroundColor: gray100,
                      },
                    ]}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholderTextColor={gray400}
                  />
                </View>

                <View style={styles.formField}>
                  <ThemedText
                    type="sm"
                    weight="bold"
                    style={[styles.formLabel, { color: gray900 }]}
                  >
                    Category
                  </ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.pickerContainer,
                      { borderColor: gray200, backgroundColor: gray100 },
                    ]}
                    onPress={() => setShowCategoryPicker(true)}
                  >
                    <ThemedText style={[styles.pickerText, { color: gray900 }]}>
                      {editCategory || "Choose photo category"}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={20} color={gray500} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formField}>
                  <ThemedText
                    type="sm"
                    weight="bold"
                    style={[styles.formLabel, { color: gray900 }]}
                  >
                    Location
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: gray900,
                        borderColor: gray200,
                        backgroundColor: gray100,
                      },
                    ]}
                    placeholder="e.g. Pokhara, Nepal"
                    placeholderTextColor={gray400}
                    value={editLocation}
                    onChangeText={setEditLocation}
                  />
                </View>

                <View style={styles.formField}>
                  <ThemedText
                    type="sm"
                    weight="bold"
                    style={[styles.formLabel, { color: gray900 }]}
                  >
                    Description
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.descriptionInput,
                      {
                        color: gray900,
                        borderColor: gray200,
                        backgroundColor: gray100,
                      },
                    ]}
                    multiline
                    numberOfLines={4}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholderTextColor={gray400}
                  />
                </View>
              </ScrollView>

              <View
                style={[
                  styles.modalFooter,
                  {
                    borderTopWidth: 1,
                    borderTopColor: gray100,
                    paddingTop: 16,
                    paddingBottom: 24,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    { borderColor: gray200 },
                  ]}
                  onPress={() => setEditingItem(null)}
                >
                  <ThemedText
                    weight="semibold"
                    style={[styles.cancelButtonText, { color: gray900 }]}
                  >
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    { backgroundColor: primary },
                    updating && { opacity: 0.75 },
                  ]}
                  onPress={handleEditSubmit}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color={white} />
                  ) : (
                    <ThemedText
                      weight="bold"
                      style={[styles.submitButtonText, { color: white }]}
                    >
                      Save Changes
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reusable Comments Modal */}
      {selectedPostForComments && (
        <CommentsModal
          visible={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          post={selectedPostForComments}
          onViewUserDetails={(user) => {
            setViewDetailsUser(user);
            setShowUserDetailsModal(true);
          }}
        />
      )}

      {/* Likes Panel – TikTok-style bottom sheet */}
      {selectedPostForLikes && (
        <LikesPanel
          visible={showLikesPanel}
          onClose={() => setShowLikesPanel(false)}
          post={selectedPostForLikes}
          onViewUserDetails={(user) => {
            setViewDetailsUser(user);
            setShowUserDetailsModal(true);
          }}
        />
      )}

      {/* User Details Modal */}
      <UserDetailsModal
        visible={showUserDetailsModal}
        user={viewDetailsUser}
        onClose={() => {
          setShowUserDetailsModal(false);
          setViewDetailsUser(null);
        }}
      />
    </View>
  );
}

// Reusable Comments Modal for Portfolio Management (Photographer side)
const CommentsModal = ({
  visible,
  onClose,
  post,
  onViewUserDetails,
}: {
  visible: boolean;
  onClose: () => void;
  post: { id: number };
  onViewUserDetails?: (user: any) => void;
}) => {
  const [comments, setComments] = useState<APIComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<APIComment | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    gray900,
    gray100,
    gray400,
    gray500,
    gray600,
    background,
    white,
    primary,
    info,
  } = useAppTheme();

  useEffect(() => {
    if (visible && post) {
      fetchComments();
      loadUser();
    }
  }, [visible, post]);

  const loadUser = async () => {
    const user = await storage.getUser();
    setCurrentUser(user);
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await apiService.getComments(post.id);
      setComments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = await storage.getToken();
      if (!token) return;

      await apiService.addComment(
        post.id,
        newComment,
        token,
        replyTo?.comment_id,
      );

      setNewComment("");
      setReplyTo(null);
      fetchComments();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (id: number) => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      await apiService.deleteComment(post.id, id, token);
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={gray900} />
            </TouchableOpacity>
            <ThemedText type="lg" weight="bold">
              Comments
            </ThemedText>
            <View style={{ width: 32 }} />
          </View>

          {loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={primary} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.comment_id.toString()}
              renderItem={({ item }) => (
                <View style={styles.commentItemContainer}>
                  <View style={styles.commentMain}>
                    {/* Avatar */}
                    <View style={styles.commentAvatarContainer}>
                      {item.user?.profile_image ? (
                        <Image
                          source={{ uri: item.user.profile_image }}
                          style={{ width: 36, height: 36, borderRadius: 18 }}
                        />
                      ) : (
                        <Ionicons
                          name="person-circle"
                          size={36}
                          color={gray400}
                        />
                      )}
                    </View>
                    <View style={styles.commentContent}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <ThemedText
                          type="xs"
                          weight="bold"
                          style={{ color: gray900 }}
                        >
                          {item.user?.full_name}
                        </ThemedText>
                        {/* View Details button (instead of Follow) */}
                        {currentUser?.user_id !== item.user_id &&
                          onViewUserDetails && (
                            <TouchableOpacity
                              onPress={() => onViewUserDetails(item.user)}
                              style={styles.viewDetailsBtn}
                            >
                              <ThemedText
                                type="xs"
                                weight="bold"
                                style={{ color: primary }}
                              >
                                View Details
                              </ThemedText>
                            </TouchableOpacity>
                          )}
                        {currentUser?.user_id === item.user_id && (
                          <TouchableOpacity
                            onPress={() => handleDeleteComment(item.comment_id)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={14}
                              color="#ef4444"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                      <ThemedText
                        type="sm"
                        style={{ color: gray600, marginTop: 2 }}
                      >
                        {item.comment_text}
                      </ThemedText>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          marginTop: 4,
                        }}
                      >
                        <ThemedText type="xs" style={{ color: gray500 }}>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )
                            : ""}
                        </ThemedText>
                        <TouchableOpacity onPress={() => setReplyTo(item)}>
                          <ThemedText
                            type="xs"
                            weight="bold"
                            style={{ color: gray500 }}
                          >
                            Reply
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {item.replies && item.replies.length > 0 && (
                    <View style={styles.repliesList}>
                      {item.replies.map((reply) => (
                        <View key={reply.comment_id} style={styles.replyItem}>
                          <View style={styles.commentMain}>
                            <View style={styles.commentContent}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <ThemedText
                                  type="xs"
                                  weight="bold"
                                  style={{ color: gray900 }}
                                >
                                  {reply.user?.full_name}
                                </ThemedText>
                                {currentUser?.user_id === reply.user_id && (
                                  <TouchableOpacity
                                    onPress={() =>
                                      handleDeleteComment(reply.comment_id)
                                    }
                                  >
                                    <Ionicons
                                      name="trash-outline"
                                      size={14}
                                      color="#ef4444"
                                    />
                                  </TouchableOpacity>
                                )}
                              </View>
                              <ThemedText
                                type="sm"
                                style={{ color: gray600, marginTop: 2 }}
                              >
                                {reply.comment_text}
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: 40 }}>
                  <ThemedText style={{ color: gray500 }}>
                    No comments yet.
                  </ThemedText>
                </View>
              }
            />
          )}

          <View
            style={[
              styles.modalInputArea,
              {
                backgroundColor: background,
                borderTopWidth: 1,
                borderTopColor: gray100,
              },
            ]}
          >
            {replyTo && (
              <View style={styles.replyNotice}>
                <ThemedText type="xs" style={{ color: gray600 }}>
                  Replying to {replyTo.user?.full_name}
                </ThemedText>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <Ionicons name="close-circle" size={16} color={gray500} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                style={[
                  styles.modalInput,
                  { color: gray900, backgroundColor: gray100 },
                ]}
                placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
                placeholderTextColor={gray500}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                onPress={handlePostComment}
                disabled={isSubmitting}
              >
                <ThemedText
                  weight="bold"
                  style={{
                    color: newComment.trim() ? info : gray500,
                    marginLeft: 12,
                  }}
                >
                  {isSubmitting ? "..." : "Post"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

type LikeUser = {
  user_id: string;
  full_name: string;
  profile_image: string | null;
  email?: string;
  bio?: string;
  role?: string;
};

const LikesPanel = ({
  visible,
  onClose,
  post,
  onViewUserDetails,
}: {
  visible: boolean;
  onClose: () => void;
  post: { id: number; likes: number };
  onViewUserDetails: (user: LikeUser) => void;
}) => {
  const [likers, setLikers] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    gray900,
    gray100,
    gray400,
    gray500,
    gray200,
    background,
    primary,
    white,
  } = useAppTheme();

  useEffect(() => {
    if (visible && post) {
      fetchLikers();
    }
  }, [visible, post]);

  const fetchLikers = async () => {
    try {
      setLoading(true);
      const token = await storage.getToken();
      if (!token) return;
      const res = await apiService.getImageLikes(post.id, token);
      setLikers(res.data || []);
    } catch (err: any) {
      // Any error (including JSON parse, 404, network) → show empty silently
      console.warn("[LikesPanel] Could not load likes:", err?.message);
      setLikers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[styles.likesPanelContent, { backgroundColor: background }]}
        >
          {/* Handle bar */}
          <View style={styles.likesPanelHandle} />

          {/* Header */}
          <View style={styles.likesPanelHeader}>
            <ThemedText type="lg" weight="bold" style={{ color: gray900 }}>
              Likes
            </ThemedText>
            <View
              style={[styles.likesBadge, { backgroundColor: primary + "18" }]}
            >
              <ThemedText type="sm" weight="bold" style={{ color: primary }}>
                {post.likes}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ marginLeft: "auto" as any, padding: 4 }}
            >
              <Ionicons name="close" size={24} color={gray500} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={primary} />
            </View>
          ) : likers.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="heart-outline" size={48} color={gray400} />
              <ThemedText type="sm" style={{ color: gray500, marginTop: 12 }}>
                No likes yet
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={likers}
              keyExtractor={(u) => u.user_id}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24,
              }}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: gray100 }} />
              )}
              renderItem={({ item }) => (
                <View style={styles.likerRow}>
                  {/* Avatar */}
                  <View style={styles.likerAvatarWrap}>
                    {item.profile_image ? (
                      <Image
                        source={{ uri: item.profile_image }}
                        style={styles.likerAvatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.likerAvatarFallback,
                          { backgroundColor: gray100 },
                        ]}
                      >
                        <ThemedText
                          type="sm"
                          weight="bold"
                          style={{ color: primary }}
                        >
                          {item.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </ThemedText>
                      </View>
                    )}
                    {/* Red heart badge */}
                    <View style={styles.likerHeartBadge}>
                      <Ionicons name="heart" size={10} color={white} />
                    </View>
                  </View>

                  {/* Name + role */}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ThemedText
                      type="sm"
                      weight="bold"
                      style={{ color: gray900 }}
                    >
                      {item.full_name}
                    </ThemedText>
                    {item.role && (
                      <ThemedText
                        type="xs"
                        style={{
                          color: gray500,
                          textTransform: "capitalize",
                          marginTop: 1,
                        }}
                      >
                        {item.role.charAt(0) + item.role.slice(1).toLowerCase()}
                      </ThemedText>
                    )}
                  </View>

                  {/* View Details button */}
                  <TouchableOpacity
                    style={[
                      styles.viewDetailsBtnLarge,
                      {
                        backgroundColor: primary + "12",
                        borderColor: primary + "30",
                      },
                    ]}
                    onPress={() => onViewUserDetails(item)}
                  >
                    <ThemedText
                      type="xs"
                      weight="bold"
                      style={{ color: primary }}
                    >
                      View Details
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── User Details Modal ────────────────────────────────────────────────────
const UserDetailsModal = ({
  visible,
  user,
  onClose,
}: {
  visible: boolean;
  user: any | null;
  onClose: () => void;
}) => {
  const [fullUser, setFullUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const {
    gray900,
    gray100,
    gray400,
    gray500,
    gray200,
    gray600,
    background,
    primary,
    white,
    success,
  } = useAppTheme();

  useEffect(() => {
    if (visible && user?.user_id) {
      fetchFullUser(user.user_id);
    } else if (visible && user) {
      setFullUser(user);
    }
  }, [visible, user]);

  const fetchFullUser = async (userId: string) => {
    try {
      setLoadingUser(true);
      const token = await storage.getToken();
      if (!token) {
        setFullUser(user);
        return;
      }
      const res = await apiService.getUserById(userId, token);
      setFullUser(res.data || user);
    } catch {
      setFullUser(user);
    } finally {
      setLoadingUser(false);
    }
  };

  const displayUser = fullUser || user;

  const roleBadgeColor = (role?: string) => {
    if (!role) return gray400;
    if (role === "PHOTOGRAPHER") return primary;
    if (role === "CLIENT") return "#16a34a";
    return gray500;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[styles.userDetailsContent, { backgroundColor: background }]}
        >
          {/* Handle */}
          <View style={styles.likesPanelHandle} />

          {/* Close button */}
          <TouchableOpacity onPress={onClose} style={styles.userDetailsClose}>
            <Ionicons name="close" size={22} color={gray500} />
          </TouchableOpacity>

          {loadingUser ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={primary} />
            </View>
          ) : !displayUser ? null : (
            <ScrollView
              contentContainerStyle={styles.userDetailsBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Avatar section */}
              <View style={styles.userDetailsAvatarWrap}>
                {displayUser.profile_image ? (
                  <Image
                    source={{ uri: displayUser.profile_image }}
                    style={styles.userDetailsAvatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.userDetailsAvatarFallback,
                      { backgroundColor: primary + "20" },
                    ]}
                  >
                    <ThemedText
                      style={{
                        fontSize: 40,
                        fontWeight: "800",
                        color: primary,
                      }}
                    >
                      {displayUser.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Name */}
              <ThemedText
                type="2xl"
                weight="extrabold"
                style={{ color: gray900, textAlign: "center", marginTop: 12 }}
              >
                {displayUser.full_name}
              </ThemedText>

              {/* Role badge */}
              {displayUser.role && (
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: roleBadgeColor(displayUser.role) + "18",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.roleDot,
                      { backgroundColor: roleBadgeColor(displayUser.role) },
                    ]}
                  />
                  <ThemedText
                    type="xs"
                    weight="bold"
                    style={{
                      color: roleBadgeColor(displayUser.role),
                      textTransform: "capitalize",
                    }}
                  >
                    {displayUser.role.charAt(0) +
                      displayUser.role.slice(1).toLowerCase()}
                  </ThemedText>
                </View>
              )}

              {/* Details cards */}
              <View
                style={[styles.userDetailsCard, { backgroundColor: gray100 }]}
              >
                {displayUser.email && (
                  <View style={styles.userDetailsRow}>
                    <Ionicons name="mail-outline" size={18} color={primary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <ThemedText type="xs" style={{ color: gray500 }}>
                        Email
                      </ThemedText>
                      <ThemedText
                        type="sm"
                        weight="semibold"
                        style={{ color: gray900, marginTop: 2 }}
                      >
                        {displayUser.email}
                      </ThemedText>
                    </View>
                  </View>
                )}

                {displayUser.phone && (
                  <>
                    <View
                      style={[
                        styles.userDetailsRowDivider,
                        { backgroundColor: gray200 },
                      ]}
                    />
                    <View style={styles.userDetailsRow}>
                      <Ionicons name="call-outline" size={18} color={primary} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <ThemedText type="xs" style={{ color: gray500 }}>
                          Phone
                        </ThemedText>
                        <ThemedText
                          type="sm"
                          weight="semibold"
                          style={{ color: gray900, marginTop: 2 }}
                        >
                          {displayUser.phone}
                        </ThemedText>
                      </View>
                    </View>
                  </>
                )}

                {displayUser.location && (
                  <>
                    <View
                      style={[
                        styles.userDetailsRowDivider,
                        { backgroundColor: gray200 },
                      ]}
                    />
                    <View style={styles.userDetailsRow}>
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color={primary}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <ThemedText type="xs" style={{ color: gray500 }}>
                          Location
                        </ThemedText>
                        <ThemedText
                          type="sm"
                          weight="semibold"
                          style={{ color: gray900, marginTop: 2 }}
                        >
                          {displayUser.location}
                        </ThemedText>
                      </View>
                    </View>
                  </>
                )}

                {displayUser.specialization && (
                  <>
                    <View
                      style={[
                        styles.userDetailsRowDivider,
                        { backgroundColor: gray200 },
                      ]}
                    />
                    <View style={styles.userDetailsRow}>
                      <Ionicons
                        name="camera-outline"
                        size={18}
                        color={primary}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <ThemedText type="xs" style={{ color: gray500 }}>
                          Specialization
                        </ThemedText>
                        <ThemedText
                          type="sm"
                          weight="semibold"
                          style={{ color: gray900, marginTop: 2 }}
                        >
                          {displayUser.specialization}
                        </ThemedText>
                      </View>
                    </View>
                  </>
                )}

                {displayUser.kyc_verified !== undefined && (
                  <>
                    <View
                      style={[
                        styles.userDetailsRowDivider,
                        { backgroundColor: gray200 },
                      ]}
                    />
                    <View style={styles.userDetailsRow}>
                      <Ionicons
                        name={
                          displayUser.kyc_verified
                            ? "checkmark-circle"
                            : "time-outline"
                        }
                        size={18}
                        color={displayUser.kyc_verified ? success : gray500}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <ThemedText type="xs" style={{ color: gray500 }}>
                          KYC Status
                        </ThemedText>
                        <ThemedText
                          type="sm"
                          weight="semibold"
                          style={{
                            color: displayUser.kyc_verified ? success : gray600,
                            marginTop: 2,
                          }}
                        >
                          {displayUser.kyc_verified
                            ? "Verified"
                            : "Not Verified"}
                        </ThemedText>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Bio */}
              {displayUser.bio && (
                <View
                  style={[styles.userBioCard, { backgroundColor: gray100 }]}
                >
                  <ThemedText
                    type="xs"
                    weight="bold"
                    style={{ color: gray500, marginBottom: 6 }}
                  >
                    BIO
                  </ThemedText>
                  <ThemedText
                    type="sm"
                    style={{ color: gray900, lineHeight: 20 }}
                  >
                    {displayUser.bio}
                  </ThemedText>
                </View>
              )}

              {/* Close button */}
              <TouchableOpacity
                style={[
                  styles.userDetailsCloseBtn,
                  { backgroundColor: gray100 },
                ]}
                onPress={onClose}
              >
                <ThemedText type="sm" weight="bold" style={{ color: gray600 }}>
                  Close
                </ThemedText>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    // fontWeight: '700', // Removed as ThemedText handles weight
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  uploadButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  statsCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 11,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
  },

  errorText: {
    textAlign: "center",
    fontSize: 14,
  },
  gridContainer: {
    padding: 2,
    flexGrow: 1,
  },
  gridRow: {
    paddingHorizontal: 1,
    paddingBottom: 2,
  },
  portfolioItemContainer: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  portfolioImage: {
    width: "100%",
    height: "100%",
  },
  portfolioOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "space-between",
    padding: 8,
  },
  portfolioTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: "white",
    fontSize: 10,
  },
  portfolioStats: {
    flex: 1,
    justifyContent: "flex-end",
  },
  portfolioTitle: {
    color: "white",
    fontSize: 12,
    marginBottom: 4,
  },
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
  statText: {
    color: "white",
    fontSize: 10,
  },
  gridActionBtn: {
    padding: 6,
    borderRadius: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: "center",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "92%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 22,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  formField: {
    marginBottom: 24,
  },
  formLabel: {
    marginBottom: 10,
    fontSize: 15,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerText: {
    fontSize: 15,
  },
  placeholderText: {},
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  categoryModalContent: {
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  categoryModalTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryOptionSelected: {},
  categoryOptionText: {
    fontSize: 15,
  },
  categoryOptionTextSelected: {
    fontWeight: "600",
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  descriptionInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  uploadArea: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  uploadInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewWrapper: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
  },
  clearPreviewButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  previewName: {
    fontSize: 13,
    textAlign: "center",
  },
  uploadIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 15,
    marginBottom: 6,
  },
  uploadHint: {
    fontSize: 13,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {},
  submitButton: {},
  submitButtonText: {},
  // Options Sheet Styles
  optionsSheet: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    marginTop: "auto",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  commentItemContainer: {
    marginBottom: 16,
  },
  commentMain: {
    flexDirection: "row",
  },
  commentAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  commentContent: {
    flex: 1,
  },
  repliesList: {
    marginLeft: 40,
    marginTop: 12,
  },
  replyItem: {
    marginBottom: 12,
  },
  modalInputArea: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#efefef",
  },
  replyNotice: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    marginBottom: 8,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  // Detail Modal Styles
  detailModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  postAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
  },
  postImageContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#000",
  },
  postImageLarge: {
    width: "100%",
    height: "100%",
  },
  postActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  postActionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  postActionBtn: {
    padding: 2,
  },
  postInfoSection: {
    paddingHorizontal: 16,
    flex: 1,
  },
  postCard: {
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  detailContent: {
    width: "100%",
    height: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    marginTop: "auto",
  },

  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // ─── View Details button (in comment row) ───
  viewDetailsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },

  // ─── Likes Panel ───────────────────────────
  likesPanelContent: {
    height: "70%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
    marginTop: "auto" as any,
    overflow: "hidden",
  },
  likesPanelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  likesPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  likesBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  likerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  likerAvatarWrap: {
    position: "relative",
    width: 46,
    height: 46,
  },
  likerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  likerAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  likerHeartBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#e11d48",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  viewDetailsBtnLarge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },

  // ─── User Details Modal ────────────────────
  userDetailsContent: {
    height: "85%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: "auto" as any,
    overflow: "hidden",
  },
  userDetailsClose: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  userDetailsBody: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
    alignItems: "center",
  },
  userDetailsAvatarWrap: {
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  userDetailsAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  userDetailsAvatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  userDetailsCard: {
    width: "100%",
    borderRadius: 16,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  userDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  userDetailsRowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 30,
  },
  userBioCard: {
    width: "100%",
    borderRadius: 16,
    marginTop: 12,
    padding: 16,
  },
  userDetailsCloseBtn: {
    marginTop: 24,
    width: "100%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
});
