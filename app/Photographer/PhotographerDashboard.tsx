import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
// notifications will be dynamically required below to avoid Expo Go SDK warnings
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import PhotographerNavbar from "../../components/PhotographerNavbar";
import { ThemedText } from "../../components/themed-text";
import { useAppTheme } from "../../hooks/use-app-theme";
import { apiService } from "../../services/api";
import { socketService } from "../../services/socket";
import { storage } from "../../utils/storage";
import TopPhotographersLeaderboard from "../TopPhotographersLeaderboard";

// Configure notifications logic will be handled inside useEffect to avoid Expo Go warnings
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === "expo";

import { BADGE_IMAGES, getBadgeForPoints } from "../../constants/badges";
import AvailabilityManagement from "./AvailabilityManagement";
import BadgeRewards from "./BadgeRewards";
import BookingManagement from "./BookingManagement";
import PhotographerChat from "./PhotographerChat";
import PhotographerProfile from "./PhotographerProfile";
import PhotographerReviews from "./PhotographerReviews";
import PortfolioManagement from "./PortfolioManagement";
import PricingManagement from "./PricingManagement";

type PhotographerDashboard = {
  onNavigate?: (screen: string) => void;
};

export default function PhotographerDashboard({
  onNavigate,
}: PhotographerDashboard) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "bookings" | "chat" | "portfolio" | "profile"
  >("dashboard");
  const [activeScreen, setActiveScreen] = useState<
    | "dashboard"
    | "pricing"
    | "portfolio"
    | "profile"
    | "bookings"
    | "reviews"
    | "chat"
    | "availability"
    | "leaderboard"
    | "notifications"
    | "badges"
  >("dashboard");
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    earnings: 0,
    thisMonthEarnings: 0,
    upcomingBookingsCount: 0,
    rating: 0,
    totalReviews: 0,
    badge: "Loading...",
  });
  const [userName, setUserName] = useState<string>("");
  const [userPoints, setUserPoints] = useState<number>(0);
  const [showEarnings, setShowEarnings] = useState(true);

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
    warning,
  } = useAppTheme();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [focusedChatPartnerId, setFocusedChatPartnerId] = useState<
    string | null
  >(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const token = await storage.getToken();
      const user = await storage.getUser();
      if (!token || user?.role !== "PHOTOGRAPHER") {
        if (!token) console.warn("[PhotographerDashboard] No token found");
        setLoading(false);
        return;
      }

      const [response, notifRes, userRes] = await Promise.all([
        apiService.getDashboardStats(token),
        apiService.getNotifications(token),
        apiService.getMe(token),
      ]);

      if (userRes.success) {
        if (userRes.data?.full_name) {
          setUserName(userRes.data.full_name);
        }
        if (userRes.data?.points !== undefined) {
          setUserPoints(userRes.data.points);
        }
      } else if (user?.full_name) {
        setUserName(user.full_name);
      }

      if (response.success && response.data) {
        setStats(response.data.stats);
        setUpcomingBookings(response.data.upcomingBookings || []);
        setRecentReviews(response.data.recentReviews || []);
      }

      if (notifRes.success) {
        const notifs = notifRes.data || [];
        setNotifications(notifs);
        const unread = notifs.filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const setupNotifications = async () => {
      const isExpoGo =
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
        Constants.appOwnership === "expo";
      if (isExpoGo) {
        console.log("Push notifications are not supported in Expo Go.");
        return;
      }

      // Set notification handler only for non-Expo Go environments
      const Notifications = require("expo-notifications");
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.warn("Failed to get push token for push notification!");
        return;
      }

      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
    };

    const initSocket = async () => {
      const token = await storage.getToken();
      const user = await storage.getUser();
      if (token && user) {
        socketService.connect(token);
        socketService.emit("join_room", user.user_id);
      }
    };

    setupNotifications();
    initSocket();
    fetchDashboardData();

    const handleNewBooking = (booking: any) => {
      fetchDashboardData(); // Refresh all stats
    };

    const handleNewNotification = (notification: any) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleNewMessage = (msg: any) => {
      fetchDashboardData();

      // Show local notification if not in chat with this specific user
      const senderId = String(msg.sender_id || msg.senderId).toLowerCase();
      const isChatActive = activeScreen === "chat";
      const isTargetUserFocused =
        focusedChatPartnerId?.toLowerCase() === senderId;

      if (!isChatActive || !isTargetUserFocused) {
        if (!isExpoGo) {
          const Notifications = require("expo-notifications");
          Notifications.scheduleNotificationAsync({
            content: {
              title: `New message from ${msg.sender_name || "Client"}`,
              body: msg.message || "Are you available?",
              data: { senderId },
            },
            trigger: null,
          });
        }
      }
    };

    const handleAccountStatusUpdated = async (data: any) => {
      const status = data?.status || data?.new_status;
      if (status === "BLOCKED") {
        Alert.alert(
          "Account Blocked",
          data?.message ||
            "Your account has been blocked due to a policy violation. You will be logged out.",
          [
            {
              text: "OK",
              onPress: async () => {
                await storage.clearAuth();
                socketService.disconnect();
                router.replace("/login");
              },
            },
          ],
          { cancelable: false },
        );
      } else if (status === "WARNING") {
        Alert.alert(
          "Account Warning",
          data?.message ||
            "Your account has received a warning due to a reported violation. Please review community guidelines.",
        );
      }
    };

    const handleAdminActionNotification = async (data: any) => {
      const action = data?.action || data?.status;
      if (action === "BLOCKED") {
        Alert.alert(
          "Account Blocked",
          data?.message ||
            "Your account has been blocked by the admin. You will be logged out.",
          [
            {
              text: "OK",
              onPress: async () => {
                await storage.clearAuth();
                socketService.disconnect();
                router.replace("/login");
              },
            },
          ],
          { cancelable: false },
        );
      } else if (action === "WARNING") {
        Alert.alert(
          "⚠️ Admin Warning",
          data?.message ||
            "Your account has received a warning from admin. Please review community guidelines.",
        );
      }
    };

    socketService.on("new_booking", handleNewBooking);
    socketService.on("new_notification", handleNewNotification);
    socketService.on("new_message", handleNewMessage);
    socketService.on("account_status_updated", handleAccountStatusUpdated);
    socketService.on(
      "admin_action_notification",
      handleAdminActionNotification,
    );

    return () => {
      socketService.off("new_booking", handleNewBooking);
      socketService.off("new_notification", handleNewNotification);
      socketService.off("new_message", handleNewMessage);
      socketService.off("account_status_updated", handleAccountStatusUpdated);
      socketService.off(
        "admin_action_notification",
        handleAdminActionNotification,
      );
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
    if (screen === "photographer-notifications") {
      setShowNotifications(true);
      return;
    }
    if (screen === "photographer-badges") {
      setActiveScreen("badges");
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
      <View
        testID="photographer-dashboard-loading"
        style={[
          styles.safe,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={primary} />
        <ThemedText style={{ marginTop: 12, color: gray600 }}>
          Loading Dashboard...
        </ThemedText>
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
    return (
      <AvailabilityManagement onBack={() => setActiveScreen("dashboard")} />
    );
  }

  if (activeScreen === "leaderboard") {
    return (
      <TopPhotographersLeaderboard
        onBack={() => setActiveScreen("dashboard")}
        onNavigate={onNavigate}
        userRole="photographer"
      />
    );
  }

  if (activeScreen === "badges") {
    return (
      <BadgeRewards
        onBack={() => setActiveScreen("dashboard")}
        onViewLeaderboard={() => setActiveScreen("leaderboard")}
      />
    );
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
          <PhotographerProfile
            onBack={() => {
              setActiveTab("dashboard");
              setActiveScreen("dashboard");
            }}
          />
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
        <PhotographerChat
          onBack={() => {
            setActiveTab("dashboard");
            setActiveScreen("dashboard");
            setFocusedChatPartnerId(null);
          }}
          onOpenChat={(conv) => {
            setFocusedChatPartnerId(conv.userId);
          }}
        />
      </View>
    );
  }

  if (activeScreen === "notifications") {
    // This is now handled by a modal, so we just redirect to dashboard
    setActiveScreen("dashboard");
    return null;
  }

  return (
    <View style={styles.safe} testID="photographer-dashboard">
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 80 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          scrollEnabled
          bounces={Platform.OS === "ios"}
          contentInsetAdjustmentBehavior={
            Platform.OS === "ios" ? "automatic" : undefined
          }
          overScrollMode={Platform.OS === "android" ? "always" : undefined}
        >
          <View
            style={[
              styles.header,
              { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 12 },
            ]}
          >
            <View style={styles.headerRow}>
              <View>
                <ThemedText style={styles.welcome}>Welcome back,</ThemedText>
                <ThemedText
                  type="2xl"
                  weight="extrabold"
                  style={styles.headerTitle}
                >
                  {userName || "Dashboard"}
                </ThemedText>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.notificationButton}
                onPress={() => setShowNotifications(true)}
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={white}
                />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <ThemedText style={styles.notificationBadgeText}>
                      {unreadCount}
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.badgeCard}>
              <View
                style={[styles.badgeIcon, { backgroundColor: "transparent" }]}
              >
                {BADGE_IMAGES[getBadgeForPoints(userPoints).name] ? (
                  <Image
                    source={BADGE_IMAGES[getBadgeForPoints(userPoints).name]}
                    style={{ width: 44, height: 44 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name="star" size={22} color={white} />
                )}
              </View>
              <View style={styles.badgeInfo}>
                <ThemedText style={styles.badgeLabel}>Current Badge</ThemedText>
                <ThemedText type="lg" weight="bold" style={styles.badgeTitle}>
                  {getBadgeForPoints(userPoints).label}
                </ThemedText>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.badgeButton}
                onPress={() => handleLocalNavigate("photographer-badges")}
              >
                <ThemedText weight="bold" style={styles.badgeButtonText}>
                  View Progress
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statColumn}>
                <View style={styles.statMainRow}>
                  <ThemedText style={styles.currencyLabel}>NPR</ThemedText>
                  <ThemedText
                    type="2xl"
                    weight="extrabold"
                    style={styles.statValueLarge}
                  >
                    {showEarnings ? stats.earnings.toLocaleString() : "****"}
                  </ThemedText>
                </View>
                <ThemedText style={styles.statSubLabel}>
                  Total Earnings
                </ThemedText>
              </View>

              <TouchableOpacity
                style={styles.visibilityButton}
                onPress={() => setShowEarnings(!showEarnings)}
              >
                <Ionicons
                  name={showEarnings ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color={white}
                />
              </TouchableOpacity>

              <View style={[styles.statColumn, { alignItems: "flex-end" }]}>
                <View style={styles.statMainRow}>
                  <ThemedText
                    type="2xl"
                    weight="extrabold"
                    style={styles.statValueLarge}
                  >
                    {stats.rating.toFixed(1)}
                  </ThemedText>
                  <Ionicons
                    name="star"
                    size={20}
                    color="#fbbf24"
                    style={{ marginLeft: 6 }}
                  />
                </View>
                <ThemedText style={styles.statSubLabel}>
                  {stats.totalReviews} reviews
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.body}>
            <View>
              <ThemedText
                type="lg"
                weight="extrabold"
                style={styles.sectionHeader}
              >
                Quick Actions
              </ThemedText>
              <View style={styles.quickActions}>
                <ActionCard
                  testID="view-leaderboard-card"
                  label="View Leaderboard"
                  icon="trophy"
                  bg="#e0e7ff"
                  color="#4f46e5"
                  onPress={() =>
                    handleLocalNavigate("photographer-leaderboard")
                  }
                />
                <ActionCard
                  testID="manage-portfolio-card"
                  label="Manage Portfolio"
                  icon="images"
                  bg="#dbeafe"
                  color="#2563eb"
                  onPress={() => handleLocalNavigate("photographer-portfolio")}
                />
                <ActionCard
                  testID="set-availability-card"
                  label="Set Availability"
                  icon="calendar"
                  bg="#d1fae5"
                  color="#059669"
                  onPress={() =>
                    handleLocalNavigate("photographer-availability")
                  }
                />
                <ActionCard
                  testID="update-pricing-card"
                  label="Update Pricing"
                  icon="cash-outline"
                  bg="#f3e8ff"
                  color="#9333ea"
                  onPress={() => handleLocalNavigate("photographer-pricing")}
                />
              </View>
            </View>

            <View>
              <View style={styles.sectionHeaderRow}>
                <ThemedText
                  type="lg"
                  weight="extrabold"
                  style={styles.sectionHeader}
                >
                  Upcoming Bookings ({stats.upcomingBookingsCount})
                </ThemedText>
                <TouchableOpacity
                  onPress={() => handleLocalNavigate("photographer-bookings")}
                  activeOpacity={0.7}
                >
                  <ThemedText weight="bold" style={styles.viewAll}>
                    View all
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.listColumn}>
                {upcomingBookings.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <ThemedText style={styles.emptyText}>
                      No upcoming bookings
                    </ThemedText>
                  </View>
                ) : (
                  upcomingBookings.map((booking) => (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.bookingHeader}>
                        <View>
                          <ThemedText
                            type="base"
                            weight="extrabold"
                            style={styles.bookingClient}
                          >
                            {booking.client}
                          </ThemedText>
                          <ThemedText
                            type="sm"
                            weight="bold"
                            style={styles.bookingEvent}
                          >
                            {booking.event}
                          </ThemedText>
                        </View>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <View style={styles.confirmedChip}>
                            <ThemedText
                              type="xs"
                              weight="extrabold"
                              style={styles.confirmedText}
                            >
                              {booking.status}
                            </ThemedText>
                          </View>
                          <View
                            style={[
                              styles.confirmedChip,
                              {
                                backgroundColor: [
                                  "COMPLETED",
                                  "PAID",
                                  "SUCCESSFUL",
                                ].includes(
                                  booking.payment_status?.toUpperCase(),
                                )
                                  ? "#dcfce7"
                                  : "#fee2e2",
                              },
                            ]}
                          >
                            <ThemedText
                              type="xs"
                              weight="extrabold"
                              style={{
                                color: [
                                  "COMPLETED",
                                  "PAID",
                                  "SUCCESSFUL",
                                ].includes(
                                  booking.payment_status?.toUpperCase(),
                                )
                                  ? "#16a34a"
                                  : "#ef4444",
                              }}
                            >
                              {["COMPLETED", "PAID", "SUCCESSFUL"].includes(
                                booking.payment_status?.toUpperCase(),
                              )
                                ? "PAID"
                                : "UNPAID"}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                      <View style={styles.bookingDetails}>
                        <View style={styles.inlineInfo}>
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color={gray500}
                          />
                          <ThemedText
                            type="xs"
                            weight="bold"
                            style={styles.detailText}
                          >
                            {new Date(booking.date).toLocaleDateString()}
                          </ThemedText>
                        </View>
                        <View style={styles.inlineInfo}>
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={gray500}
                          />
                          <ThemedText
                            type="xs"
                            weight="bold"
                            style={styles.detailText}
                          >
                            {new Date(booking.date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="sm"
                          weight="extrabold"
                          style={styles.bookingAmount}
                        >
                          NPR {booking.amount.toLocaleString()}
                        </ThemedText>

                        {booking.location && (
                          <TouchableOpacity
                            style={styles.quickMapButton}
                            onPress={() =>
                              router.push({
                                pathname: "/Photographer/NavigationMap" as any,
                                params: { address: booking.location },
                              })
                            }
                          >
                            <Ionicons
                              name="map-outline"
                              size={18}
                              color={primary}
                            />
                            <ThemedText
                              type="xs"
                              weight="bold"
                              style={{ color: primary }}
                            >
                              Map
                            </ThemedText>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View>
              <View style={styles.sectionHeaderRow}>
                <ThemedText
                  type="lg"
                  weight="extrabold"
                  style={styles.sectionHeader}
                >
                  Recent Reviews
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setActiveScreen("reviews")}
                  activeOpacity={0.7}
                >
                  <ThemedText weight="bold" style={styles.viewAll}>
                    View all
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.listColumn}>
                {recentReviews.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <ThemedText style={styles.emptyText}>
                      No reviews yet
                    </ThemedText>
                  </View>
                ) : (
                  recentReviews.map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <ThemedText
                          type="base"
                          weight="extrabold"
                          style={styles.reviewClient}
                        >
                          {review.client}
                        </ThemedText>
                        <View style={styles.reviewStars}>
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Ionicons
                              key={i}
                              name="star"
                              size={14}
                              color="#fbbf24"
                            />
                          ))}
                        </View>
                      </View>
                      <ThemedText type="sm" style={styles.reviewComment}>
                        {review.comment || "No comment left"}
                      </ThemedText>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <NotificationModal
        visible={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          fetchDashboardData();
        }}
        notifications={notifications}
        setNotifications={setNotifications}
        setUnreadCount={setUnreadCount}
      />

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
  testID,
}: {
  label: string;
  icon: string;
  bg: string;
  color: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.actionCard, { backgroundColor: bg }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <ThemedText weight="bold" style={styles.actionLabel}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f2f4f7" },
  container: { flex: 1, backgroundColor: "#f2f4f7" },
  scroll: { flex: 1 },
  content: { paddingBottom: 30 },
  header: {
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  welcome: { color: "#bfdbfe" },
  headerTitle: { color: "#fff", marginTop: 4 },
  notificationButton: { position: "relative", padding: 8 },
  notificationBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#f97316",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: "#1e3a8a",
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: 12,
  },
  badgeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 14,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeInfo: { flex: 1, marginLeft: 12 },
  badgeLabel: { color: "#e5e7eb" },
  badgeTitle: { color: "#fff", marginTop: 1 },
  badgeButton: {
    marginLeft: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeButtonText: { color: "#fff" },
  body: { paddingHorizontal: 20, paddingTop: 18, gap: 20 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    alignItems: "center",
  },
  notifIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notifAction: {
    fontSize: 15,
  },
  notifMessage: {
    fontSize: 13,
    marginTop: 2,
  },
  notifUser: {
    fontSize: 11,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
    marginLeft: 8,
  },
  reviewsText: { color: "#6b7280" },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionHeader: { color: "#0f172a", marginBottom: 8 },
  viewAll: { color: "#2563eb" },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: {
    flexBasis: "48%",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionLabel: { color: "#111827" },
  listColumn: { gap: 12 },
  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bookingClient: { color: "#0f172a" },
  bookingEvent: { color: "#4b5563", marginTop: 2 },
  confirmedChip: {
    backgroundColor: "#d1fae5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  confirmedText: { color: "#065f46" },
  bookingDetails: { flexDirection: "row", alignItems: "center", gap: 14 },
  inlineInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { color: "#6b7280" },
  bookingAmount: { marginLeft: "auto", color: "#2563eb" },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewClient: { color: "#0f172a" },
  reviewStars: { flexDirection: "row", gap: 4 },
  reviewComment: { color: "#4b5563" },
  emptyCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyText: {
    color: "#6b7280",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 0,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingBottom: 40,
  },
  emptyNotif: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statLabel: { color: "#4b5563" },
  statValue: { color: "#0f172a", marginVertical: 6 },
  statLink: { color: "#2563eb" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statColumn: {
    flex: 1,
  },
  statMainRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  currencyLabel: {
    color: "#bfdbfe",
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 6,
  },
  statValueLarge: {
    color: "#fff",
    fontSize: 24,
  },
  statSubLabel: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "500",
  },
  visibilityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  quickMapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
});

function NotificationModal({
  visible,
  onClose,
  notifications,
  setNotifications,
  setUnreadCount,
}: {
  visible: boolean;
  onClose: () => void;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}) {
  const insets = useSafeAreaInsets();
  const { background, gray900, gray700, gray500, gray100 } = useAppTheme();

  const getIcon = (type: string) => {
    switch (type) {
      case "BOOKING":
        return { name: "calendar-outline" as const, color: "#f97316" };
      case "COMMENT":
        return { name: "chatbubble-outline" as const, color: "#6366f1" };
      case "LIKE":
        return { name: "heart-outline" as const, color: "#ed4956" };
      case "REVIEW":
        return { name: "star-outline" as const, color: "#fbbf24" };
      case "SYSTEM":
        return { name: "shield-checkmark-outline" as const, color: "#3b82f6" };
      default:
        return { name: "notifications-outline" as const, color: "#6366f1" };
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      await apiService.markNotificationAsRead(id, token);

      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === id ? { ...n, is_read: true } : n,
        ),
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return "just now";
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)}h ago`;
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    } catch {
      return "";
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: background, height: "90%" },
          ]}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top || 16 }]}>
            <ThemedText type="xl" weight="bold" style={{ color: gray900 }}>
              Notifications
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={gray900} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {notifications.length === 0 ? (
              <View style={styles.emptyNotif}>
                <Ionicons
                  name="notifications-off-outline"
                  size={48}
                  color="#cbd5e1"
                />
                <ThemedText style={styles.emptyText}>
                  No new notifications
                </ThemedText>
              </View>
            ) : (
              notifications.map((notif) => {
                const icon = getIcon(notif.type);
                return (
                  <TouchableOpacity
                    key={notif.notification_id}
                    style={[
                      styles.notifItem,
                      {
                        backgroundColor: notif.is_read
                          ? background
                          : gray100 + "40",
                        flexDirection: "row",
                        alignItems: "center",
                      },
                    ]}
                    onPress={() =>
                      !notif.is_read && markAsRead(notif.notification_id)
                    }
                  >
                    <View
                      style={[
                        styles.notifIconBox,
                        { backgroundColor: icon.color + "15" },
                      ]}
                    >
                      <Ionicons name={icon.name} size={20} color={icon.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <ThemedText
                        style={[styles.notifAction, { color: gray900 }]}
                        weight="bold"
                      >
                        {notif.title}
                      </ThemedText>
                      <ThemedText
                        style={[styles.notifMessage, { color: gray700 }]}
                      >
                        {notif.message}
                      </ThemedText>
                      <ThemedText
                        style={[styles.notifUser, { color: gray500 }]}
                      >
                        {getRelativeTime(notif.created_at)}
                      </ThemedText>
                    </View>
                    {!notif.is_read && <View style={styles.unreadDot} />}
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
