import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { UniversalCalendar } from "../../components/UniversalCalendar";
import { useAppTheme } from "../../hooks/use-app-theme";
import { apiService } from "../../services/api";
import { storage } from "../../utils/storage";

interface AvailabilityManagementProps {
  onBack?: () => void;
}

export default function AvailabilityManagement({
  onBack,
}: AvailabilityManagementProps) {
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

  const [blockedDates, setBlockedDates] = useState<
    Array<{ id: number; date: string; reason: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"range" | "multi">(
    "multi",
  );
  const [blockReason, setBlockReason] = useState("");
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Fetch existing availability on mount
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const token = await storage.getToken();
        if (!token) return;

        const userData = await apiService.getMe(token);
        if (!userData.success || !userData.data) return;

        const photographerId = userData.data.user_id;
        const result =
          await apiService.getPhotographerAvailability(photographerId);

        if (result.success && result.data) {
          // Normalize dates to YYYY-MM-DD
          const cleanDates = result.data.map((item: any) => ({
            ...item,
            date: item.date.split("T")[0],
          }));
          setBlockedDates(cleanDates);
        }
      } catch (error: any) {
        console.error("Failed to fetch availability:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, []);

  const addBlockedDates = async () => {
    if (selectedDates.length > 0) {
      setSaving(true);
      try {
        const token = await storage.getToken();
        if (!token) {
          Alert.alert("Error", "Please login to save availability");
          return;
        }

        const newBlocks = selectedDates.map((date, index) => ({
          id: Math.max(...blockedDates.map((b) => b.id), 0) + index + 1,
          date: date,
          reason: blockReason.trim() || "Unavailable",
        }));

        const updatedBlocks = [...blockedDates, ...newBlocks];

        // Format for API
        const datesToSave = updatedBlocks.map((item) => ({
          date: item.date,
          reason: item.reason || "",
        }));

        // Handle range dates: if it's a range, we need to generate all dates in between
        const finalDatesToSave = [...datesToSave];
        if (selectionMode === "range" && selectedDates.length === 2) {
          const [start, end] = selectedDates.sort();
          const [startY, startM, startD] = start.split("-").map(Number);
          const [endY, endM, endD] = end.split("-").map(Number);

          let curr = new Date(startY, startM - 1, startD);
          const final = new Date(endY, endM - 1, endD);

          while (curr <= final) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, "0");
            const d = String(curr.getDate()).padStart(2, "0");
            const dStr = `${y}-${m}-${d}`;

            if (!blockedDates.some((b) => b.date === dStr)) {
              finalDatesToSave.push({
                date: dStr,
                reason: blockReason.trim() || "Unavailable",
              });
            }
            curr.setDate(curr.getDate() + 1);
          }
        }

        await apiService.savePhotographerAvailability(finalDatesToSave, token);

        // Refetch to ensure accuracy
        const userData = await apiService.getMe(token);
        if (userData.success && userData.data) {
          const result = await apiService.getPhotographerAvailability(
            userData.data.user_id,
          );
          if (result.success && result.data) {
            const cleanDates = result.data.map((item: any) => ({
              ...item,
              date: item.date.split("T")[0],
            }));
            setBlockedDates(cleanDates);
          }
        }

        setSelectedDates([]);
        setBlockReason("");
        setShowBlockModal(false);
      } catch (error: any) {
        Alert.alert("Error", error.messge || "Failed to save availability");
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: gray100 }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: primary,
            paddingTop: Platform.OS === "ios" ? 10 : insets.top + 16,
          },
        ]}
      >
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={white} />
            </TouchableOpacity>
          )}
          <ThemedText type="2xl" weight="bold" style={{ color: white }}>
            Availability
          </ThemedText>
        </View>
        <ThemedText type="sm" style={[styles.subtitle, { color: white }]}>
          Block dates when you're unavailable. You can block single or multiple
          dates for multi-day events.
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentSections}>
          {/* Calendar */}
          <View style={[styles.sectionCard, { backgroundColor: white }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="calendar-outline" size={20} color={primary} />
                <ThemedText
                  type="lg"
                  weight="semibold"
                  style={{ color: gray900 }}
                >
                  Manage Your Calendar
                </ThemedText>
              </View>
              {selectedDates.length > 0 && (
                <TouchableOpacity
                  testID="block-selected-toggle"
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: errorColor, paddingHorizontal: 16 },
                  ]}
                  onPress={() => setShowBlockModal(true)}
                >
                  <ThemedText type="sm" weight="bold" style={{ color: white }}>
                    Block {selectedDates.length} Date
                    {selectedDates.length !== 1 ? "s" : ""}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.selectionToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  selectionMode === "range" ? styles.toggleBtnActive : null,
                ]}
                onPress={() => {
                  setSelectionMode("range");
                  setSelectedDates([]);
                }}
              >
                <ThemedText
                  style={[
                    styles.toggleBtnText,
                    selectionMode === "range"
                      ? styles.toggleBtnTextActive
                      : null,
                  ]}
                >
                  Range
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  selectionMode === "multi" ? styles.toggleBtnActive : null,
                ]}
                onPress={() => {
                  setSelectionMode("multi");
                  setSelectedDates([]);
                }}
              >
                <ThemedText
                  style={[
                    styles.toggleBtnText,
                    selectionMode === "multi"
                      ? styles.toggleBtnTextActive
                      : null,
                  ]}
                >
                  Specific Dates
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.infoBox,
                { backgroundColor: info + "15", borderColor: info + "40" },
              ]}
            >
              <View style={styles.infoTitle}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={info}
                />
                <ThemedText type="sm" weight="semibold" style={{ color: info }}>
                  How to Use
                </ThemedText>
              </View>
              <ThemedText type="xs" style={[styles.infoText, { color: info }]}>
                •{" "}
                {selectionMode === "range"
                  ? "Tap start and end dates to select a continuous period."
                  : "Tap available dates to select them for blocking."}
                {"\n"}• Tap an already blocked date (red) to unblock it
                instantly.{"\n"}• Click the "Block Dates" button to save reasons
                for selected dates.
              </ThemedText>
            </View>

            <UniversalCalendar
              mode={selectionMode}
              selectedDates={selectedDates}
              onSelectDates={async (newDates) => {
                if (selectionMode === "range") {
                  setSelectedDates(newDates);
                  return;
                }

                // Multi-select mode logic
                // Detect which date was toggled
                const added = newDates.filter(
                  (d) => !selectedDates.includes(d),
                );
                const removed = newDates.filter((d) =>
                  selectedDates.includes(d),
                );
                const changedDate = added.length > 0 ? added[0] : removed[0];

                if (!changedDate) return;

                // If the date is already blocked, clicking it unblocks it instantly
                if (blockedDates.some((b) => b.date === changedDate)) {
                  try {
                    const token = await storage.getToken();
                    if (token) {
                      await apiService.deletePhotographerAvailability(
                        [changedDate],
                        token,
                      );
                      setBlockedDates((prev) =>
                        prev.filter((b) => b.date !== changedDate),
                      );
                    }
                  } catch (error) {
                    Alert.alert("Error", "Failed to unblock date");
                  }
                  // Remove it from selected dates if it was added there
                  setSelectedDates(newDates.filter((d) => d !== changedDate));
                } else {
                  // Otherwise, update the selection for blocking
                  setSelectedDates(newDates);
                }
              }}
              blockedDates={blockedDates
                .filter((b) => !b.reason?.startsWith("Booked:"))
                .map((b) => b.date)}
              bookedDates={blockedDates
                .filter((b) => b.reason?.startsWith("Booked:"))
                .map((b) => b.date)}
              minDate={new Date().toISOString().split("T")[0]}
              allowSelectingBlockedDates={true}
            />
          </View>

          {/* Blocked Dates List */}
          {blockedDates.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: white }]}>
              <ThemedText
                type="lg"
                weight="semibold"
                style={[styles.sectionTitle, { color: gray900 }]}
              >
                Blocked Dates ({blockedDates.length})
              </ThemedText>

              <View style={styles.blockedDatesList}>
                {blockedDates
                  .sort(
                    (a, b) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime(),
                  )
                  .map((blocked) => (
                    <View
                      key={blocked.id}
                      style={[
                        styles.blockedDateItem,
                        {
                          backgroundColor: errorColor + "10",
                          borderColor: errorColor + "40",
                        },
                      ]}
                    >
                      <View style={styles.blockedDateInfo}>
                        <ThemedText
                          type="sm"
                          weight="semibold"
                          style={[styles.blockedDateDate, { color: gray900 }]}
                        >
                          {new Date(blocked.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </ThemedText>
                        <ThemedText
                          type="xs"
                          style={[styles.blockedDateReason, { color: gray600 }]}
                        >
                          {blocked.reason}
                        </ThemedText>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.removeDateBtn,
                          {
                            backgroundColor: white,
                            borderColor: errorColor + "40",
                          },
                        ]}
                        onPress={async () => {
                          try {
                            const token = await storage.getToken();
                            if (token) {
                              await apiService.deletePhotographerAvailability(
                                [blocked.date],
                                token,
                              );
                              setBlockedDates((prev) =>
                                prev.filter((b) => b.id !== blocked.id),
                              );
                            }
                          } catch (error) {
                            Alert.alert("Error", "Failed to unblock date");
                          }
                        }}
                      >
                        <Ionicons name="close" size={18} color={errorColor} />
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Save Changes button removed for instant persistence */}
        </View>
      </ScrollView>

      {/* Block Dates Modal */}
      <Modal
        visible={showBlockModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBlockModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowBlockModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: white }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="xl" weight="bold" style={{ color: gray900 }}>
                {selectedDates.length === 1
                  ? "Block Date"
                  : "Block Multiple Dates"}
              </ThemedText>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: gray100 }]}
                onPress={() => setShowBlockModal(false)}
              >
                <Ionicons name="close" size={20} color={gray600} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText
                type="sm"
                weight="medium"
                style={[styles.inputLabel, { color: gray700 }]}
              >
                Selected Dates ({selectedDates.length})
              </ThemedText>
              <ScrollView
                style={[styles.selectedDatesList, { backgroundColor: gray100 }]}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {selectedDates.sort().map((date, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.selectedDateChip,
                      { backgroundColor: warning + "30", borderColor: warning },
                    ]}
                  >
                    <ThemedText
                      type="xs"
                      weight="medium"
                      style={{ color: "#92400e" }}
                    >
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText
                type="sm"
                weight="medium"
                style={[styles.inputLabel, { color: gray700 }]}
              >
                Reason (Optional)
              </ThemedText>
              <TextInput
                testID="block-reason-input"
                value={blockReason}
                onChangeText={setBlockReason}
                placeholder="e.g., Sharma family wedding - 3 days&#10;Events: Mehendi, Wedding, Reception&#10;Location: Kathmandu&#10;Already confirmed"
                placeholderTextColor={gray400}
                multiline
                style={[
                  styles.textInput,
                  {
                    color: gray900,
                    borderColor: gray200,
                    backgroundColor: white,
                  },
                ]}
              />
              <ThemedText
                type="xs"
                style={[styles.helpText, { color: gray500 }]}
              >
                Add details about the event so you can track why these dates are
                blocked
              </ThemedText>
            </View>

            <TouchableOpacity
              testID="block-submit-button"
              style={[styles.primaryBtn, { backgroundColor: errorColor }]}
              onPress={addBlockedDates}
            >
              <Ionicons name="close-circle" size={18} color={white} />
              <ThemedText type="base" weight="bold" style={{ color: white }}>
                Block {selectedDates.length} Date
                {selectedDates.length !== 1 ? "s" : ""}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    lineHeight: 20,
    opacity: 0.9,
  },
  scrollContent: {
    flex: 1,
  },
  contentSections: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  multiSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    lineHeight: 18,
  },
  multiSelectBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  multiSelectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  multiSelectTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  multiSelectCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  multiSelectText: {
    marginBottom: 12,
  },
  multiSelectActions: {
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  blockedDatesList: {
    gap: 12,
  },
  blockedDateItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  blockedDateInfo: {
    flex: 1,
  },
  blockedDateDate: {
    marginBottom: 4,
  },
  blockedDateReason: {
    lineHeight: 18,
  },
  removeDateBtn: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 8,
  },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 120,
    textAlignVertical: "top",
    lineHeight: 20,
  },
  selectedDatesList: {
    maxHeight: 80,
    borderRadius: 8,
    padding: 8,
  },
  selectedDateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  helpText: {
    marginTop: 6,
    lineHeight: 16,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
});
