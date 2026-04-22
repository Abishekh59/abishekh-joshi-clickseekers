import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { useAppTheme } from "../../hooks/use-app-theme";
import { apiService } from "../../services/api";
import { storage } from "../../utils/storage";

interface PhotographerNotificationsProps {
    onBack?: () => void;
}

export default function PhotographerNotifications({
    onBack,
}: PhotographerNotificationsProps) {
    const insets = useSafeAreaInsets();
    const { primary, background, gray900, gray700, gray600, gray500, gray100, white, success } =
        useAppTheme();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const token = await storage.getToken();
            if (!token) return;

            const res = await apiService.getNotifications(token);
            if (res.success) {
                setNotifications(res.data || []);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            const token = await storage.getToken();
            if (!token) return;

            await apiService.markNotificationAsRead(id, token);
            setNotifications((prev) =>
                prev.map((n) =>
                    n.notification_id === id ? { ...n, is_read: true } : n
                )
            );
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const renderNotification = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[
                styles.notificationItem,
                { backgroundColor: item.is_read ? white : gray100 },
            ]}
            onPress={() => !item.is_read && markAsRead(item.notification_id)}
            activeOpacity={0.7}
        >
            <View style={styles.notificationContent}>
                <View
                    style={[
                        styles.iconContainer,
                        { backgroundColor: item.is_read ? gray100 : primary + "20" },
                    ]}
                >
                    <Ionicons
                        name={getNotificationIcon(item.type)}
                        size={24}
                        color={item.is_read ? gray500 : primary}
                    />
                </View>
                <View style={styles.textContainer}>
                    <ThemedText
                        type="sm"
                        weight="bold"
                        style={{ color: gray900 }}
                    >
                        {item.title || "Notification"}
                    </ThemedText>
                    <ThemedText
                        type="xs"
                        style={{ color: gray700, marginTop: 2 }}
                    >
                        {item.message}
                    </ThemedText>
                    <ThemedText type="xs" style={{ color: gray500, marginTop: 4 }}>
                        {new Date(item.created_at).toLocaleString()}
                    </ThemedText>
                </View>
                {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: primary }]} />}
            </View>
        </TouchableOpacity>
    );

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "BOOKING":
                return "calendar";
            case "COMMENT":
                return "chatbubble";
            case "LIKE":
                return "heart";
            case "REVIEW":
                return "star";
            case "CHAT":
                return "chatbubble-ellipses";
            default:
                return "notifications";
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: background }]}>
            <View
                style={[
                    styles.header,
                    { paddingTop: Platform.OS === "ios" ? 10 : insets.top + 12 },
                ]}
            >
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={gray900} />
                </TouchableOpacity>
                <ThemedText type="xl" weight="bold" style={{ color: gray900 }}>
                    Notifications
                </ThemedText>
                <View style={{ width: 28 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotification}
                    keyExtractor={(item) => item.notification_id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchNotifications(true)}
                            tintColor={primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={64} color={gray500} />
                            <ThemedText style={{ color: gray500, marginTop: 16 }}>
                                No notifications yet
                            </ThemedText>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    backButton: { padding: 4 },
    listContent: { paddingBottom: 20 },
    notificationItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    notificationContent: { flexDirection: "row", alignItems: "center" },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    textContainer: { flex: 1 },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 8,
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
});
