import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/themed-text';
import { useAppTheme } from '../../hooks/use-app-theme';

interface BadgeRewards {
  onBack?: () => void;
}

export default function BadgeRewards({ onBack }: BadgeRewards) {
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
    info
  } = useAppTheme();

  const currentBadge = {
    level: 3,
    name: 'Elite Photographer',
    icon: 'star',
    color: 'orange',
    progress: 75,
    nextLevel: 'Legend Photographer'
  };

  const badges = [
    { level: 1, name: 'Beginner', icon: 'leaf', color: 'green', unlocked: true, requirements: 'Complete profile & KYC' },
    { level: 2, name: 'Verified Pro', icon: 'checkmark-circle', color: 'blue', unlocked: true, requirements: '10 completed bookings, 4.5+ rating' },
    { level: 3, name: 'Elite Photographer', icon: 'star', color: 'orange', unlocked: true, requirements: '50 bookings, 4.8+ rating' },
    { level: 4, name: 'Legend Photographer', icon: 'crown', color: 'purple', unlocked: false, requirements: '100 bookings, 4.9+ rating, Top 10%' }
  ];

  const achievements = [
    { id: 1, title: 'First Booking', description: 'Completed your first booking', icon: 'briefcase', unlocked: true },
    { id: 2, title: 'Quick Responder', description: 'Respond within 2 hours consistently', icon: 'flash', unlocked: true },
    { id: 3, title: '5-Star Champion', description: 'Received 50 five-star reviews', icon: 'star', unlocked: true },
    { id: 4, title: 'Portfolio Master', description: 'Upload 100+ portfolio images', icon: 'image', unlocked: false },
    { id: 5, title: 'Client Favorite', description: 'Added to favorites by 50+ clients', icon: 'heart', unlocked: false },
    { id: 6, title: 'Revenue Milestone', description: 'Earn NPR 500,000 total', icon: 'cash', unlocked: false }
  ];

  const benefits = [
    { title: 'Profile Boost', description: 'Higher ranking in search results', icon: 'trending-up' },
    { title: 'Priority Support', description: '24/7 priority customer support', icon: 'star' },
    { title: 'Exclusive Features', description: 'Access to premium tools', icon: 'gift' },
    { title: 'Lower Fees', description: 'Reduced platform commission', icon: 'trophy' }
  ];

  const leaderboard = [
    { rank: 1, name: 'Krishna Shrestha', badge: 'Legend', bookings: 235, rating: 5.0 },
    { rank: 2, name: 'Anita Gurung', badge: 'Legend', bookings: 198, rating: 4.9 },
    { rank: 3, name: 'Rajesh Sharma', badge: 'Elite', bookings: 156, rating: 4.9 },
    { rank: 4, name: 'Maya Tamang', badge: 'Elite', bookings: 142, rating: 4.8 },
    { rank: 5, name: 'Bikash Rai', badge: 'Elite', bookings: 134, rating: 4.8 }
  ];

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return { bg: '#fef3c7', text: '#b45309' };
      case 2:
        return { bg: '#f3f4f6', text: '#4b5563' };
      case 3:
        return { bg: '#fed7aa', text: '#ea580c' };
      default:
        return { bg: '#f9fafb', text: '#6b7280' };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: gray100 }]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[primary, secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            {onBack && (
              <TouchableOpacity onPress={onBack}>
                <Ionicons name="chevron-back" size={24} color={white} />
              </TouchableOpacity>
            )}
            <ThemedText type="2xl" weight="bold" style={{ color: white }}>Badges & Rewards</ThemedText>
          </View>

          {/* Current Badge Card */}
          <View style={[styles.currentBadgeCard, { backgroundColor: white + '33' }]}>
            <View style={[styles.badgeIconContainer, { backgroundColor: white }]}>
              <Ionicons name={currentBadge.icon as any} size={32} color={primary} />
            </View>
            <View style={styles.badgeInfo}>
              <ThemedText type="xs" style={{ color: white + 'CC' }}>Current Badge</ThemedText>
              <ThemedText type="lg" weight="bold" style={{ color: white }}>{currentBadge.name}</ThemedText>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <ThemedText type="xs" style={{ color: white }}>Progress to {currentBadge.nextLevel}</ThemedText>
              <ThemedText type="xs" weight="bold" style={{ color: white }}>{currentBadge.progress}%</ThemedText>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: white + '33' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${currentBadge.progress}%`, backgroundColor: white }
                ]}
              />
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Badge Levels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badge Levels</Text>
          <View style={styles.badgesList}>
            {badges.map((badge) => (
              <View
                key={badge.level}
                style={[
                  styles.badgeCard,
                  !badge.unlocked && styles.badgeCardLocked
                ]}
              >
                <View style={styles.badgeItemIcon}>
                  <Ionicons name={badge.icon as any} size={28} color="#2563eb" />
                </View>
                <View style={styles.badgeItemContent}>
                  <View style={styles.badgeLevelHeader}>
                    <Text style={styles.badgeLevelTitle}>
                      Level {badge.level}: {badge.name}
                    </Text>
                    {badge.unlocked && (
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                    )}
                  </View>
                  <Text style={styles.badgeRequirements}>{badge.requirements}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  !achievement.unlocked && styles.achievementCardLocked
                ]}
              >
                <View style={styles.achievementIconContainer}>
                  <Ionicons name={achievement.icon as any} size={32} color="#2563eb" />
                </View>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Elite Benefits</Text>
          <View style={styles.benefitsGrid}>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitCard}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name={benefit.icon as any} size={24} color="#2563eb" />
                </View>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Photographers This Month</Text>
          <View style={styles.leaderboardCard}>
            {leaderboard.map((photographer) => {
              const rankColor = getRankColor(photographer.rank);
              return (
                <View key={photographer.rank} style={styles.leaderboardItem}>
                  <View style={[styles.rankBadge, { backgroundColor: rankColor.bg }]}>
                    <Text style={[styles.rankText, { color: rankColor.text }]}>
                      {photographer.rank}
                    </Text>
                  </View>
                  <View style={styles.leaderboardInfo}>
                    <View style={styles.photographerHeader}>
                      <Text style={styles.photographerName}>{photographer.name}</Text>
                      {photographer.rank === 3 && (
                        <Text style={styles.youBadge}>(You)</Text>
                      )}
                    </View>
                    <View style={styles.photographerStats}>
                      <Text style={styles.statText}>{photographer.bookings} bookings</Text>
                      <Text style={styles.statText}>⭐ {photographer.rating}</Text>
                      <View style={styles.badgeBadge}>
                        <Text style={styles.badgeBadgeText}>{photographer.badge}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  currentBadgeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  badgeIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'white',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: 'white',
  },
  progressPercent: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 9999,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  badgesList: {
    gap: 12,
  },
  badgeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeCardLocked: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  badgeItemIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeItemContent: {
    flex: 1,
  },
  badgeLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badgeLevelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  badgeRequirements: {
    fontSize: 12,
    color: '#4b5563',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  achievementCardLocked: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementDescription: {
    fontSize: 10,
    color: '#4b5563',
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  benefitIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  benefitDescription: {
    fontSize: 10,
    color: '#4b5563',
    textAlign: 'center',
  },
  leaderboardCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leaderboardInfo: {
    flex: 1,
  },
  photographerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  photographerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  youBadge: {
    fontSize: 12,
    color: '#ea580c',
  },
  photographerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statText: {
    fontSize: 11,
    color: '#4b5563',
  },
  badgeBadge: {
    backgroundColor: '#f3e8ff',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  badgeBadgeText: {
    fontSize: 10,
    color: '#9333ea',
    fontWeight: '600',
  },
});
