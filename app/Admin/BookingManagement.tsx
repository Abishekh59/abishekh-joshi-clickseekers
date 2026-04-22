import { ThemedText } from "@/components/themed-text";
import { BADGE_IMAGES, BADGE_TIERS } from "@/constants/badges";
import { API_HOST, apiService } from "@/services/api";
import { storage } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BookingStatus = "ALL" | "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED";

const STATUS_CFG: Record<string, any> = {
  PENDING: { label: "Pending", color: "#f59e0b", bg: "#fefce8" },
  ACCEPTED: { label: "Accepted", color: "#10b981", bg: "#ecfdf5" },
  COMPLETED: { label: "Completed", color: "#6366f1", bg: "#eef2ff" },
  CANCELLED: { label: "Cancelled", color: "#ef4444", bg: "#fef2f2" },
  REJECTED: { label: "Rejected", color: "#ef4444", bg: "#fef2f2" },
};

export default function BookingManagement({ onBack }: { onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<BookingStatus>("ALL");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const fetchBookings = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      const res = await apiService.getAdminBookings(token, {
        status: activeTab === "ALL" ? undefined : activeTab,
      });
      if (res.success) {
        setBookings(res.data);
      }
    } catch {
      Alert.alert("Error", "Failed to load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const avatarUri = (name: string, path?: string) => {
    if (path) return `${API_HOST}${path.startsWith("/") ? "" : "/"}${path}`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const pt = Platform.OS === "ios" ? 0 : insets.top;

  return (
    <View style={[s.root, { paddingTop: pt }]}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color="#f1f5f9" />
          </TouchableOpacity>
          <ThemedText style={s.headerTitle}>Bookings</ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabsScroll}
        >
          {(
            [
              "ALL",
              "PENDING",
              "ACCEPTED",
              "COMPLETED",
              "CANCELLED",
            ] as BookingStatus[]
          ).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                setLoading(true);
              }}
              style={[s.tab, activeTab === tab && s.tabActive]}
            >
              <ThemedText
                style={[s.tabText, activeTab === tab && s.tabTextActive]}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#6366f1" />
            <ThemedText style={{ color: "#64748b" }}>
              Fetching bookings...
            </ThemedText>
          </View>
        ) : bookings.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <ThemedText style={{ color: "#64748b", fontWeight: "600" }}>
              No bookings found
            </ThemedText>
          </View>
        ) : (
          bookings.map((booking) => (
            <BookingCard
              key={booking.booking_id}
              booking={booking}
              onPress={() => setSelectedBooking(booking)}
              avatarUri={avatarUri}
              formatDate={formatDate}
            />
          ))
        )}
      </ScrollView>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={selectedBooking}
        visible={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        avatarUri={avatarUri}
        formatDate={formatDate}
      />
    </View>
  );
}

function BookingCard({ booking, onPress, avatarUri, formatDate }: any) {
  const status = STATUS_CFG[booking.status?.status_name] || {
    label: booking.status?.status_name,
    color: "#64748b",
    bg: "#f1f5f9",
  };

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.cardHeader}>
        <View style={s.userGroup}>
          <Image
            source={{
              uri: avatarUri(
                booking.client?.full_name,
                booking.client?.profile_image,
              ),
            }}
            style={s.miniAvatar}
          />
          <Ionicons
            name="arrow-forward"
            size={12}
            color="#94a3b8"
            style={{ marginHorizontal: 4 }}
          />
          <Image
            source={{
              uri: avatarUri(
                booking.photographer?.full_name,
                booking.photographer?.profile_image,
              ),
            }}
            style={s.miniAvatar}
          />
        </View>
        <View
          style={[
            s.statusBadge,
            { backgroundColor: status.bg, borderColor: status.color + "20" },
          ]}
        >
          <ThemedText style={[s.statusText, { color: status.color }]}>
            {status.label}
          </ThemedText>
        </View>
      </View>

      <View style={s.cardBody}>
        <ThemedText style={s.bookingTitle}>
          {booking.client?.full_name} booked {booking.photographer?.full_name}
        </ThemedText>
        <View style={s.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <ThemedText style={s.infoText}>
            {formatDate(booking.event_date)}
          </ThemedText>
          <Ionicons
            name="location-outline"
            size={14}
            color="#64748b"
            style={{ marginLeft: 12 }}
          />
          <ThemedText style={s.infoText} numberOfLines={1}>
            {booking.location}
          </ThemedText>
        </View>
      </View>

      <View style={s.cardFooter}>
        <ThemedText style={s.priceText}>
          Rs. {Number(booking.amount).toLocaleString()}
        </ThemedText>
        <ThemedText style={s.viewDetailsLink}>View Details</ThemedText>
      </View>
    </TouchableOpacity>
  );
}

