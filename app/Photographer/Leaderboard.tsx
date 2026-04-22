import { BadgeDisplay } from '@/components/BadgeDisplay';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { API_HOST, apiService } from '@/services/api';
import { storage } from '@/utils/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';

interface LeaderboardEntry {
    rank: number;
    userId: string;
    fullName: string;
    profileImage: string | null;
    totalPoints: number;
    badgeName: string;
    badgeId: number;
}

export default function Leaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const gray100 = useThemeColor({}, 'gray100');
    const gray900 = useThemeColor({}, 'gray900');
    const gray600 = useThemeColor({}, 'gray600');
    const primary = useThemeColor({}, 'primary');

    const fetchLeaderboard = async () => {
        try {
            const token = await storage.getToken();
            if (token) {
                const userResponse = await apiService.getMe(token);
                setCurrentUserId(userResponse.data?.user_id);
            }

            const response = await apiService.getLeaderboard(50);
            if (response.success && response.data) {
                setLeaderboard(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeaderboard();
    };

    const renderItem = ({ item }: { item: LeaderboardEntry }) => {
        const isCurrentUser = item.userId === currentUserId;
        const isTopThree = item.rank <= 3;

        return (
            <View
                style={[
                    styles.itemContainer,
                    { backgroundColor: gray100 },
                    isCurrentUser && { borderColor: primary, borderWidth: 2 },
                ]}
            >
                <View style={styles.rankContainer}>
                    {isTopThree ? (
                        <ThemedText type="xl" weight="bold" style={{ color: getRankColor(item.rank) }}>
                            #{item.rank}
                        </ThemedText>
                    ) : (
                        <ThemedText type="lg" weight="medium" style={{ color: gray600 }}>
                            #{item.rank}
                        </ThemedText>
                    )}
                </View>

                <View style={styles.profileContainer}>
                    {item.profileImage ? (
                        <Image
                            source={{ uri: `${API_HOST}${item.profileImage}` }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, { backgroundColor: gray600 }]} />
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <ThemedText
                        type="base"
                        weight="semibold"
                        style={{ color: gray900 }}
                        numberOfLines={1}
                    >
                        {item.fullName}
                        {isCurrentUser && ' (You)'}
                    </ThemedText>
                    <BadgeDisplay badgeName={item.badgeName} size="small" />
                </View>

                <View style={styles.pointsContainer}>
                    <ThemedText type="lg" weight="bold" style={{ color: primary }}>
                        {item.totalPoints.toLocaleString()}
                    </ThemedText>
                    <ThemedText type="xs" style={{ color: gray600 }}>
                        points
                    </ThemedText>
                </View>
            </View>
        );
    };

    const getRankColor = (rank: number) => {
        if (rank === 1) return '#eab308'; // Gold
        if (rank === 2) return '#9ca3af'; // Silver
        if (rank === 3) return '#c2410c'; // Bronze
        return gray600;
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: '#fff' }]}>
                <ActivityIndicator size="large" color={primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ThemedText type="3xl" weight="bold" style={{ color: gray900 }}>
                    🏆 Leaderboard
                </ThemedText>
                <ThemedText type="sm" style={{ color: gray600 }}>
                    Top photographers by points
                </ThemedText>
            </View>

            <FlatList
                data={leaderboard}
                renderItem={renderItem}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <ThemedText type="base" style={{ color: gray600 }}>
                            No leaderboard data available
                        </ThemedText>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    header: {
        padding: 20,
        gap: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    rankContainer: {
        width: 50,
        alignItems: 'center',
    },
    profileContainer: {
        width: 48,
        height: 48,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    infoContainer: {
        flex: 1,
        gap: 4,
    },
    pointsContainer: {
        alignItems: 'flex-end',
    },
});
