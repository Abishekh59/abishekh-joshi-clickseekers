import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import PhotographerNavbar from "../../components/PhotographerNavbar";
import { ThemedText } from "../../components/themed-text";
import { useAppTheme } from "../../hooks/use-app-theme";
import { apiService } from "../../services/api";
import { socketService } from "../../services/socket";
import { storage } from "../../utils/storage";
import TopPhotographersLeaderboard from "../TopPhotographersLeaderboard";
import AvailabilityManagement from "./AvailabilityManagement";
import BookingManagement from "./BookingManagement";
import PhotographerChat from "./PhotographerChat";
import PhotographerProfile from "./PhotographerProfile";
import PhotographerReviews from "./PhotographerReviews";
import PortfolioManagement from "./PortfolioManagement";
import PricingManagement from "./PricingManagement";

type PhotographerDashboard = {
  onNavigate?: (screen: string) => void;
};

export default function PhotographerDashboard({ onNavigate }: PhotographerDashboard) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "bookings" | "chat" | "portfolio" | "profile">("dashboard");
  const [activeScreen, setActiveScreen] = useState<"dashboard" | "pricing" | "portfolio" | "profile" | "bookings" | "reviews" | "chat" | "availability" | "leaderboard">("dashboard");
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    earnings: 0,
    upcomingBookingsCount: 0,
    rating: 0,
    totalReviews: 0,
    badge: "Loading..."
  });

  const {
    primary,
    background,
    gray900,
    gray700,
    gray600,
    gray500,
    gray400,
    white,
    success,
    warning
  } = useAppTheme();

  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      const response = await apiService.getDashboardStats(token);
      if (response.success && response.data) {
        setStats(response.data.stats);
        setUpcomingBookings(response.data.upcomingBookings || []);
        setRecentReviews(response.data.recentReviews || []);
        setUnreadCount(response.data.stats.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleNewBooking = (booking: any) => {
      fetchDashboardData(); // Refresh all stats
      Alert.alert('New Booking!', `${booking.client} has requested a ${booking.event}`);
    };

    const handleNewNotification = (notification: any) => {
      setUnreadCount((prev) => prev + 1);
      Alert.alert('New Notification', notification.message || 'You have a new notification');
    };

    const handleNewMessage = (msg: any) => {
      setUnreadCount((prev) => prev + 1);
      // Optional: Alert or small notification popup
    };

    socketService.on('new_booking', handleNewBooking);
    socketService.on('new_notification', handleNewNotification);
    socketService.on('new_message', handleNewMessage);

    return () => {
      socketService.off('new_booking', handleNewBooking);
      socketService.off('new_notification', handleNewNotification);
      socketService.off('new_message', handleNewMessage);
    };
  }, []);


  const handleLocalNavigate = (screen: string) => {
    if (screen === "photographer-pricing") {
      setActiveScreen("pricing");
      return;
    }
    if (screen === "photographer-portfolio") {
      setActiveScreen("portfolio");
      return;
    }
    if (screen === "photographer-profile") {
      setActiveScreen("profile");
      return;
    }
    if (screen === "photographer-availability") {
      setActiveScreen("availability");
      return;
    }
    if (screen === "photographer-leaderboard") {
      setActiveScreen("leaderboard");
      return;
    }
    if (screen.startsWith("photographer-")) {
      const tabId = screen.replace("photographer-", "") as typeof activeTab;
      setActiveTab(tabId);
      setActiveScreen("dashboard");
    }
    onNavigate?.(screen);
  };

  const handleTabPress = (tabId: typeof activeTab) => {
    setActiveTab(tabId);

    // Set the appropriate screen based on tab
    if (tabId === "portfolio") {
      setActiveScreen("portfolio");
    } else if (tabId === "profile") {
      setActiveScreen("profile");
    } else if (tabId === "bookings") {
      setActiveScreen("bookings");
    } else if (tabId === "chat") {
      setActiveScreen("chat");
    } else {
      setActiveScreen("dashboard");
    }

    const screenMap: Record<typeof activeTab, string> = {
      dashboard: "photographer-dashboard",
      bookings: "photographer-bookings",
      chat: "photographer-chat",
      portfolio: "photographer-portfolio",
      profile: "photographer-profile",
    };
    onNavigate?.(screenMap[tabId]);
  };

  if (loading) {
    return (
      <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={primary} />
        <ThemedText style={{ marginTop: 12, color: gray600 }}>Loading Dashboard...</ThemedText>
      </View>
    );
  }

  if (activeScreen === "pricing") {
    return <PricingManagement onBack={() => setActiveScreen("dashboard")} />;
  }

  if (activeScreen === "portfolio") {
    return <PortfolioManagement onBack={() => setActiveScreen("dashboard")} />;
  }

  if (activeScreen === "availability") {
    return <AvailabilityManagement onBack={() => setActiveScreen("dashboard")} />;
  }

  if (activeScreen === "leaderboard") {
    return <TopPhotographersLeaderboard onBack={() => setActiveScreen("dashboard")} onNavigate={onNavigate} userRole="photographer" />;
  }

  if (activeScreen === "bookings") {
    return (
      <View style={styles.safe}>
        <View style={styles.container}>
          <BookingManagement />
        </View>
        <PhotographerNavbar activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
    );
  }

  if (activeScreen === "profile") {
    return (
      <View style={styles.safe}>
        <View style={styles.container}>
          <PhotographerProfile onBack={() => { setActiveTab("dashboard"); setActiveScreen("dashboard"); }} />
        </View>
        <PhotographerNavbar activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
    );
  }

  if (activeScreen === "reviews") {
    return (
      <View style={styles.safe}>
        <View style={styles.container}>
          <PhotographerReviews onBack={() => setActiveScreen("dashboard")} />
        </View>
        <PhotographerNavbar activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
    );
  }

  if (activeScreen === "chat") {
    return (
      <View style={styles.safe}>
        <PhotographerChat onBack={() => { setActiveTab("dashboard"); setActiveScreen("dashboard"); }} />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: 80 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          scrollEnabled
          bounces={Platform.OS === "ios"}
          contentInsetAdjustmentBehavior={Platform.OS === "ios" ? "automatic" : undefined}
          overScrollMode={Platform.OS === "android" ? "always" : undefined}
        >
          <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 12 }]}>
            <View style={styles.headerRow}>
              <View>
                <ThemedText style={styles.welcome}>Welcome back,</ThemedText>
                <ThemedText type="2xl" weight="extrabold" style={styles.headerTitle}>Dashboard</ThemedText>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.notificationButton}
                onPress={() => onNavigate?.("photographer-notifications")}
              >
                <Ionicons name="notifications-outline" size={24} color={white} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <ThemedText style={styles.notificationBadgeText}>{unreadCount}</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.badgeCard}>
              <View style={styles.badgeIcon}>
                <Ionicons name="star" size={22} color={white} />
              </View>
              <View style={styles.badgeInfo}>
                <ThemedText style={styles.badgeLabel}>Current Badge</ThemedText>
                <ThemedText type="lg" weight="bold" style={styles.badgeTitle}>{stats.badge}</ThemedText>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.badgeButton}
                onPress={() => onNavigate?.("photographer-badges")}
              >
                <ThemedText weight="bold" style={styles.badgeButtonText}>View Progress</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <ThemedText type="sm" style={styles.statLabel}>Total Earnings</ThemedText>
                <ThemedText type="xl" weight="extrabold" style={styles.statValue}>NPR {stats.earnings.toLocaleString()}</ThemedText>
                <TouchableOpacity onPress={() => onNavigate?.("photographer-earnings")} activeOpacity={0.7}>
                  <ThemedText weight="bold" style={styles.statLink}>View details →</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.statCard}>
                <ThemedText type="sm" style={styles.statLabel}>Rating</ThemedText>
                <View style={styles.ratingRow}>
                  <ThemedText type="xl" weight="extrabold" style={styles.statValue}>{stats.rating}</ThemedText>
                  <Ionicons name="star" size={20} color="#fbbf24" />
                </View>
                <ThemedText type="xs" style={styles.reviewsText}>{stats.totalReviews} reviews</ThemedText>
              </View>
            </View>

            <View>
              <ThemedText type="lg" weight="extrabold" style={styles.sectionHeader}>Quick Actions</ThemedText>
              <View style={styles.quickActions}>
                <ActionCard label="View Leaderboard" icon="trophy" bg="#e0e7ff" color="#4f46e5" onPress={() => handleLocalNavigate("photographer-leaderboard")} />
                <ActionCard label="Manage Portfolio" icon="images" bg="#dbeafe" color="#2563eb" onPress={() => handleLocalNavigate("photographer-portfolio")} />
                <ActionCard label="Set Availability" icon="calendar" bg="#d1fae5" color="#059669" onPress={() => handleLocalNavigate("photographer-availability")} />
                <ActionCard label="Update Pricing" icon="cash-outline" bg="#f3e8ff" color="#9333ea" onPress={() => handleLocalNavigate("photographer-pricing")} />
              </View>
            </View>

            <View>
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="lg" weight="extrabold" style={styles.sectionHeader}>Upcoming Bookings ({stats.upcomingBookingsCount})</ThemedText>
                <TouchableOpacity onPress={() => handleLocalNavigate("photographer-bookings")} activeOpacity={0.7}>
                  <ThemedText weight="bold" style={styles.viewAll}>View all</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.listColumn}>
                {upcomingBookings.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <ThemedText style={styles.emptyText}>No upcoming bookings</ThemedText>
                  </View>
                ) : (
                  upcomingBookings.map((booking) => (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.bookingHeader}>
                        <View>
                          <ThemedText type="base" weight="extrabold" style={styles.bookingClient}>{booking.client}</ThemedText>
                          <ThemedText type="sm" weight="bold" style={styles.bookingEvent}>{booking.event}</ThemedText>
                        </View>
                        <View style={styles.confirmedChip}>
                          <ThemedText type="xs" weight="extrabold" style={styles.confirmedText}>{booking.status}</ThemedText>
                        </View>
                      </View>
                      <View style={styles.bookingDetails}>
                        <View style={styles.inlineInfo}>
                          <Ionicons name="calendar-outline" size={14} color={gray500} />
                          <ThemedText type="xs" weight="bold" style={styles.detailText}>{new Date(booking.date).toLocaleDateString()}</ThemedText>
                        </View>
                        <View style={styles.inlineInfo}>
                          <Ionicons name="time-outline" size={14} color={gray500} />
                          <ThemedText type="xs" weight="bold" style={styles.detailText}>{new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
                        </View>
                        <ThemedText type="sm" weight="extrabold" style={styles.bookingAmount}>NPR {booking.amount.toLocaleString()}</ThemedText>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View>
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="lg" weight="extrabold" style={styles.sectionHeader}>Recent Reviews</ThemedText>
                <TouchableOpacity onPress={() => setActiveScreen("reviews")} activeOpacity={0.7}>
                  <ThemedText weight="bold" style={styles.viewAll}>View all</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.listColumn}>
                {recentReviews.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <ThemedText style={styles.emptyText}>No reviews yet</ThemedText>
                  </View>
                ) : (
                  recentReviews.map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <ThemedText type="base" weight="extrabold" style={styles.reviewClient}>{review.client}</ThemedText>
                        <View style={styles.reviewStars}>
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Ionicons key={i} name="star" size={14} color="#fbbf24" />
                          ))}
                        </View>
                      </View>
                      <ThemedText type="sm" style={styles.reviewComment}>{review.comment || "No comment left"}</ThemedText>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
      <PhotographerNavbar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

