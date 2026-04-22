import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { apiService } from "../../services/api";
import { storage } from "../../utils/storage";

import {
    BADGE_IMAGES,
    BADGE_TIERS,
    getBadgeForPoints,
} from "../../constants/badges";

const HOW_TO_EARN = [
  {
    category: "1. BOOKINGS",
    data: [
      {
        icon: "calendar-outline",
        title: "Booking Accepted",
        desc: "+5 points",
      },
      {
        icon: "checkmark-done-circle-outline",
        title: "Booking Completed",
        desc: "+40 points",
      },
      {
        icon: "close-circle-outline",
        title: "Cancelled by Photographer",
        desc: "-20 points",
      },
    ],
  },
  {
    category: "2. REVIEWS & RATINGS",
    data: [
      { icon: "star", title: "5⭐️ Rating & Review", desc: "+20 points" },
      { icon: "star-half", title: "4⭐️ Rating & Review", desc: "+10 points" },
      { icon: "star-outline", title: "3⭐️ Rating & Review", desc: "+5 points" },
      {
        icon: "trending-down",
        title: "1-2⭐️ Rating & Review",
        desc: "-10 points",
      },
    ],
  },
  {
    category: "3. PROFILE & PORTFOLIO",
    data: [
      {
        icon: "shield-checkmark-outline",
        title: "KYC Approved",
        desc: "+30 points one-time",
      },
      {
        icon: "image-outline",
        title: "Photo Upload",
        desc: "+0.5 per image (max 20/wk)",
      },
      { icon: "heart-outline", title: "Photo Like", desc: "+0.5 points" },
      {
        icon: "bookmark-outline",
        title: "Save Post",
        desc: "+2 points (client only)",
      },
    ],
  },
  {
    category: "4. ENGAGEMENT",
    data: [
      {
        icon: "chatbubble-outline",
        title: "Comment Received",
        desc: "+2 points",
      },
    ],
  },
  {
    category: "5. CONSISTENCY",
    data: [
      { icon: "log-in-outline", title: "Daily Login", desc: "+5 points" },
      {
        icon: "flame-outline",
        title: "7-Day Login Streak",
        desc: "+5 bonus points",
      },
      {
        icon: "calendar-number-outline",
        title: "30-Day Active Month",
        desc: "+20 bonus points",
      },
    ],
  },
  {
    category: "6. LEADERBOARD REWARDS",
    data: [
      { icon: "trophy-outline", title: "Weekly Rank #1", desc: "+40 points" },
      { icon: "medal-outline", title: "Monthly Winner", desc: "+50 points" },
      {
        icon: "ribbon-outline",
        title: "Quarterly Top Performer",
        desc: "+80 points",
      },
    ],
  },
];

// local getBadgeForPoints removed, using imported one

