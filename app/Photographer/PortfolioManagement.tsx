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

const UPLOAD_CATEGORIES = [
  "Portrait",
  "Event",
  "Product",
  "Wedding",
  "Aerial",
  "Fashion",
  "Travel",
  "Landscape",
  "Culture",
  "Nature",
  "Wildlife",
  "Sports",
  "Family",
  "Newborn",
  "Commercial",
  "Fine Art",
  "Real Estate",
  "Other",
] as const;

type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];
const CATEGORY_TO_API: Record<UploadCategory, PortfolioCategoryName> = {
  Wedding: "WEDDING",
  Event: "EVENT",
  Product: "PRODUCT",
  Portrait: "PORTRAIT",
  Aerial: "AERIAL",
  Fashion: "FASHION",
  Travel: "TRAVEL",
  Landscape: "LANDSCAPE",
  Culture: "CULTURE",
  Nature: "NATURE",
  Wildlife: "WILDLIFE",
  Sports: "SPORTS",
  Family: "FAMILY",
  Newborn: "NEWBORN",
  Commercial: "COMMERCIAL",
  "Fine Art": "FINE_ART",
  "Real Estate": "REAL_ESTATE",
  Other: "OTHER",
};

type DisplayPortfolioItem = {
  id: number;
  title: string;
  description: string | null;
  category: PortfolioCategoryName | "UNKNOWN";
  imageUrl: string | null;
  likes: number;
  views: number;
  comments: number;
};

const CATEGORY_OPTIONS: {
  label: string;
  value: PortfolioCategoryName | null;
}[] = [
  { label: "All", value: null },
  { label: "Portrait", value: "PORTRAIT" },
  { label: "Event", value: "EVENT" },
  { label: "Product", value: "PRODUCT" },
  { label: "Wedding", value: "WEDDING" },
  { label: "Aerial", value: "AERIAL" },
  { label: "Fashion", value: "FASHION" },
  { label: "Travel", value: "TRAVEL" },
  { label: "Landscape", value: "LANDSCAPE" },
  { label: "Culture", value: "CULTURE" },
  { label: "Nature", value: "NATURE" },
  { label: "Wildlife", value: "WILDLIFE" },
  { label: "Sports", value: "SPORTS" },
  { label: "Family", value: "FAMILY" },
  { label: "Newborn", value: "NEWBORN" },
  { label: "Commercial", value: "COMMERCIAL" },
  { label: "Fine Art", value: "FINE_ART" },
  { label: "Real Estate", value: "REAL_ESTATE" },
  { label: "Other", value: "OTHER" },
];

const formatCategoryLabel = (value: PortfolioCategoryName | "UNKNOWN") => {
  switch (value) {
    case "PORTRAIT":
      return "Portrait";
    case "EVENT":
      return "Event";
    case "WEDDING":
      return "Wedding";
    case "AERIAL":
      return "Aerial";
    case "FASHION":
      return "Fashion";
    case "TRAVEL":
      return "Travel";
    case "LANDSCAPE":
      return "Landscape";
    case "CULTURE":
      return "Culture";
    case "NATURE":
      return "Nature";
    case "WILDLIFE":
      return "Wildlife";
    case "SPORTS":
      return "Sports";
    case "FAMILY":
      return "Family";
    case "NEWBORN":
      return "Newborn";
    case "COMMERCIAL":
      return "Commercial";
    case "FINE_ART":
      return "Fine Art";
    case "REAL_ESTATE":
      return "Real Estate";
    case "PRODUCT":
      return "Product";
    case "OTHER":
      return "Other";
    default:
      return "Uncategorized";
  }
};

