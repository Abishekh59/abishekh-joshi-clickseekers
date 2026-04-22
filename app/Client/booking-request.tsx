import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapModal from "../../components/MapModal";
import { UniversalCalendar } from "../../components/UniversalCalendar";
import { apiService } from "../../services/api";
import { socketService } from "../../services/socket";
import { storage } from "../../utils/storage";

type PackageOption = {
  id: string;
  name: string;
  price: number;
  duration?: string;
  description?: string;
  features?: string[];
};

function formatYYYYMMDD(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const Text = ThemedText;

export default function BookingRequest() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const gray900 = useThemeColor({}, "gray900");
  const gray500 = useThemeColor({}, "gray500");
  const background = useThemeColor({}, "background");

  const p_id = params.photographerId as string;
  const p_name = params.photographerName as string;
  const p_avatar = params.photographerAvatar as string;
  const pkg_id = params.packageId ? String(params.packageId) : "";
  const pkg_name = params.packageName as string;
  const pkg_price = parseFloat(params.packagePrice as string) || 0;
  const packagesParam = params.packages as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [eventType, setEventType] = useState("");
  const [location, setLocation] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState(pkg_id);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeDate, setTimeDate] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEventTypePicker, setShowEventTypePicker] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // selectedTime is now manually entered via TextInput

  // Reusable function to fetch photographer availability
  const fetchAvailabilityData = useCallback(async () => {
    if (!p_id) return;

    try {
      setLoadingAvailability(true);
      const result = await apiService.getPhotographerAvailability(p_id);

      if (result.success && result.data) {
        const blocked: string[] = [];
        const booked: string[] = [];

        console.log("Photographer Availability Raw Data:", result.data); // Debug log
        result.data.forEach((item: any) => {
          const dateStr =
            typeof item.date === "string" ? item.date.split("T")[0] : item.date;
          const reason = item.reason || "";

          if (reason.startsWith("Booked:")) {
            booked.push(dateStr);
          } else if (
            reason.toLowerCase().includes("unavailable") ||
            reason.toLowerCase().includes("blocked")
          ) {
            // Only treat it as blocked if the reason says so!
            blocked.push(dateStr);
          } else {
            // If it's something else, log it but don't block it unless necessary
            console.log(
              `Skipping categorization for date ${dateStr} with reason: ${reason}`,
            );
          }
        });

        setBlockedDates(blocked);
        setBookedDates(booked);
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
      // Keep empty array on error
    } finally {
      setLoadingAvailability(false);
    }
  }, [p_id]);

  // Initial fetch and socket setup
  useEffect(() => {
    fetchAvailabilityData();

    // Connect socket and listen for availability updates
    const setupSocket = async () => {
      try {
        const token = await storage.getToken();
        if (token) {
          socketService.connect(token);

          // Listen for when photographer updates their availability
          socketService.on("photographer_availability_updated", (data: any) => {
            console.log("Photographer availability updated:", data);
            if (data.photographer_id === p_id) {
              // Refetch availability when photographer updates their blocked dates
              fetchAvailabilityData();
            }
          });

          // Alternative event names in case backend uses different naming
          socketService.on("availability_updated", (data: any) => {
            console.log("Availability updated:", data);
            if (data.photographer_id === p_id) {
              fetchAvailabilityData();
            }
          });

          socketService.on("blocked_dates_updated", (data: any) => {
            console.log("Blocked dates updated:", data);
            if (data.photographer_id === p_id) {
              fetchAvailabilityData();
            }
          });
        }
      } catch (err) {
        console.error("Socket setup error:", err);
      }
    };

    setupSocket();

    // Cleanup
    return () => {
      socketService.off("photographer_availability_updated");
      socketService.off("availability_updated");
      socketService.off("blocked_dates_updated");
    };
  }, [p_id, fetchAvailabilityData]);

  // Refetch availability whenever screen is focused (handles case where user might navigate back)
  useFocusEffect(
    useCallback(() => {
      console.log("Booking screen focused, refetching availability");
      fetchAvailabilityData();
    }, [fetchAvailabilityData]),
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await storage.getToken();
        if (token) {
          const res = await apiService.getMe(token);
          if (res.success && res.data) {
            setFullName(res.data.full_name || "");
            setEmail(res.data.email || "");
            setPhone(res.data.phone || "");
          }
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
      }
    };
    fetchProfile();
  }, []);

  const defaultPackages: PackageOption[] = [
    {
      id: "basic",
      name: "Basic",
      price: 15000,
      duration: "4 hours",
      features: ["50 edited photos", "Online gallery", "1 photographer"],
    },
    {
      id: "standard",
      name: "Standard",
      price: 25000,
      duration: "8 hours",
      features: [
        "100 edited photos",
        "Online gallery",
        "2 photographers",
        "Photo album",
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: 40000,
      duration: "Full day",
      features: [
        "200+ edited photos",
        "Online gallery",
        "3 photographers",
        "Photo album",
        "Video coverage",
      ],
    },
  ];

  const packages = useMemo(() => {
    let list: PackageOption[] = [];
    if (packagesParam) {
      try {
        const parsed = JSON.parse(packagesParam);
        if (Array.isArray(parsed)) {
          list = parsed.map((pkg: any) => ({
            id: String(pkg.package_id ?? pkg.id ?? pkg.packageId ?? pkg.name),
            name: pkg.name ?? "Package",
            price: Number(pkg.price ?? 0),
            duration: pkg.duration ?? pkg.hours ?? pkg.time ?? undefined,
            description: pkg.description ?? undefined,
            features: Array.isArray(pkg.features)
              ? pkg.features
              : typeof pkg.features === "string"
                ? pkg.features.split(",").map((f: string) => f.trim())
                : undefined,
          }));
        }
      } catch (err) {
        console.warn("Invalid packages param", err);
      }
    }

    if (!list.length) {
      list = defaultPackages;
    }

    if (pkg_id && !list.some((p) => p.id === pkg_id)) {
      list = [
        {
          id: pkg_id,
          name: pkg_name || "Package",
          price: pkg_price,
        },
        ...list,
      ];
    }

    return list;
  }, [packagesParam, pkg_id, pkg_name, pkg_price]);

  useEffect(() => {
    if (!selectedPackageId && packages.length) {
      setSelectedPackageId(packages[0].id);
    }
  }, [packages, selectedPackageId]);

  const eventTypes = [
    "Wedding",
    "Birthday Party",
    "Corporate Event",
    "Engagement",
    "Anniversary",
    "Baby Shower",
    "Graduation",
    "Product Photography",
    "Fashion Shoot",
    "Portfolio Shoot",
    "Real Estate",
    "Other",
  ];

  const todayStr = useMemo(() => formatYYYYMMDD(new Date()), []);
  const maxDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return formatYYYYMMDD(d);
  }, []);

  const selectedPackage =
    packages.find((p) => p.id === selectedPackageId) || packages[0];
  const sortedDates = useMemo(() => [...selectedDates].sort(), [selectedDates]);

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!selectedDates.length) {
        Alert.alert("Missing info", "Please select at least one date.");
        return false;
      }
    }

    if (step === 2 && !selectedPackageId) {
      Alert.alert("Missing info", "Please select a package.");
      return false;
    }

    if (step === 3) {
      if (!eventType || !location.trim()) {
        Alert.alert("Missing info", "Please fill in event type and location.");
        return false;
      }
      if (!selectedTime) {
        Alert.alert("Missing info", "Please select a preferred arrival time.");
        return false;
      }
      if (!fullName.trim() || !email.trim() || !phone.trim()) {
        Alert.alert("Missing info", "Please fill in contact information.");
        return false;
      }
      if (!isValidEmail(email)) {
        Alert.alert("Invalid email", "Please enter a valid email address.");
        return false;
      }
    }

    return true;
  };

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strMinutes = minutes < 10 ? "0" + minutes : minutes;
    const strHours = hours < 10 ? "0" + hours : hours;
    return strHours + ":" + strMinutes + " " + ampm;
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || timeDate;
    setShowTimePicker(Platform.OS === "ios");
    setTimeDate(currentDate);
    setSelectedTime(formatTime(currentDate));
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  const handleContinue = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
      return;
    }

    const startDate = sortedDates[0];
    const endDate =
      sortedDates.length > 1 ? sortedDates[sortedDates.length - 1] : undefined;
    const packageIdNumber = Number(selectedPackage?.id ?? pkg_id);

    if (!Number.isFinite(packageIdNumber) || packageIdNumber <= 0) {
      Alert.alert("Package error", "Please select a valid package.");
      return;
    }

    try {
      setLoading(true);
      const token = await storage.getToken();
      if (!token) {
        Alert.alert("Login required", "Please login to continue");
        return;
      }

      let finalNotes = additionalNotes;
      if (multiSelectMode && selectedDates.length > 0) {
        const dateList = sortedDates.map(formatDisplayDate).join(", ");
        finalNotes = `Specific Dates Requested: ${dateList}${additionalNotes ? `\n\nNotes: ${additionalNotes}` : ""}`;
      }

      const payload = {
        photographer_id: p_id,
        package_id: packageIdNumber,
        date: `${startDate} ${selectedTime}`,
        end_date: endDate ? `${endDate} ${selectedTime}` : undefined,
        event_type: eventType,
        amount: selectedPackage?.price || pkg_price,
        location,
        notes: finalNotes,
      };

      const res = await apiService.createBooking(payload, token);
      if (res.success) {
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const photographer = {
    name: p_name || "Photographer",
    avatar: p_avatar || "",
  };

  return (
    <View style={[styles.container, { backgroundColor: "#f0f9ff" }]}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 10 },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={styles.iconBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={gray900} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText type="lg" weight="bold" style={{ color: gray900 }}>
            Book Photographer
          </ThemedText>
          <ThemedText type="xs" weight="semibold" style={{ color: gray500 }}>
            {photographer.name}
          </ThemedText>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((step) => (
            <View key={step} style={styles.progressItem}>
              <View
                style={[
                  styles.progressCircle,
                  currentStep >= step ? styles.progressCircleActive : null,
                  currentStep > step ? styles.progressCircleDone : null,
                ]}
              >
                <Text style={styles.progressText}>
                  {currentStep > step ? "✓" : step}
                </Text>
              </View>
              {step < 4 ? (
                <View
                  style={[
                    styles.progressLine,
                    currentStep > step ? styles.progressLineActive : null,
                  ]}
                />
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.progressLabels}>
          <Text
            style={[
              styles.progressLabel,
              currentStep >= 1 ? styles.progressLabelActive : null,
            ]}
          >
            Date & Time
          </Text>
          <Text
            style={[
              styles.progressLabel,
              currentStep >= 2 ? styles.progressLabelActive : null,
            ]}
          >
            Package
          </Text>
          <Text
            style={[
              styles.progressLabel,
              currentStep >= 3 ? styles.progressLabelActive : null,
            ]}
          >
            Details
          </Text>
          <Text
            style={[
              styles.progressLabel,
              currentStep >= 4 ? styles.progressLabelActive : null,
            ]}
          >
            Review
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 ? (
          <View>
            <View style={styles.stepHeader}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="calendar-outline" size={28} color="#3b82f6" />
                <Text style={styles.stepTitle}>
                  {multiSelectMode ? "Select Dates" : "Select Booking Period"}
                </Text>
              </View>
              <Text style={styles.stepSubtitle}>
                {multiSelectMode
                  ? "Select each specific date you'd like to book this photographer for."
                  : "Select the start and end dates for your session. All dates in between will be included."}
              </Text>
            </View>

            <View style={styles.selectionToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  !multiSelectMode ? styles.toggleBtnActive : null,
                ]}
                onPress={() => {
                  setMultiSelectMode(false);
                  setSelectedDates([]);
                }}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    !multiSelectMode ? styles.toggleBtnTextActive : null,
                  ]}
                >
                  Range
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  multiSelectMode ? styles.toggleBtnActive : null,
                ]}
                onPress={() => {
                  setMultiSelectMode(true);
                  setSelectedDates([]);
                }}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    multiSelectMode ? styles.toggleBtnTextActive : null,
                  ]}
                >
                  Specific Dates
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <UniversalCalendar
                mode={multiSelectMode ? "multi" : "range"}
                selectedDates={selectedDates}
                onSelectDates={setSelectedDates}
                blockedDates={blockedDates}
                bookedDates={bookedDates}
                minDate={todayStr}
                maxDate={maxDateStr}
                allowSelectingBlockedDates={false}
              />
            </View>

            {selectedDates.length ? (
              <View style={styles.selectedBadge}>
                <Ionicons name="calendar" size={16} color="#1e40af" />
                <Text style={styles.selectedBadgeText}>
                  {multiSelectMode
                    ? `Selected ${selectedDates.length} Date${selectedDates.length > 1 ? "s" : ""}`
                    : selectedDates.length === 1
                      ? `Selected Date: ${formatDisplayDate(selectedDates[0])}`
                      : `Range: ${formatDisplayDate(sortedDates[0])} to ${formatDisplayDate(sortedDates[1])}`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {currentStep === 2 ? (
          <View>
            <View style={styles.stepHeader}>
              <Ionicons name="camera-outline" size={28} color="#3b82f6" />
              <Text style={styles.stepTitle}>Choose Package</Text>
              <Text style={styles.stepSubtitle}>
                Select the best package for your event
              </Text>
            </View>

            <View style={styles.packagesGrid}>
              {packages.map((pkg) => {
                const active = selectedPackageId === pkg.id;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    testID={`package-option-${pkg.id}`}
                    onPress={() => setSelectedPackageId(pkg.id)}
                    style={[
                      styles.packageCard,
                      active ? styles.packageCardActive : null,
                    ]}
                    activeOpacity={0.9}
                  >
                    <View style={styles.packageHeader}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      <View style={styles.packagePriceRow}>
                        <Text style={styles.packageCurrency}>NPR</Text>
                        <Text style={styles.packageAmount}>
                          {pkg.price.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    {pkg.duration ? (
                      <Text style={styles.packageDuration}>{pkg.duration}</Text>
                    ) : null}
                    {pkg.description ? (
                      <Text
                        style={[
                          styles.packageDuration,
                          { marginTop: 4, color: "#6b7280" },
                        ]}
                        numberOfLines={3}
                      >
                        {pkg.description}
                      </Text>
                    ) : null}
                    {pkg.features?.length ? (
                      <View style={styles.packageFeatures}>
                        {pkg.features.map((feature, idx) => (
                          <View
                            key={`${pkg.id}-${idx}`}
                            style={styles.packageFeatureRow}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color="#10b981"
                            />
                            <Text style={styles.packageFeatureText}>
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {active ? (
                      <View style={styles.packageBadge}>
                        <Text style={styles.packageBadgeText}>Selected</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {currentStep === 3 ? (
          <View>
            <View style={styles.stepHeader}>
              <Ionicons
                name="document-text-outline"
                size={28}
                color="#3b82f6"
              />
              <Text style={styles.stepTitle}>Event Details</Text>
              <Text style={styles.stepSubtitle}>Tell us about your event</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Event Type</Text>
              <TouchableOpacity
                testID="event-type-select"
                style={styles.selectField}
                onPress={() => setShowEventTypePicker(true)}
              >
                <Text
                  style={[
                    styles.selectText,
                    !eventType ? styles.placeholderText : null,
                  ]}
                >
                  {eventType || "Select Event Type"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Event Location</Text>
              <View style={styles.locationInputContainer}>
                <TextInput
                  testID="location-input"
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter location or use map"
                  placeholderTextColor="#9ca3af"
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      borderRightWidth: 0,
                    },
                  ]}
                />
                <TouchableOpacity
                  testID="location-select"
                  style={styles.mapButton}
                  onPress={() => setShowMapModal(true)}
                >
                  <Ionicons name="map" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <MapModal
                visible={showMapModal}
                onClose={() => setShowMapModal(false)}
                onSelectLocation={(address) => setLocation(address)}
                initialLocation={location}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Preferred Arrival Time</Text>
              <TouchableOpacity
                style={styles.timePickerTrigger}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.timeDisplay}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={selectedTime ? "#2563eb" : "#9ca3af"}
                  />
                  <Text
                    style={[
                      styles.timeText,
                      !selectedTime && styles.placeholderText,
                    ]}
                  >
                    {selectedTime || "Select arrival time"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {showTimePicker &&
                (Platform.OS === "ios" ? (
                  <Modal
                    transparent={true}
                    animationType="slide"
                    visible={showTimePicker}
                    onRequestClose={() => setShowTimePicker(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View
                        style={[
                          styles.modalContent,
                          { backgroundColor: background },
                        ]}
                      >
                        <View style={styles.modalHeader}>
                          <TouchableOpacity
                            onPress={() => setShowTimePicker(false)}
                          >
                            <Text
                              style={{ color: "#2563eb", fontWeight: "600" }}
                            >
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setShowTimePicker(false)}
                          >
                            <Text
                              style={{ color: "#2563eb", fontWeight: "600" }}
                            >
                              Done
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={timeDate}
                          mode="time"
                          is24Hour={false}
                          display="spinner"
                          onChange={onTimeChange}
                          textColor={gray900}
                        />
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={timeDate}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={onTimeChange}
                  />
                ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Contact Information</Text>
              <TextInput
                testID="booking-full-name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
              <View style={styles.fieldSpacer} />
              <TextInput
                testID="booking-email"
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <View style={styles.fieldSpacer} />
              <TextInput
                testID="booking-phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+977 98XXXXXXXX"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Additional Notes (Optional)</Text>
              <TextInput
                testID="booking-notes"
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                placeholder="Any specific requirements or preferences?"
                placeholderTextColor="#9ca3af"
                multiline
                style={[styles.input, styles.textarea]}
              />
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Booking Summary</Text>
              <View style={styles.summaryRow}>
                <Ionicons name="calendar" size={16} color="#bfdbfe" />
                <Text style={styles.summaryText}>
                  {!multiSelectMode && sortedDates.length === 2
                    ? `${formatDisplayDate(sortedDates[0])} to ${formatDisplayDate(sortedDates[1])}`
                    : sortedDates.map(formatDisplayDate).join(", ") ||
                      "Not selected"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="time" size={16} color="#bfdbfe" />
                <Text style={styles.summaryText}>
                  {selectedTime || "Not selected"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="camera" size={16} color="#bfdbfe" />
                <Text style={styles.summaryText}>
                  {selectedPackage?.name || "Package"} Package
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Ionicons name="cash" size={16} color="#bfdbfe" />
                <Text style={styles.summaryTotalText}>
                  NPR{" "}
                  {Number(selectedPackage?.price || pkg_price).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {currentStep === 4 ? (
          <View>
            <View style={styles.stepHeader}>
              <Ionicons name="card-outline" size={28} color="#3b82f6" />
              <Text style={styles.stepTitle}>Review & Request</Text>
              <Text style={styles.stepSubtitle}>
                Please review your booking details before sending request
              </Text>
            </View>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>Booking Summary</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Photographer</Text>
                <Text style={styles.reviewValue}>{photographer.name}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Event Date(s)</Text>
                <View style={{ flex: 1 }}>
                  {!multiSelectMode && sortedDates.length === 2 ? (
                    <>
                      <Text style={styles.reviewValue}>
                        Start: {formatDisplayDate(sortedDates[0])}
                      </Text>
                      <Text style={styles.reviewValue}>
                        End: {formatDisplayDate(sortedDates[1])}
                      </Text>
                    </>
                  ) : sortedDates.length > 1 ? (
                    sortedDates.map((d, idx) => (
                      <Text key={d} style={styles.reviewValue}>
                        Date {idx + 1}: {formatDisplayDate(d)}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.reviewValue}>
                      {sortedDates[0]
                        ? formatDisplayDate(sortedDates[0])
                        : "Not selected"}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Time</Text>
                <Text style={styles.reviewValue}>
                  {selectedTime || "Not selected"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Event Type</Text>
                <Text style={styles.reviewValue}>
                  {eventType || "Not selected"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Location</Text>
                <Text style={styles.reviewValue}>{location || "Not set"}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Contact</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewValue}>
                    {fullName || "Not set"}
                  </Text>
                  <Text style={styles.reviewValue}>{email || "Not set"}</Text>
                  <Text style={styles.reviewValue}>{phone || "Not set"}</Text>
                </View>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Package</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewValue}>
                    {selectedPackage?.name || "Package"} Package
                  </Text>
                  {selectedPackage?.duration ? (
                    <Text style={styles.reviewMuted}>
                      {selectedPackage.duration}
                    </Text>
                  ) : null}
                  {selectedPackage?.features?.length ? (
                    <View style={{ marginTop: 4 }}>
                      {selectedPackage.features.map((feature) => (
                        <Text key={feature} style={styles.reviewMuted}>
                          • {feature}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
              {additionalNotes ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Additional Notes</Text>
                  <Text style={styles.reviewValue}>{additionalNotes}</Text>
                </View>
              ) : null}

              <View style={styles.reviewTotalRow}>
                <Text style={styles.reviewTotalLabel}>Total Amount</Text>
                <Text style={styles.reviewTotalValue}>
                  NPR{" "}
                  {Number(selectedPackage?.price || pkg_price).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        {currentStep > 1 && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.8}
            disabled={loading}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID="booking-continue-button"
          onPress={handleContinue}
          activeOpacity={0.9}
          disabled={loading}
          style={[
            styles.continueBtn,
            loading ? styles.continueBtnDisabled : null,
          ]}
        >
          <Text style={styles.continueText}>
            {currentStep === 4
              ? loading
                ? "Processing..."
                : "Send Request"
              : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showEventTypePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEventTypePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: background }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select event type</Text>
              <TouchableOpacity
                onPress={() => setShowEventTypePicker(false)}
                style={styles.iconBtn}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={gray900} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {eventTypes.map((type) => {
                const active = eventType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      setEventType(type);
                      setShowEventTypePicker(false);
                    }}
                    style={[
                      styles.modalItem,
                      active ? styles.modalItemActive : null,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        active ? styles.modalItemTextActive : null,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Booking Requested!</Text>
            <Text style={styles.successText}>
              Your booking request has been sent to {photographer.name}. You
              will receive a confirmation once the photographer accepts your
              request.
            </Text>

            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionSecondary]}
                activeOpacity={0.85}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push("/Client/ClientBookings");
                }}
              >
                <Text style={styles.actionSecondaryText}>View Booking</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="success-done-button"
                style={[styles.actionBtn, styles.actionPrimary]}
                activeOpacity={0.85}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.dismissAll();
                  router.replace("/Client/ClientDashboard");
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
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  iconBtn: { padding: 6 },
  content: { padding: 16 },

  progressContainer: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  progressItem: { flexDirection: "row", alignItems: "center" },
  progressCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircleActive: { backgroundColor: "#3b82f6" },
  progressCircleDone: { backgroundColor: "#10b981" },
  progressText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  progressLine: { width: 36, height: 2, backgroundColor: "#e5e7eb" },
  progressLineActive: { backgroundColor: "#10b981" },
  progressLabels: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "700" },
  progressLabelActive: { color: "#3b82f6" },

  stepHeader: { alignItems: "center", marginBottom: 16 },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  selectionToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  toggleBtnTextActive: {
    color: "#1e40af",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendAvailable: {
    backgroundColor: "#3b82f6",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  legendBlocked: {
    backgroundColor: "#fee2e2",
    borderWidth: 2,
    borderColor: "#ef4444",
  },
  legendSelected: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  legendText: { fontSize: 11, color: "#6b7280", fontWeight: "600" },

  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#dbeafe",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  selectedBadgeText: {
    color: "#1e40af",
    fontWeight: "700",
    fontSize: 12,
    flex: 1,
  },
  timePickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  timeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  sectionSubtitle: { fontSize: 12, color: "#6b7280", marginBottom: 12 },

  pickerWrapper: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12, // Reduced from 16
    borderWidth: 1,
    borderColor: "#e0f2fe",
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  pickerColumn: {
    flex: 1,
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pickerSeparator: {
    fontSize: 20, // Reduced from 24
    fontWeight: "700",
    color: "#1e40af",
    marginHorizontal: 3, // Reduced from 5
    marginTop: 15, // Reduced from 20
  },
  timePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    gap: 8,
  },
  timePreviewText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e40af",
  },

  packagesGrid: { gap: 14 },
  packageCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  packageCardActive: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  packageHeader: { marginBottom: 8 },
  packageName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  packagePriceRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  packageCurrency: { fontSize: 12, color: "#6b7280" },
  packageAmount: { fontSize: 20, fontWeight: "900", color: "#3b82f6" },
  packageDuration: { fontSize: 12, color: "#6b7280", marginBottom: 10 },
  packageFeatures: { gap: 6 },
  packageFeatureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  packageFeatureText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  packageBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#3b82f6",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  packageBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 8,
  },
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    height: 40.5, // To match the TextInput height exactly
  },
  selectField: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { fontSize: 13, fontWeight: "700", color: "#111827" },
  placeholderText: { color: "#9ca3af" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#fff",
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  fieldSpacer: { height: 10 },

  summaryCard: {
    backgroundColor: "#1e3a8a",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },

  paymentMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  paymentMethodActive: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: "#6b7280",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3b82f6",
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  summaryText: { color: "#e0f2fe", fontSize: 12, fontWeight: "600", flex: 1 },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 8,
    marginTop: 4,
  },
  summaryTotalText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 14,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  reviewLabel: {
    width: 120,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
  },
  reviewValue: { fontSize: 12, color: "#111827", fontWeight: "600", flex: 1 },
  reviewMuted: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  reviewTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginTop: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
  },
  reviewTotalLabel: { fontSize: 13, fontWeight: "800", color: "#111827" },
  reviewTotalValue: { fontSize: 16, fontWeight: "900", color: "#2563eb" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: "row",
    gap: 12,
  },
  backBtn: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  backBtnText: {
    color: "#4b5563",
    fontSize: 15,
    fontWeight: "800",
  },
  continueBtn: {
    flex: 2,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  continueBtnDisabled: { backgroundColor: "#9ca3af" },
  continueText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalCard: { borderRadius: 16, padding: 12 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  modalItem: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  modalItemActive: { backgroundColor: "#2563eb" },
  modalItemText: { fontWeight: "700", color: "#111827" },
  modalItemTextActive: { color: "#fff" },

  successCard: { backgroundColor: "#fff", borderRadius: 18, padding: 16 },
  successIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  successTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  successText: {
    textAlign: "center",
    marginTop: 8,
    color: "#4b5563",
    fontWeight: "600",
    lineHeight: 18,
  },
  successActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionSecondary: { backgroundColor: "#f3f4f6" },
  actionPrimary: { backgroundColor: "#1e3a8a" },
  actionSecondaryText: { color: "#111827", fontWeight: "900" },
  actionPrimaryText: { color: "#fff", fontWeight: "900" },
});
