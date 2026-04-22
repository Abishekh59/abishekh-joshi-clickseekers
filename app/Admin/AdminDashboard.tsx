import { ThemedText } from "@/components/themed-text";
import { apiService } from "@/services/api";
import { socketService } from "@/services/socket";
import { storage } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
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
import BookingManagement from "./BookingManagement";
import ReportManagement from "./ReportManagement";
import UserManagement from "./UserManagement";

const { width } = Dimensions.get("window");

interface AdminStats {
  totalUsers: number;
  clients: number;
  photographers: number;
  blockedUsers: number;
  warningUsers: number;
  pendingKYC: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  platformEarnings: number;
  todayEarnings?: number;
  recentActivities: Array<{
    id: string;
    type: string;
    user: string;
    action: string;
    time: string;
  }>;
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screen, setScreen] = useState<{
    type: "dash" | "users" | "reports" | "bookings";
    targetTab?: any;
  }>({ type: "dash" });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchStats = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      const res = await apiService.getAdminStats(token);
      if (res.success && res.data) {
        setStats(res.data);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    } catch {
      Alert.alert("Error", "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const handleNewNotif = (data: any) => {
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          time: "Just now",
          ...data,
        },
        ...prev,
      ]);
      setUnreadCount((prev) => prev + 1);
      // Refresh stats when any important event occurs
      fetchStats();
    };

    socketService.on("new_booking", (data) =>
      handleNewNotif({
        type: "booking",
        action: "New Booking Created",
        user: data.clientName || "Client",
      }),
    );
    socketService.on("new_report", (data) =>
      handleNewNotif({
        type: "report",
        action: "New Report Received",
        user: data.reporterName || "User",
      }),
    );
    socketService.on("kyc_submitted", (data) =>
      handleNewNotif({
        type: "kyc",
        action: "KYC Documents Submitted",
        user: data.photographerName || "Photographer",
      }),
    );
    socketService.on("kyc_approved", (data) =>
      handleNewNotif({
        type: "kyc",
        action: "KYC Approved",
        user: data.photographerName || "Photographer",
      }),
    );
    socketService.on("kyc_rejected", (data) =>
      handleNewNotif({
        type: "kyc",
        action: "KYC Rejected",
        user: data.photographerName || "Photographer",
      }),
    );
    socketService.on("portfolio_updated", (data) =>
      handleNewNotif({
        type: "portfolio",
        action: "New Photos Uploaded",
        user: data.photographerName || "Photographer",
      }),
    );
    socketService.on("photographer_updated", (data) =>
      handleNewNotif({
        type: "photographer",
        action: "Photographer Profile Updated",
        user: data.photographerName || "Photographer",
      }),
    );
    socketService.on("availability_updated", (data) =>
      handleNewNotif({
        type: "availability",
        action: "Photographer Availability Updated",
        user: data.photographerName || "Photographer",
      }),
    );
    socketService.on("user_status_updated", (data) =>
      handleNewNotif({
        type: "user_action",
        action: `User ${data.status === "WARNING" ? "Warned" : data.status === "BLOCKED" ? "Blocked" : "Activated"}`,
        user: data.userName || "User",
        message: data.message,
      }),
    );
    socketService.on("booking_accepted", (data) =>
      handleNewNotif({
        type: "booking",
        action: "Booking Accepted",
        user: data.photographerName || "Photographer",
      }),
    );
    socketService.on("booking_rejected", (data) =>
      handleNewNotif({
        type: "booking",
        action: "Booking Rejected",
        user: data.photographerName || "Photographer",
      }),
    );
    socketService.on("booking_completed", (data) =>
      handleNewNotif({
        type: "booking",
        action: "Booking Completed",
        user: data.clientName || "Client",
      }),
    );
    socketService.on("booking_cancelled", (data) =>
      handleNewNotif({
        type: "booking",
        action: "Booking Cancelled",
        user: data.userName || "User",
      }),
    );
    socketService.on("report_resolved", (data) =>
      handleNewNotif({
        type: "report",
        action: "Report Resolved",
        user: data.reporterName || "Admin",
      }),
    );
    socketService.on("report_dismissed", (data) =>
      handleNewNotif({
        type: "report",
        action: "Report Dismissed",
        user: data.reporterName || "Admin",
      }),
    );
    socketService.on("user_created", (data) =>
      handleNewNotif({
        type: "user",
        action: "New User Registered",
        user: data.userName || "User",
      }),
    );
    socketService.on("profile_updated", (data) =>
      handleNewNotif({
        type: "user",
        action: "Profile Updated",
        user: data.userName || "User",
      }),
    );

    return () => {
      socketService.off("new_booking");
      socketService.off("new_report");
      socketService.off("kyc_submitted");
      socketService.off("kyc_approved");
      socketService.off("kyc_rejected");
      socketService.off("portfolio_updated");
      socketService.off("photographer_updated");
      socketService.off("availability_updated");
      socketService.off("user_status_updated");
      socketService.off("booking_accepted");
      socketService.off("booking_rejected");
      socketService.off("booking_completed");
      socketService.off("booking_cancelled");
      socketService.off("report_resolved");
      socketService.off("report_dismissed");
      socketService.off("user_created");
      socketService.off("profile_updated");
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const logout = () =>
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await storage.clearAuth();
          router.replace("/");
        },
      },
    ]);

  if (loading && !refreshing)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f172a",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );

  if (screen.type === "users")
    return (
      <UserManagement
        onBack={() => setScreen({ type: "dash" })}
        initialTab={screen.targetTab}
      />
    );
  if (screen.type === "reports")
    return <ReportManagement onBack={() => setScreen({ type: "dash" })} />;
  if (screen.type === "bookings")
    return <BookingManagement onBack={() => setScreen({ type: "dash" })} />;

  const pt = Platform.OS === "ios" ? insets.top : insets.top + 8;
  const flagged = (stats?.blockedUsers || 0) + (stats?.warningUsers || 0);

  const earnings = stats?.platformEarnings || 0;
  const todayEarnings = stats?.todayEarnings || 0;

  return (
    <View style={s.root}>
      {/* ── Dark Header Section ── */}
      <View style={[s.header, { paddingTop: pt }]}>
        <View style={s.topNav}>
          <View style={s.adminInfo}>
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=Admin&background=4f46e5&color=fff&bold=true`,
              }}
              style={s.avatar}
            />
            <ThemedText style={s.adminName}>Admin Panel</ThemedText>
            <Ionicons
              name="chevron-forward"
              size={12}
              color="#64748b"
              style={{ marginLeft: 4 }}
            />
          </View>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => {
              setShowNotifications(true);
              setUnreadCount(0);
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {unreadCount > 0 && (
              <View style={s.notificationBadge}>
                <ThemedText style={s.notificationBadgeText}>
                  {unreadCount}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.balanceRow}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <ThemedText style={s.currencySymbol}>Rs. </ThemedText>
            <ThemedText style={s.balanceText}>
              {earnings.toLocaleString()}
              <ThemedText style={s.balanceCents}>.00</ThemedText>
            </ThemedText>
          </View>

          <View style={s.trendContainer}>
            <View style={s.trendPill}>
              <Ionicons name="arrow-up-circle" size={14} color="#22c55e" />
              <ThemedText style={s.trendText}>
                Rs. {todayEarnings.toFixed(2)}
              </ThemedText>
            </View>
            <ThemedText style={s.trendLabel}>Today</ThemedText>
          </View>
        </View>

        <View style={s.headerActions}>
          <TouchableOpacity
            style={s.actionBtnMain}
            onPress={() => setScreen({ type: "users" })}
          >
            <ThemedText style={s.btnTextMain}>Users</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionBtnSecondary}
            onPress={() => setScreen({ type: "reports" })}
          >
            <ThemedText style={s.btnTextSecondary}>Reports</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#f87171" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── White Content Area ── */}
      <View style={s.contentContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={s.contentHeader}>
              <ThemedText style={s.contentTitle}>Platform Summary</ThemedText>
              <TouchableOpacity>
                <ThemedText style={s.viewAllLink}>View all</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={s.statsGrid}>
              {/* Users Stats */}
              <StatCard
                title="Total Users"
                value={stats?.totalUsers || 0}
                icon="people"
                color="#ecfdf5"
                iconColor="#10b981"
                subText={`${stats?.photographers || 0} Photogs • ${stats?.clients || 0} Clients`}
                onPress={() => setScreen({ type: "users", targetTab: "all" })}
              />
              {/* KYC Stats */}
              <StatCard
                title="KYC Pending"
                value={stats?.pendingKYC || 0}
                icon="shield-checkmark"
                color="#eff6ff"
                iconColor="#3b82f6"
                subText="Needs approval"
                onPress={() => setScreen({ type: "users", targetTab: "kyc" })}
              />
              {/* Flagged Stats */}
              <StatCard
                title="Flagged Users"
                value={flagged}
                icon="flag"
                color="#f8fafc"
                iconColor="#64748b"
                subText="Safety & Mods"
                onPress={() => setScreen({ type: "reports" })}
              />
              {/* Bookings Stats */}
              <StatCard
                title="Bookings"
                value={stats?.totalBookings || 0}
                icon="calendar"
                color="#fff7ed"
                iconColor="#f97316"
                subText="Total marketplace"
                onPress={() => setScreen({ type: "bookings" })}
              />
            </View>

            <View style={s.activitySection}>
              <ThemedText style={s.sectionSubtitle}>Recent Events</ThemedText>
              <View style={s.activityCard}>
                {stats?.recentActivities.slice(0, 5).map((act, idx) => (
                  <View
                    key={act.id}
                    style={[s.activityRow, idx === 0 && { borderTopWidth: 0 }]}
                  >
                    <View style={s.activityDot} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.activityAction}>
                        {act.action}
                      </ThemedText>
                      <ThemedText style={s.activityMeta}>
                        {act.user} • {act.time}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        setNotifications={setNotifications}
      />
    </View>
  );
}

function NotificationModal({
  visible,
  onClose,
  notifications,
  setNotifications,
}: {
  visible: boolean;
  onClose: () => void;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const insets = useSafeAreaInsets();

  const getIcon = (type: string) => {
    switch (type) {
      case "booking":
        return { name: "calendar-outline" as const, color: "#f97316" };
      case "report":
        return { name: "flag-outline" as const, color: "#ef4444" };
      case "kyc":
        return { name: "shield-checkmark-outline" as const, color: "#3b82f6" };
      case "portfolio":
        return { name: "image-outline" as const, color: "#10b981" };
      case "photographer":
        return { name: "camera-outline" as const, color: "#8b5cf6" };
      case "availability":
        return { name: "calendar-clear-outline" as const, color: "#f59e0b" };
      case "user_action":
        return { name: "alert-circle-outline" as const, color: "#ef4444" };
      case "user":
        return { name: "person-add-outline" as const, color: "#06b6d4" };
      default:
        return { name: "notifications-outline" as const, color: "#6366f1" };
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      // Note: Admin notifications might need a specific endpoint, using the general one if compatible
      await apiService.markNotificationAsRead(parseInt(id), token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const getRelativeTime = (timeStr: string) => {
    if (timeStr === "Just now") return "just now";
    return timeStr;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View
          style={[
            s.modalContent,
            { paddingTop: insets.top + 20, height: "90%" },
          ]}
        >
          <View style={s.modalHeader}>
            <ThemedText style={s.modalTitle}>Notifications</ThemedText>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalScroll}>
            {notifications.length === 0 ? (
              <View style={s.emptyNotif}>
                <Ionicons
                  name="notifications-off-outline"
                  size={48}
                  color="#cbd5e1"
                />
                <ThemedText style={s.emptyText}>
                  No new notifications
                </ThemedText>
              </View>
            ) : (
              notifications.map((notif) => {
                const icon = getIcon(notif.type);
                return (
                  <TouchableOpacity
                    key={notif.id}
                    style={[
                      s.notifItem,
                      { backgroundColor: notif.is_read ? "#fff" : "#f8fafc" },
                    ]}
                    onPress={() => !notif.is_read && markAsRead(notif.id)}
                  >
                    <View
                      style={[
                        s.notifIconBox,
                        { backgroundColor: icon.color + "15" },
                      ]}
                    >
                      <Ionicons name={icon.name} size={20} color={icon.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <ThemedText style={s.notifAction} weight="bold">
                        {notif.action}
                      </ThemedText>
                      <ThemedText style={s.notifUser}>
                        {notif.user} • {getRelativeTime(notif.time)}
                      </ThemedText>
                    </View>
                    {!notif.is_read && <View style={s.unreadDot} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  iconColor,
  subText,
  onPress,
}: any) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[s.statCard, { backgroundColor: color }]}
    >
      <View style={s.statHeader}>
        <View style={[s.statIconCircle, { backgroundColor: iconColor + "20" }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View>
          <ThemedText style={s.statTitle}>{title}</ThemedText>
          <ThemedText style={s.statSubText}>{subText}</ThemedText>
        </View>
      </View>

      <ThemedText style={s.statValue}>{value.toLocaleString()}</ThemedText>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f172a" },

  // Header
  header: { paddingHorizontal: 24, paddingBottom: 20 },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  adminInfo: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  adminName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#0f172a",
  },
  notificationBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },

  balanceRow: { alignItems: "center", marginBottom: 16, marginTop: 10 },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 38,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 46,
  },
  balanceCents: { color: "#475569", fontSize: 24 },

  trendContainer: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  trendText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#22c55e",
  },
  trendLabel: { fontSize: 12, fontWeight: "600", color: "#64748b" },

  headerActions: { flexDirection: "row", gap: 12 },
  actionBtnMain: {
    flex: 3,
    height: 52,
    backgroundColor: "#4f46e5",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnSecondary: {
    flex: 3,
    height: 52,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    flex: 1,
    height: 52,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnIcon: { marginRight: 8 },
  btnTextMain: { fontWeight: "700", color: "#fff", fontSize: 15 },
  btnTextSecondary: { fontWeight: "700", color: "#fff", fontSize: 15 },

  // Content
  contentContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: "hidden",
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    marginBottom: 20,
  },
  contentTitle: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  viewAllLink: { color: "#4f46e5", fontWeight: "600", fontSize: 14 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 24,
    gap: 12,
  },
  statCard: { width: (width - 60) / 2, padding: 16, borderRadius: 24 },
  statHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  statTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  statSubText: { fontSize: 10, color: "#94a3b8" },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  statFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statTrendPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statTrendText: {
    marginLeft: 3,
    fontSize: 10,
    fontWeight: "700",
    color: "#10b981",
  },

  activitySection: { paddingHorizontal: 24, marginTop: 32 },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  activityCard: { backgroundColor: "#f8fafc", borderRadius: 24, padding: 8 },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4f46e5",
    marginRight: 12,
  },
  activityAction: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  activityMeta: { fontSize: 12, color: "#94a3b8", marginTop: 2 },

  // Modal & Notifications
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "85%",
    paddingHorizontal: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: { paddingBottom: 40 },

  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  notifIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notifAction: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  notifUser: { fontSize: 13, color: "#64748b", marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
    marginLeft: 8,
  },

  emptyNotif: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 16,
    fontWeight: "600",
  },
});