function ActionCard({
  label,
  icon,
  bg,
  color,
  onPress,
}: {
  label: string;
  icon: string;
  bg: string;
  color: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.actionCard, { backgroundColor: bg }]} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <ThemedText weight="bold" style={styles.actionLabel}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f2f4f7" },
  container: { flex: 1, backgroundColor: "#f2f4f7" },
  scroll: { flex: 1 },
  content: { paddingBottom: 30 },
  header: { backgroundColor: '#1e3a8a', paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  welcome: { color: "#bfdbfe" },
  headerTitle: { color: "#fff", marginTop: 4 },
  notificationButton: { position: "relative", padding: 8 },
  notificationBadge: { position: "absolute", top: 4, right: 2, backgroundColor: "#f97316", width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  notificationBadgeText: { color: "#fff" },
  badgeCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 14 },
  badgeIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#f97316", alignItems: "center", justifyContent: "center" },
  badgeInfo: { flex: 1, marginLeft: 12 },
  badgeLabel: { color: "#e5e7eb" },
  badgeTitle: { color: "#fff", marginTop: 1 },
  badgeButton: { marginLeft: 8, height: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" },
  badgeButtonText: { color: "#fff" },
  body: { paddingHorizontal: 20, paddingTop: 18, gap: 20 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statLabel: { color: "#4b5563" },
  statValue: { color: "#0f172a", marginVertical: 6 },
  statLink: { color: '#2563eb' },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewsText: { color: '#6b7280' },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionHeader: { color: "#0f172a", marginBottom: 8 },
  viewAll: { color: '#2563eb' },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: { flexBasis: "48%", borderRadius: 12, padding: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  actionLabel: { color: "#111827" },
  listColumn: { gap: 12 },
  bookingCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  bookingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  bookingClient: { color: "#0f172a" },
  bookingEvent: { color: "#4b5563", marginTop: 2 },
  confirmedChip: { backgroundColor: "#d1fae5", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  confirmedText: { color: "#065f46" },
  bookingDetails: { flexDirection: "row", alignItems: "center", gap: 14 },
  inlineInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { color: '#6b7280' },
  bookingAmount: { marginLeft: "auto", color: '#2563eb' },
  reviewCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  reviewClient: { color: "#0f172a" },
  reviewStars: { flexDirection: "row", gap: 4 },
  reviewComment: { color: "#4b5563" },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#6b7280',
  },
});