function BookingDetailModal({
  booking,
  visible,
  onClose,
  avatarUri,
  formatDate,
}: any) {
  if (!booking) return null;
  const insets = useSafeAreaInsets();
  const status = STATUS_CFG[booking.status?.status_name] || {
    label: booking.status?.status_name,
    color: "#64748b",
    bg: "#f1f5f9",
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { paddingBottom: insets.bottom + 20 }]}>
          <View style={s.modalHeader}>
            <View style={s.modalHandle} />
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.modalStatusRow}>
              <View
                style={[s.statusBadgeLarge, { backgroundColor: status.bg }]}
              >
                <ThemedText
                  style={[s.statusTextLarge, { color: status.color }]}
                >
                  {status.label}
                </ThemedText>
              </View>
              <ThemedText style={s.modalDate}>
                ID: #{booking.booking_id}
              </ThemedText>
            </View>

            <View style={s.userComparison}>
              <View style={s.userBlock}>
                <Image
                  source={{
                    uri: avatarUri(
                      booking.client?.full_name,
                      booking.client?.profile_image,
                    ),
                  }}
                  style={s.largeAvatar}
                />
                <ThemedText style={s.userNameLabel}>Client</ThemedText>
                <ThemedText style={s.userNameVal}>
                  {booking.client?.full_name}
                </ThemedText>
              </View>
              <Ionicons name="flash" size={24} color="#e2e8f0" />
              <View style={s.userBlock}>
                <Image
                  source={{
                    uri: avatarUri(
                      booking.photographer?.full_name,
                      booking.photographer?.profile_image,
                    ),
                  }}
                  style={s.largeAvatar}
                />
                <ThemedText style={s.userNameLabel}>Photographer</ThemedText>
                <ThemedText style={s.userNameVal}>
                  {booking.photographer?.full_name}
                </ThemedText>
              </View>
            </View>

            <View style={s.detailGrid}>
              <DetailItem
                icon="camera"
                label="Event Type"
                value={booking.event_type || "Photography"}
              />
              <DetailItem
                icon="calendar"
                label="Date"
                value={formatDate(booking.event_date)}
              />
              <DetailItem
                icon="location"
                label="Location"
                value={booking.location}
              />
              <DetailItem
                icon="gift"
                label="Package"
                value={booking.package?.package_name || "Custom"}
              />
              <DetailItem
                icon="wallet"
                label="Total Amount"
                value={`Rs. ${Number(booking.amount).toLocaleString()}`}
              />
              <DetailItem
                icon="card"
                label="Payment Status"
                value={booking.payment?.status?.status_name || "UNPAID"}
              />
            </View>

            {booking.notes && (
              <View style={s.notesBox}>
                <ThemedText style={s.notesLabel}>Notes from Client</ThemedText>
                <ThemedText style={s.notesText}>{booking.notes}</ThemedText>
              </View>
            )}

            <RevenueBreakdown booking={booking} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function RevenueBreakdown({ booking }: { booking: any }) {
  const amount = Number(booking.amount) || 0;
  const photographer = booking.photographer;
  const rewards = photographer?.rewards;

  // Use badge from backend if available, otherwise fallback to Beginner
  const badgeName = rewards?.badge?.badge_name || "Beginner";
  const commissionPct =
    rewards?.badge?.commission_percentage != null
      ? Number(rewards?.badge?.commission_percentage)
      : (BADGE_TIERS.find((t) => t.name === badgeName)?.commission ?? 10);

  const platformFee = (amount * commissionPct) / 100;
  const photographerEarnings = amount - platformFee;
  const badgeImg = BADGE_IMAGES[badgeName];

  return (
    <View style={s.revenueBox}>
      <View style={s.revenueHeader}>
        <Ionicons name="cash-outline" size={18} color="#0369a1" />
        <ThemedText style={s.revenueTitle}>Revenue Breakdown</ThemedText>
      </View>

      <View style={s.revenueCard}>
        <View style={s.revenueRow}>
          <View style={s.badgeInfo}>
            <View style={s.badgeIconWrap}>
              {badgeImg ? (
                <Image
                  source={badgeImg}
                  style={s.badgeIcon}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons name="medal-outline" size={20} color="#7c3aed" />
              )}
            </View>
            <View>
              <ThemedText style={s.revenueLabelSmall}>Badge Level</ThemedText>
              <ThemedText style={s.revenueValBold}>{badgeName}</ThemedText>
            </View>
          </View>
          <View style={s.feePill}>
            <ThemedText style={s.feePillText}>{commissionPct}% Fee</ThemedText>
          </View>
        </View>

        <View style={s.revenueDivider} />

        <View style={s.revenueItem}>
          <ThemedText style={s.revenueLabel}>Booking Amount</ThemedText>
          <ThemedText style={s.revenueVal}>
            Rs. {amount.toLocaleString()}
          </ThemedText>
        </View>

        <View style={[s.revenueItem, s.feeItem]}>
          <ThemedText style={[s.revenueLabel, { color: "#b91c1c" }]}>
            Platform Fee ({commissionPct}%)
          </ThemedText>
          <ThemedText style={[s.revenueVal, { color: "#b91c1c" }]}>
            - Rs. {platformFee.toLocaleString()}
          </ThemedText>
        </View>

        <View style={[s.revenueItem, s.earningsItem]}>
          <ThemedText style={[s.revenueLabel, { color: "#15803d" }]}>
            Photographer Earnings ({100 - commissionPct}%)
          </ThemedText>
          <ThemedText style={[s.revenueVal, { color: "#15803d" }]}>
            Rs. {photographerEarnings.toLocaleString()}
          </ThemedText>
        </View>

        <View style={s.totalEarningsBox}>
          <ThemedText style={s.totalEarningsLabel}>
            ClickSeekers Earned
          </ThemedText>
          <ThemedText style={s.totalEarningsVal}>
            Rs. {platformFee.toLocaleString()}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function DetailItem({ icon, label, value }: any) {
  return (
    <View style={s.detailItem}>
      <View style={s.detailIconWrap}>
        <Ionicons name={icon} size={16} color="#4f46e5" />
      </View>
      <View>
        <ThemedText style={s.detailLabel}>{label}</ThemedText>
        <ThemedText style={s.detailValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },

  tabsScroll: { flexDirection: "row" },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  tabActive: { backgroundColor: "#4f46e5", borderColor: "#6366f1" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#94a3b8" },
  tabTextActive: { color: "#fff" },

  content: { padding: 16, paddingBottom: 40 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userGroup: { flexDirection: "row", alignItems: "center" },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },

  cardBody: { marginBottom: 16 },
  bookingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoText: { fontSize: 13, color: "#64748b", marginLeft: 4, flexShrink: 1 },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  priceText: { fontSize: 16, fontWeight: "800", color: "#4f46e5" },
  viewDetailsLink: { fontSize: 13, fontWeight: "700", color: "#6366f1" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: "90%",
  },
  modalHeader: { alignItems: "center", marginBottom: 20 },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    marginBottom: 8,
  },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },

  modalStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  modalDate: { fontSize: 13, fontWeight: "600", color: "#94a3b8" },

  userComparison: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
  },
  userBlock: { alignItems: "center" },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userNameLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  userNameVal: { fontSize: 15, fontWeight: "700", color: "#0f172a" },

  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  detailItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f0f7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
  },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#0f172a" },

  notesBox: {
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#cbd5e1",
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    fontStyle: "italic",
  },

  // Revenue Breakdown Styles
  revenueBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f0f9ff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  revenueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  revenueTitle: { fontSize: 16, fontWeight: "800", color: "#0369a1" },
  revenueCard: { gap: 12 },
  revenueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
  },
  badgeInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  badgeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIcon: { width: 24, height: 24 },
  revenueLabelSmall: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  revenueValBold: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  feePill: {
    backgroundColor: "#fff7ed",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  feePillText: { fontSize: 12, fontWeight: "800", color: "#9a3412" },
  revenueDivider: { height: 1, backgroundColor: "#e0f2fe", marginVertical: 4 },
  revenueItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  revenueLabel: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  revenueVal: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  feeItem: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: -4,
  },
  earningsItem: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: -4,
  },
  totalEarningsBox: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 16,
  },
  totalEarningsLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },
  totalEarningsVal: { fontSize: 18, fontWeight: "800", color: "#fff" },
});