const toAbsoluteImageUrl = (img: PortfolioImage) => {
  if (img?.image_url && img.image_url.trim() !== "") {
    if (
      img.image_url.startsWith("http://") ||
      img.image_url.startsWith("https://")
    )
      return img.image_url;
    const path = img.image_url.startsWith("/")
      ? img.image_url
      : `/${img.image_url}`;
    return `${API_HOST}${path}`;
  }
  // Fallback for older images stored only as binary in DB
  if (img?.image_id) {
    return `${API_HOST}/api/photographer/portfolio/image/${img.image_id}`;
  }
  return null;
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
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
  const [userName, setUserName] = useState<string>("Photographer");

  // Edit states
  const [editingItem, setEditingItem] = useState<DisplayPortfolioItem | null>(
    null,
  );
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<UploadCategory | "">("");
  const [showOptionsModal, setShowOptionsModal] =
    useState<DisplayPortfolioItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] =
    useState<DisplayPortfolioItem | null>(null);

  useEffect(() => {
    const getName = async () => {
      try {
        const token = await storage.getToken();
        if (token) {
          const decoded: any = jwtDecode(token);
          setUserName(decoded.full_name || "Photographer");
        }
      } catch (e) {
        console.error("Error decoding token:", e);
      }
    };
    getName();
  }, []);

  const mappedItems: DisplayPortfolioItem[] = images.map((img) => ({
    id: img.image_id,
    title: img.title || "Untitled photo",
    description: img.description || null,
    category: img.portfolio?.category?.category_name || "UNKNOWN",
    imageUrl: toAbsoluteImageUrl(img),
    likes: img.likes_count || 0,
    views: img.views_count || 0,
    comments: img.comments_count || 0,
  }));

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

              if (selectedImageIndex !== null) {
                if (filteredItems.length <= 1) {
                  setSelectedImageIndex(null);
                }
              }
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
    setEditCategory(item.category as UploadCategory);
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
        setImages(res.data || []);
      } catch (err: any) {
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

    const handleUpdate = () => fetchPortfolio(true);
    socketService.on("photographer_updated", handleUpdate);
    return () => {
      socketService.off("photographer_updated", handleUpdate);
    };
  }, [fetchPortfolio]);

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
          category: apiCategory,
          file: {
            uri: selectedImage.uri,
            name: fileName,
            type: fileType,
          },
        },
        token,
      );

      setShowUpload(false);
      setTitle("");
      setDescription("");
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
  }) => (
    <TouchableOpacity
      style={[styles.portfolioItemContainer, { backgroundColor: gray100 }]}
      onPress={() => setSelectedImageIndex(index)}
      activeOpacity={0.9}
    >
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.portfolioImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.portfolioOverlay}>
        <View style={styles.portfolioTopRow}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: "rgba(255, 255, 255, 0.2)" },
            ]}
          >
            <ThemedText
              type="xs"
              weight="bold"
              style={styles.categoryBadgeText}
            >
              {formatCategoryLabel(item.category)}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={() => setShowOptionsModal(item)}
            style={[
              styles.gridActionBtn,
              { backgroundColor: "rgba(0,0,0,0.3)" },
            ]}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={white} />
          </TouchableOpacity>
        </View>
        <View style={styles.portfolioStats}>
          <ThemedText
            type="xs"
            weight="bold"
            style={styles.portfolioTitle}
            numberOfLines={1}
          >
            {item.title}
          </ThemedText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={10} color={white} />
              <ThemedText type="xs" style={styles.statText}>
                {item.likes}
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble" size={10} color={white} />
              <ThemedText type="xs" style={styles.statText}>
                {item.comments}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 12 },
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
              <ThemedText
                type="xs"
                style={[styles.headerSubtitle, { color: gray500 }]}
              >
                {uploadedCount} {uploadedLabel} uploaded
              </ThemedText>
            </View>
            <TouchableOpacity
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
              backgroundColor: white,
              marginHorizontal: 16,
              marginTop: 16,
              borderRadius: 16,
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
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <ThemedText
                type="lg"
                weight="bold"
                style={[styles.emptyTitle, { color: gray900 }]}
              >
                No photos yet
              </ThemedText>
              <ThemedText
                type="sm"
                style={[styles.emptySubtitle, { color: gray500 }]}
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
                        source={require("../../assets/images/abishek.png")}
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
                      <TouchableOpacity style={styles.postActionBtn}>
                        <Ionicons
                          name="heart-outline"
                          size={26}
                          color={gray900}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.postActionBtn}
                        onPress={() => {
                          setSelectedPostForComments(item);
                          setShowCommentsModal(true);
                        }}
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={24}
                          color={gray900}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.postActionBtn}>
                        <Ionicons
                          name="paper-plane-outline"
                          size={24}
                          color={gray900}
                        />
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
                    <ThemedText
                      type="sm"
                      weight="bold"
                      style={{ color: gray900, marginBottom: 4 }}
                    >
                      {item.likes} likes • {item.comments} comments
                    </ThemedText>

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
                      JUST NOW
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
    </View>
  );
}

// Reusable Comments Modal for Portfolio Management (Photographer side)
const CommentsModal = ({
  visible,
  onClose,
  post,
}: {
  visible: boolean;
  onClose: () => void;
  post: { image_id: number };
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
      const res = await apiService.getComments(post.image_id);
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
        post.image_id,
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
      await apiService.deleteComment(post.image_id, id, token);
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
                    <View style={styles.commentAvatarContainer}>
                      <Ionicons
                        name="person-circle"
                        size={32}
                        color={gray400}
                      />
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
                      <TouchableOpacity
                        onPress={() => setReplyTo(item)}
                        style={{ marginTop: 4 }}
                      >
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
});
