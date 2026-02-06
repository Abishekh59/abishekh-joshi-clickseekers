import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { ThemedText } from "../components/themed-text";
import { useAppTheme } from "../hooks/use-app-theme";

interface TopPhotographersLeaderboardProps {
  onBack?: () => void;
  onNavigate?: (screen: string, data?: any) => void;
  userRole?: "client" | "photographer";
}

type TabType = "weekly" | "monthly" | "all-time";

export default function TopPhotographersLeaderboard({
  onBack,
  onNavigate,
  userRole = "client",
}: TopPhotographersLeaderboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("weekly");
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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

  // Top 3 photographers (podium)
  const topThree: Record<TabType, any[]> = {
    weekly: [
      { rank: 2, id: 2, name: "Rhythm Rai", avatar: "RR", points: 40 },
      { rank: 1, id: 1, name: "Abishekh Joshi", avatar: "AJ", points: 43 },
      { rank: 3, id: 3, name: "Nikhil Udas", avatar: "NU", points: 38 },
    ],
    monthly: [
      { rank: 2, id: 5, name: "Maya Gurung", avatar: "MG", points: 1490 },
      { rank: 1, id: 1, name: "Rajesh Sharma", avatar: "RS", points: 1800 },
      { rank: 3, id: 2, name: "Anjali Thapa", avatar: "AT", points: 1205 },
    ],
    "all-time": [
      { rank: 2, id: 2, name: "Anjali Thapa", avatar: "AT", points: 8450 },
      { rank: 1, id: 1, name: "Rajesh Sharma", avatar: "RS", points: 9820 },
      { rank: 3, id: 3, name: "Suresh Tamang", avatar: "ST", points: 7230 },
    ],
  };

  // Rest of the rankings (4+)
  const rankings: Record<TabType, any[]> = {
    weekly: [
      { rank: 4, id: 4, name: "Pradip Khadka", avatar: "PK", points: 36 },
      { rank: 5, id: 5, name: "Avishek Giri", avatar: "AG", points: 35 },
      { rank: 6, id: 6, name: "Abiskar Joshi", avatar: "AJ", points: 34 },
      { rank: 7, id: 7, name: "Sandhya Shrestha", avatar: "SS", points: 33 },
      { rank: 8, id: 8, name: "Sabdika Basnet", avatar: "SB", points: 32 },
      { rank: 9, id: 9, name: "Shova Shrestha", avatar: "SS", points: 31 },
      { rank: 10, id: 10, name: "Sishan Binaya", avatar: "SB", points: 30 },
    ],
    monthly: [
      { rank: 4, id: 3, name: "Suresh Tamang", avatar: "ST", points: 1000 },
      { rank: 5, id: 4, name: "Bikash Rai", avatar: "BR", points: 900 },
      { rank: 6, id: 6, name: "Sita Karki", avatar: "SK", points: 800 },
      { rank: 7, id: 7, name: "Ram Bahadur", avatar: "RB", points: 750 },
      { rank: 8, id: 8, name: "Priya Rai", avatar: "PR", points: 720 },
    ],
    "all-time": [
      { rank: 4, id: 5, name: "Maya Gurung", avatar: "MG", points: 6890 },
      { rank: 5, id: 4, name: "Bikash Rai", avatar: "BR", points: 6240 },
      { rank: 6, id: 6, name: "Sita Karki", avatar: "SK", points: 5850 },
      { rank: 7, id: 7, name: "Ram Bahadur", avatar: "RB", points: 5320 },
      { rank: 8, id: 8, name: "Priya Rai", avatar: "PR", points: 4890 },
    ],
  };

  const currentTopThree = topThree[activeTab];
  const currentRankings = rankings[activeTab];

  // Find current user's rank - only relevant for photographers
  const currentUserRank = userRole === "photographer" ? 1 : null;

  // Determine navigation target based on user role
  const getNavigationTarget = (photographerId: number) => {
    if (userRole === "photographer") {
      // Photographers view other photographer profiles
      return "photographer-public-profile";
    }
    return "client-photographer-profile";
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: white }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "ios" ? insets.top : insets.top + 12,
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
          {(["weekly", "monthly", "all-time"] as const).map((tab) => (
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
                {tab === "all-time"
                  ? "All Time"
                  : tab === "weekly"
                    ? "Weekly"
                    : "Monthly"}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Top 3 - Podium */}
        <View style={styles.podiumContainer}>
          <View style={styles.podium}>
            {/* Sort by rank: 2nd, 1st, 3rd */}
            {[
              currentTopThree.find((p) => p.rank === 2),
              currentTopThree.find((p) => p.rank === 1),
              currentTopThree.find((p) => p.rank === 3),
            ].map((photographer) => {
              if (!photographer) return null;
              const isFirst = photographer.rank === 1;

              return (
                <View key={photographer.id} style={styles.podiumItem}>
                  {/* Avatar with Badge */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.avatarWrapper}
                    onPress={() =>
                      onNavigate?.(getNavigationTarget(photographer.id), {
                        photographerId: photographer.id,
                      })
                    }
                  >
                    <View
                      style={[
                        styles.avatarLarge,
                        isFirst ? styles.avatarFirst : styles.avatarOther,
                        {
                          backgroundColor: gray300,
                          borderWidth: 3,
                          borderColor: blue600,
                        },
                      ]}
                    >
                      <ThemedText
                        weight="bold"
                        style={[
                          { color: gray700 },
                          isFirst ? { fontSize: 24 } : { fontSize: 20 },
                        ]}
                      >
                        {photographer.avatar}
                      </ThemedText>
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
                    onPress={() =>
                      onNavigate?.(getNavigationTarget(photographer.id), {
                        photographerId: photographer.id,
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      weight="bold"
                      style={[
                        styles.podiumName,
                        { color: gray900, fontSize: 14 },
                      ]}
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
          {currentRankings.map((photographer) => {
            const isCurrentUser = photographer.rank === currentUserRank;

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
                  style={[styles.avatarSmall, { backgroundColor: gray300 }]}
                  onPress={() =>
                    onNavigate?.(getNavigationTarget(photographer.id), {
                      photographerId: photographer.id,
                    })
                  }
                >
                  <ThemedText
                    type="xs"
                    weight="bold"
                    style={{ color: gray700 }}
                  >
                    {photographer.avatar}
                  </ThemedText>
                </TouchableOpacity>

                {/* Name */}
                <View style={styles.nameCol}>
                  <TouchableOpacity
                    onPress={() =>
                      onNavigate?.(getNavigationTarget(photographer.id), {
                        photographerId: photographer.id,
                      })
                    }
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
