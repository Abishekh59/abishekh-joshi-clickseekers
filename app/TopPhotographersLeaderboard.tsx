import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { ThemedText } from "../components/themed-text";
import { useAppTheme } from "../hooks/use-app-theme";
import { API_HOST, apiService } from "../services/api";
import { storage } from "../utils/storage";

interface TopPhotographersLeaderboardProps {
  onBack?: () => void;
  onNavigate?: (screen: string, data?: any) => void;
  userRole?: "client" | "photographer";
}

type TabType = "monthly" | "all-time";

interface PhotographerRank {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  points: number;
  badge?: string;
}

export default function TopPhotographersLeaderboard({
  onBack,
  onNavigate,
  userRole = "client",
}: TopPhotographersLeaderboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("monthly");
  const [loading, setLoading] = useState(true);
  const [photographers, setPhotographers] = useState<PhotographerRank[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const {
    primary,
    background,
    text,
    white,
    gray900,
    gray700,
    gray600,
    gray500,
    gray400,
    gray300,
    gray200,
    gray100,
    info,
  } = useAppTheme();

  // Missing theme colors - using primary or fallback values
  const blue600 = "#2563eb";
  const blue50 = "#eff6ff";
  const gray50 = "#f9fafb";
  const gray800 = "#1f2937";

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTopPhotographers(activeTab);
      if (response.success && response.data) {
        const mappedData = response.data.map((p: any) => ({
          rank: p.rank,
          id: p.user_id,
          name: p.full_name,
          avatar: p.avatar,
          points: p.points,
          badge: p.badge
        }));
        setPhotographers(mappedData);

        // Find current user's rank
        const user = await storage.getUser();
        const currentUserId = user?.user_id;

        if (currentUserId) {
          const userRank = mappedData.find((p: any) => p.id === currentUserId);
          if (userRank) {
            setCurrentUserRank(userRank.rank);
          } else {
            setCurrentUserRank(null);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      Alert.alert("Error", "Failed to load leaderboard data");
    } finally {
      setLoading(false);
    }
  };

  const topThreeList = photographers.filter(p => p.rank <= 3);
  const rankingsList = photographers.filter(p => p.rank > 3);

  // Navigate to photographer profile
  const handlePhotographerPress = (photographerId: string) => {
    if (onNavigate) {
      // When embedded in a parent screen
      const target = userRole === "photographer" ? "photographer-public-profile" : "client-photographer-profile";
      onNavigate(target, { photographerId });
    } else {
      // When opened as a standalone route
      router.push({ pathname: "/Client/PhotographerProfile", params: { id: photographerId } });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  return (
    <View style={[styles.container, { backgroundColor: white }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "ios" ? 10 : 20,
            backgroundColor: white,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={gray900} />
          </TouchableOpacity>
          <ThemedText
            type="lg"
            weight="bold"
            style={[styles.headerTitle, { color: gray900 }]}
          >
            Leaderboard
          </ThemedText>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(["monthly", "all-time"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem,
                activeTab === tab && [
                  styles.tabItemActive,
                  { backgroundColor: blue600 },
                ],
              ]}
              activeOpacity={0.8}
            >
              <ThemedText
                type="sm"
                weight="semibold"
                style={[
                  styles.tabText,
                  activeTab === tab ? { color: white } : { color: gray600 },
                ]}
              >
                {tab === "all-time" ? "Yearly" : "Monthly"}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {loading ? (
          <View style={{ marginTop: 50 }}>
            <ActivityIndicator size="large" color={primary} />
          </View>
        ) : photographers.length === 0 ? (
          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <ThemedText style={{ color: gray500 }}>No rankings available yet.</ThemedText>
          </View>
        ) : (
          <>
            {/* Top 3 - Podium */}
            <View style={styles.podiumContainer}>
              <View style={styles.podium}>
                {/* Sort by rank: 2nd, 1st, 3rd */}
                {[
                  topThreeList.find((p) => p.rank === 2),
                  topThreeList.find((p) => p.rank === 1),
                  topThreeList.find((p) => p.rank === 3),
                ].map((photographer) => {
                  if (!photographer) return <View key={Math.random()} style={styles.podiumItem} />;
                  const isFirst = photographer.rank === 1;

                  return (
                    <View key={photographer.id} style={styles.podiumItem}>
                      {/* Avatar with Badge */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.avatarWrapper}
                        onPress={() => handlePhotographerPress(photographer.id)}
                      >
                        <View
                          style={[
                            styles.avatarLarge,
                            isFirst ? styles.avatarFirst : styles.avatarOther,
                            {
                              backgroundColor: gray300,
                              borderWidth: 3,
                              borderColor: blue600,
                              overflow: 'hidden',
                            },
                          ]}
                        >
                          {photographer.avatar ? (
                            <Image
                              source={{
                                uri: photographer.avatar.startsWith("http")
                                  ? photographer.avatar
                                  : `${API_HOST}${photographer.avatar}`,
                              }}
                              style={{ width: "100%", height: "100%" }}
                            />
                          ) : (
                            <ThemedText
                              weight="bold"
                              style={[
                                { color: gray700 },
                                isFirst ? { fontSize: 24 } : { fontSize: 20 },
                              ]}
                            >
                              {getInitials(photographer.name)}
                            </ThemedText>
                          )}
                        </View>
                        {/* Rank Badge */}
                        <View
                          style={[styles.rankBadge, { backgroundColor: blue600 }]}
                        >
                          <ThemedText
                            type="sm"
                            weight="bold"
                            style={{ color: white }}
                          >
                            {photographer.rank}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>

                      {/* Name */}
                      <TouchableOpacity
                        onPress={() => handlePhotographerPress(photographer.id)}
                        activeOpacity={0.7}
                      >
                        <ThemedText
                          weight="bold"
                          style={[
                            styles.podiumName,
                            { color: gray900, fontSize: 13 },
                          ]}
                          numberOfLines={1}
                        >
                          {photographer.name}
                        </ThemedText>
                      </TouchableOpacity>

                      {/* Points */}
                      <ThemedText
                        type="xs"
                        weight="medium"
                        style={{ color: gray600 }}
                      >
                        {photographer.points} pts
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Rankings List */}
            <View style={[styles.rankingsList, { backgroundColor: "#E8EEF7" }]}>
              {rankingsList.map((photographer) => {
                return (
                  <View
                    key={photographer.id}
                    style={[styles.rankingItem, { backgroundColor: white }]}
                  >
                    {/* Rank */}
                    <View style={styles.rankCol}>
                      <ThemedText
                        type="base"
                        weight="semibold"
                        style={{ color: gray900 }}
                      >
                        {photographer.rank}
                      </ThemedText>
                    </View>

                    {/* Avatar */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.avatarSmall,
                        { backgroundColor: gray300, overflow: "hidden" },
                      ]}
                      onPress={() => handlePhotographerPress(photographer.id)}
                    >
                      {photographer.avatar ? (
                        <Image
                          source={{
                            uri: photographer.avatar.startsWith("http")
                              ? photographer.avatar
                              : `${API_HOST}${photographer.avatar}`,
                          }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : (
                        <ThemedText
                          type="xs"
                          weight="bold"
                          style={{ color: gray700 }}
                        >
                          {getInitials(photographer.name)}
                        </ThemedText>
                      )}
                    </TouchableOpacity>

                    {/* Name */}
                    <View style={styles.nameCol}>
                      <TouchableOpacity
                        onPress={() => handlePhotographerPress(photographer.id)}
                        activeOpacity={0.7}
                      >
                        <ThemedText
                          type="base"
                          weight="medium"
                          style={{ color: gray900 }}
                        >
                          {photographer.name}
                          {currentUserRank !== null &&
                            photographer.rank === currentUserRank && (
                              <ThemedText
                                type="xs"
                                weight="bold"
                                style={{ color: blue600 }}
                              >
                                {" "}
                                (You)
                              </ThemedText>
                            )}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>

                    {/* Points */}
                    <View style={styles.pointsCol}>
                      <ThemedText
                        type="sm"
                        weight="bold"
                        style={{
                          color:
                            currentUserRank !== null &&
                              photographer.rank === currentUserRank
                              ? blue600
                              : gray700,
                        }}
                      >
                        {photographer.points.toLocaleString()}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
  },
  headerRightPlaceholder: {
    width: 32,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItemActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
  },
  podiumContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 32,
  },
  podiumItem: {
    alignItems: "center",
    width: 100,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  avatarLarge: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFirst: {
    width: 90,
    height: 90,
  },
  avatarOther: {
    width: 75,
    height: 75,
  },
  rankBadge: {
    position: "absolute",
    bottom: -8,
    left: "50%",
    transform: [{ translateX: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  podiumName: {
    textAlign: "center",
    marginBottom: 4,
  },
  rankingsList: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
  },
  rankingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  rankCol: {
    width: 32,
    marginRight: 8,
  },
  avatarSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  nameCol: {
    flex: 1,
  },
  pointsCol: {
    marginLeft: 8,
  },
});