export default function BadgeRewards({
  onBack,
  onViewLeaderboard,
}: {
  onBack: () => void;
  onViewLeaderboard?: () => void;
}) {
  const Text = ThemedText;
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState<any>(null);
  const [userRank, setUserRank] = useState<string>("—");
  const [loading, setLoading] = useState(true);

  const fetchBadgeData = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;

      const userRes = await apiService.getMe(token);

      if (userRes.success) {
        setUserData(userRes.data);
        // The backend getMe returns rank as "#N" for photographers
        if (userRes.data.rank) {
          setUserRank(String(userRes.data.rank).replace("#", ""));
        }
      }
    } catch (error) {
      console.error("[BadgeRewards] Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadgeData();
  }, []);

  // Backend getMe returns `points` as a top-level field for photographers
  const totalPoints = userData?.points ?? 0;
  const currentTier = getBadgeForPoints(totalPoints);
  const currentTierIndex = BADGE_TIERS.findIndex(
    (t) => t.name === currentTier.name,
  );
  const nextTier = BADGE_TIERS[currentTierIndex + 1] ?? null;

  const progressPts = nextTier ? totalPoints - currentTier.points : 0;
  const targetPts = nextTier ? nextTier.points - currentTier.points : 1;
  const progressPct = nextTier
    ? Math.min(Math.round((progressPts / targetPts) * 100), 100)
    : 100;
  const ptsToNext = nextTier ? nextTier.points - totalPoints : 0;

  const photographerCommission = currentTier.commission;
  const userKeepPercentage = 100 - photographerCommission;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "ios" ? 14 : insets.top + 14 },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Badges & Rewards</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.darkSection}>
          <View style={styles.rankCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(userData?.full_name ?? "U")
                  .split(" ")
                  .map((w: string) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rankLabel}>Current Rank</Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text style={styles.rankValue}>#{userRank}</Text>
                <Text style={{ fontSize: 16 }}></Text>
                <Text style={styles.pointsText}>
                  {totalPoints.toLocaleString()} points
                </Text>
              </View>
            </View>
          </View>

          {nextTier && (
            <View style={styles.progressBox}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  Progress to {nextTier.name}
                </Text>
                <Text style={styles.progressPts}>{ptsToNext} pts to go</Text>
              </View>
              <View style={styles.progressBg}>
                <View
                  style={[styles.progressFill, { width: `${progressPct}%` }]}
                />
              </View>
              <View style={styles.progressFooter}>
                <Text style={styles.progressFooterText}>
                  {currentTier.points} pts
                </Text>
                <Text style={styles.progressFooterText}>
                  {nextTier.points} pts
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.leaderboardCta}
            onPress={onViewLeaderboard || onBack}
          >
            <Ionicons
              name="trophy-outline"
              size={20}
              color="#e2e8f0"
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>View Full Leaderboard</Text>
              <Text style={styles.ctaSubtitle}>Current Rank: #{userRank}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.badgeSection}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Badge Levels</Text>
            <View style={styles.levelChip}>
              <Ionicons name="trophy-outline" size={13} color="#7c3aed" />
              <Text style={styles.levelChipText}>
                Level {currentTierIndex >= 0 ? currentTierIndex + 1 : 0}/
                {BADGE_TIERS.length}
              </Text>
            </View>
          </View>
          <View style={styles.badgeList}>
            {BADGE_TIERS.map((tier) => {
              const isActive = currentTier.name === tier.name;
              const isLocked = totalPoints < tier.points;
              const badgeImg = BADGE_IMAGES[tier.name];
              return (
                <View
                  key={tier.name}
                  style={[
                    styles.tierCard,
                    isActive && styles.tierCardActive,
                    isLocked && styles.tierCardLocked,
                  ]}
                >
                  <View
                    style={[
                      styles.tierIconWrap,
                      isActive && styles.tierIconWrapActive,
                    ]}
                  >
                    {badgeImg ? (
                      <Image
                        source={badgeImg}
                        style={{
                          width: 38,
                          height: 38,
                          opacity: isLocked ? 0.35 : 1,
                        }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons
                        name="medal-outline"
                        size={32}
                        color={isActive ? "#fff" : "#7c3aed"}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.tierName, isActive && { color: "#fff" }]}
                    >
                      {tier.label}
                    </Text>
                    <Text
                      style={[
                        styles.tierDesc,
                        isActive && { color: "#e2d9f3" },
                      ]}
                    >
                      {tier.desc}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.commissionPill,
                      isActive && styles.commissionPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.commissionText,
                        isActive && { color: "#7c3aed" },
                      ]}
                    >
                      {tier.commission}% Fee
                    </Text>
                  </View>
                  {!isLocked && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={isActive ? "#fff" : "#059669"}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.commissionCardWrap}>
          <View style={styles.commissionHeader}>
            <View style={styles.commissionIconBox}>
              <Ionicons name="cash-outline" size={24} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.commissionTitle}>
                Your Platform Fee for Each Booking
              </Text>
              <Text style={styles.commissionSubtitle}>
                {currentTier.name} • {photographerCommission}% platform fee
              </Text>
            </View>
            <View style={styles.rateBadge}>
              <Text style={styles.rateText}>{photographerCommission}%</Text>
            </View>
          </View>
          <View style={styles.payoutRow}>
            <View style={styles.payoutItem}>
              <Text style={styles.payoutLabel}>Platform Fee</Text>
              <Text style={[styles.payoutValue, { color: "#ef4444" }]}>
                {photographerCommission}%
              </Text>
            </View>
            <View style={styles.payoutDivider} />
            <View style={styles.payoutItem}>
              <Text style={styles.payoutLabel}>You Keep</Text>
              <Text style={[styles.payoutValue, { color: "#10b981" }]}>
                {userKeepPercentage}%
              </Text>
            </View>
          </View>
          <View style={styles.nextTierInfo}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#94a3b8"
            />
            <Text style={styles.nextTierText}>
              On every booking payment by a client, {photographerCommission}% is
              deducted as platform fee. e.g. On a Rs. 10,000 booking, Rs.{" "}
              {((10000 * photographerCommission) / 100).toLocaleString()} goes
              to the platform and you receive Rs.{" "}
              {((10000 * userKeepPercentage) / 100).toLocaleString()}.
            </Text>
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 40 }]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Ionicons name="trending-up" size={18} color="#7c3aed" />
            <Text style={styles.sectionTitle}>How to Earn Points</Text>
          </View>

          {HOW_TO_EARN.map((category) => (
            <View key={category.category} style={{ marginBottom: 20 }}>
              <Text style={styles.categoryTitle}>{category.category}</Text>
              <View style={{ gap: 10 }}>
                {category.data.map((item) => (
                  <View key={item.title} style={styles.earnCard}>
                    <View style={styles.earnIconWrap}>
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color="#7c3aed"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.earnTitle}>{item.title}</Text>
                      <Text style={styles.earnDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  scroll: { flex: 1 },
  darkSection: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  rankLabel: { color: "#94a3b8", fontSize: 12, marginBottom: 4 },
  rankValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  pointsText: { color: "#e2e8f0", fontSize: 15, fontWeight: "600" },
  progressBox: { gap: 6 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { color: "#cbd5e1", fontSize: 13 },
  progressPts: { color: "#a5b4fc", fontSize: 13, fontWeight: "700" },
  progressBg: {
    height: 8,
    backgroundColor: "#334155",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7c3aed",
    borderRadius: 99,
  },
  progressFooter: { flexDirection: "row", justifyContent: "space-between" },
  progressFooterText: { color: "#64748b", fontSize: 11 },
  leaderboardCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
  },
  ctaTitle: { color: "#e2e8f0", fontSize: 14, fontWeight: "700" },
  ctaSubtitle: { color: "#64748b", fontSize: 12, marginTop: 2 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  categoryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 10,
    marginTop: 5,
    letterSpacing: 0.5,
  },
  badgeSection: { paddingVertical: 10 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  levelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ede9fe",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelChipText: { color: "#7c3aed", fontSize: 12, fontWeight: "700" },
  badgeList: { paddingHorizontal: 20, gap: 10 },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginRight: 10,
  },
  tierCardActive: { backgroundColor: "#1e1b4b" },
  tierCardLocked: { opacity: 0.55 },
  tierIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  tierIconWrapActive: { backgroundColor: "#fff" },
  tierName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  tierDesc: { fontSize: 12, color: "#64748b" },
  commissionPill: {
    backgroundColor: "#f1f5f9",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  commissionPillActive: { backgroundColor: "#ede9fe" },
  commissionText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  commissionCardWrap: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginHorizontal: 20,
    marginTop: 10,
  },
  commissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  commissionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  commissionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  commissionSubtitle: { fontSize: 13, color: "#64748b" },
  rateBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rateText: { color: "#059669", fontWeight: "800", fontSize: 16 },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
  },
  payoutItem: { flex: 1, alignItems: "center" },
  payoutLabel: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  payoutValue: { fontSize: 16, fontWeight: "700" },
  payoutDivider: { width: 1, height: 24, backgroundColor: "#e2e8f0" },
  nextTierInfo: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  nextTierText: { fontSize: 13, color: "#64748b" },
  earnCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  earnIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#ede9fe",
    justifyContent: "center",
    alignItems: "center",
  },
  earnTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  earnDesc: { fontSize: 12, color: "#64748b" },
});
