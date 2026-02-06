import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface AdminDashboardProps {
  onNavigate?: (screen: string) => void;
  onLogout: () => void;
}

export default function AdminDashboard({ onNavigate, onLogout }: AdminDashboardProps) {
  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray500 = useThemeColor({}, 'gray500');
  const primary = useThemeColor({}, 'primary');
  const background = useThemeColor({}, 'background');
  const errorColor = useThemeColor({}, 'error');
  const successColor = useThemeColor({}, 'success');

  const stats = {
    totalUsers: 1248,
    clients: 890,
    photographers: 358,
    pendingKYC: 23,
    activeBookings: 156,
    completedBookings: 3420,
    totalRevenue: 8500000,
    thisMonthRevenue: 950000,
    pendingReports: 8,
    flaggedContent: 5
  };

  const quickActions = [
    { title: 'User Management', description: 'Manage users & KYC', icon: 'people-outline', color: '#2563eb', action: () => onNavigate?.('/admin/users') },
    { title: 'Portfolio Moderation', description: 'Review portfolios', icon: 'camera-outline', color: '#7c3aed', action: () => onNavigate?.('/admin/portfolio-moderation') },
    { title: 'Review Moderation', description: 'Moderate reviews', icon: 'alert-circle-outline', color: '#ea580c', action: () => onNavigate?.('/admin/review-moderation') },
    { title: 'Reports & Disputes', description: 'Handle reports', icon: 'alert-circle-outline', color: '#ef4444', action: () => onNavigate?.('/admin/reports') },
    { title: 'Design System', description: 'View style guide', icon: 'color-palette-outline', color: '#6366f1', action: () => onNavigate?.('style-guide') }
  ];

  const recentActivities = [
    { id: 1, type: 'kyc', user: 'Rajesh Sharma', action: 'KYC verification approved', time: '5 min ago' },
    { id: 2, type: 'booking', user: 'Sita Thapa', action: 'New booking created', time: '15 min ago' },
    { id: 3, type: 'report', user: 'Ram Gurung', action: 'Reported inappropriate content', time: '1 hour ago' },
    { id: 4, type: 'review', user: 'Maya Karki', action: 'Posted a 5-star review', time: '2 hours ago' }
  ];

  return (
    <View style={[styles.container, { backgroundColor: '#f9fafb' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#7c3aed' }]}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="xl" weight="extrabold" style={{ color: '#fff' }}>Admin Dashboard</ThemedText>
            <ThemedText type="sm" weight="bold" style={{ color: '#e9d5ff', marginTop: 2 }}>ClickSeekers Management</ThemedText>
          </View>
          <TouchableOpacity onPress={onLogout} style={[styles.logoutBtn, { backgroundColor: '#a78bfa' }]}>
            <Icon name="log-out-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main stats */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="people-outline"
            iconColor="#2563eb"
            label="Total Users"
            value={stats.totalUsers}
            meta={`${stats.clients} Clients | ${stats.photographers} Photographers`}
          />
          <StatCard
            icon="calendar-outline"
            iconColor="#22c55e"
            label="Bookings"
            value={stats.activeBookings}
            meta={`${stats.completedBookings} completed`}
          />
          <StatCard
            icon="cash-outline"
            iconColor="#7c3aed"
            label="Revenue"
            value={`NPR ${(stats.totalRevenue / 1000000).toFixed(1)}M`}
            meta={`NPR ${(stats.thisMonthRevenue / 1000).toFixed(0)}k this month`}
          />
          <StatCard
            icon="alert-circle-outline"
            iconColor="#ea580c"
            label="Pending"
            value={stats.pendingKYC}
            meta={`KYC verifications`}
          />
        </View>

        {/* Alerts */}
        {(stats.pendingReports > 0 || stats.flaggedContent > 0) && (
          <View style={[styles.alertCard, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
            <View style={styles.alertRow}>
              <Icon name="alert-circle-outline" size={28} color={errorColor} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <ThemedText type="base" weight="extrabold" style={{ color: errorColor }}>Action Required</ThemedText>
                {stats.pendingReports > 0 && <ThemedText type="sm" weight="bold" style={{ color: errorColor, marginTop: 4 }}>• {stats.pendingReports} pending reports to review</ThemedText>}
                {stats.flaggedContent > 0 && <ThemedText type="sm" weight="bold" style={{ color: errorColor, marginTop: 2 }}>• {stats.flaggedContent} flagged content items</ThemedText>}
              </View>
              <TouchableOpacity onPress={() => onNavigate?.('/admin/reports')} style={[styles.reviewBtn, { backgroundColor: errorColor }]}>
                <ThemedText type="sm" weight="extrabold" style={{ color: '#fff' }}>Review</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <ThemedText type="base" weight="extrabold" style={{ color: gray900, marginBottom: 12, marginTop: 8 }}>Quick Actions</ThemedText>
        <div style={styles.quickActionsGrid}>
          {quickActions.map((action, idx) => (
            <TouchableOpacity key={idx} onPress={action.action} style={[styles.quickActionCard, { backgroundColor: background }]}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: action.color + '22' }]}>
                <Icon name={action.icon} size={28} color={action.color} />
              </View>
              <ThemedText type="sm" weight="extrabold" style={{ color: gray900 }}>{action.title}</ThemedText>
              <ThemedText type="xs" weight="bold" style={{ color: gray500, marginTop: 2 }}>{action.description}</ThemedText>
            </TouchableOpacity>
          ))}
        </div>

        {/* Recent Activities */}
        <View style={[styles.card, { backgroundColor: background }]}>
          <ThemedText type="base" weight="extrabold" style={{ color: gray900, marginBottom: 12 }}>Recent Activities</ThemedText>
          {recentActivities.map((activity) => (
            <View key={activity.id} style={[styles.activityRow, { borderBottomColor: '#f3f4f6' }]}>
              <View style={[styles.activityDot, {
                backgroundColor:
                  activity.type === 'kyc' ? '#22c55e' :
                    activity.type === 'booking' ? '#2563eb' :
                      activity.type === 'report' ? '#ef4444' : '#eab308'
              }]} />
              <View style={{ flex: 1 }}>
                <ThemedText type="sm" weight="bold" style={{ color: gray900 }}>{activity.action}</ThemedText>
                <ThemedText type="xs" weight="bold" style={{ color: gray500, marginTop: 2 }}>{activity.user} • {activity.time}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* System Health */}
        <View style={[styles.card, { backgroundColor: background }]}>
          <ThemedText type="base" weight="extrabold" style={{ color: gray900, marginBottom: 12 }}>System Health</ThemedText>
          <View style={styles.healthRow}>
            <ThemedText type="sm" weight="bold" style={{ color: gray700 }}>Server Status</ThemedText>
            <View style={[styles.healthBadge, { backgroundColor: '#bbf7d0' }]}>
              <ThemedText type="xs" weight="extrabold" style={{ color: successColor }}>● Online</ThemedText>
            </View>
          </View>
          <View style={styles.healthRow}>
            <ThemedText type="sm" weight="bold" style={{ color: gray700 }}>Database</ThemedText>
            <View style={[styles.healthBadge, { backgroundColor: '#bbf7d0' }]}>
              <ThemedText type="xs" weight="extrabold" style={{ color: successColor }}>● Healthy</ThemedText>
            </View>
          </View>
          <View style={styles.healthRow}>
            <ThemedText type="sm" weight="bold" style={{ color: gray700 }}>Payment Gateway</ThemedText>
            <View style={[styles.healthBadge, { backgroundColor: '#bbf7d0' }]}>
              <ThemedText type="xs" weight="extrabold" style={{ color: successColor }}>● Active</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, iconColor, label, value, meta }: { icon: string; iconColor: string; label: string; value: any; meta?: string }) {
  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray500 = useThemeColor({}, 'gray500');
  const background = useThemeColor({}, 'background');

  return (
    <View style={[styles.statCard, { backgroundColor: background }]}>
      <View style={styles.statCardRow}>
        <Icon name={icon} size={22} color={iconColor} style={{ marginRight: 8 }} />
        <ThemedText type="sm" weight="bold" style={{ color: gray700 }}>{label}</ThemedText>
      </View>
      <ThemedText type="xl" weight="extrabold" style={{ color: gray900, marginTop: 4 }}>{value}</ThemedText>
      {meta && <ThemedText type="xs" weight="bold" style={{ color: gray500, marginTop: 2 }}>{meta}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  logoutBtn: { padding: 8, borderRadius: 10 },
  content: { paddingHorizontal: 24, paddingVertical: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  statCard: { borderRadius: 18, padding: 16, flexBasis: '48%', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statCardRow: { flexDirection: 'row', alignItems: 'center' },
  alertCard: { borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 2 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start' },
  reviewBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  quickActionCard: { borderRadius: 16, padding: 14, flexBasis: '48%', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  quickActionIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  card: { borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 8 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 8 },
  healthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  healthBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
});