import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PhotographerDashboard {
  onNavigate?: (screen: string) => void;
  onBack?: () => void;
}

export default function PhotographerDashboard({ onNavigate, onBack }: PhotographerDashboard) {
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
    success: successColor,
    error: errorColor,
    white,
    info
  } = useAppTheme();

  const analytics = {
    profileViews: {
      total: 1248,
      change: 12.5,
      trend: 'up',
      period: 'vs last month'
    },
    bookingRate: {
      total: 68,
      change: 5.3,
      trend: 'up',
      period: 'vs last month'
    },
    avgBookingValue: {
      total: 28500,
      change: -2.1,
      trend: 'down',
      period: 'vs last month'
    },
    responseTime: {
      total: '2.4 hrs',
      change: 8.2,
      trend: 'down',
      period: 'vs last month'
    }
  };

  const monthlyData = [
    { month: 'Jul', bookings: 8, revenue: 240000, views: 856 },
    { month: 'Aug', bookings: 12, revenue: 360000, views: 982 },
    { month: 'Sep', bookings: 10, revenue: 285000, views: 1043 },
    { month: 'Oct', bookings: 15, revenue: 450000, views: 1156 },
    { month: 'Nov', bookings: 14, revenue: 420000, views: 1189 },
    { month: 'Dec', bookings: 16, revenue: 480000, views: 1248 }
  ];

  const topPerformingServices = [
    { service: 'Wedding Photography', bookings: 45, revenue: 1800000, avgRating: 4.9 },
    { service: 'Event Photography', bookings: 28, revenue: 840000, avgRating: 4.8 },
    { service: 'Portrait Photography', bookings: 15, revenue: 450000, avgRating: 5.0 }
  ];

  const peakHours = [
    { time: '10 AM - 12 PM', bookings: 23 },
    { time: '2 PM - 4 PM', bookings: 18 },
    { time: '4 PM - 6 PM', bookings: 15 }
  ];

  const customerInsights = {
    repeatCustomers: 32,
    avgReviewScore: 4.9,
    responseRate: 95,
    completionRate: 98
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 20, backgroundColor: '#1e293b' }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <ThemedText type="2xl" weight="bold" style={{ color: 'white' }}>
                Analytics
              </ThemedText>
              <ThemedText type="sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Track your performance
              </ThemedText>
            </View>
          </View>

          {/* Time Period Selector */}
          <View style={styles.periodSelector}>
            {['7 Days', '30 Days', '3 Months', '1 Year'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodButton, period === '30 Days' && { backgroundColor: 'white' }]}
              >
                <ThemedText
                  type="xs"
                  weight="semibold"
                  style={{ color: period === '30 Days' ? '#1e293b' : 'rgba(255, 255, 255, 0.7)' }}
                >
                  {period}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.content}>
          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            {/* Profile Views */}
            <View style={[styles.metricCard, { backgroundColor: background }]}>
              <View style={styles.metricHeader}>
                <Ionicons name="eye-outline" size={20} color="#6366f1" />
                <ThemedText type="xs" weight="medium" style={{ color: gray600 }}>
                  Profile Views
                </ThemedText>
              </View>
              <ThemedText type="3xl" weight="bold" style={{ color: gray900, marginBottom: 8 }}>
                {analytics.profileViews.total.toLocaleString()}
              </ThemedText>
              <View style={styles.metricChange}>
                <Ionicons
                  name={analytics.profileViews.trend === 'up' ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={analytics.profileViews.trend === 'up' ? successColor : errorColor}
                />
                <ThemedText
                  type="xs"
                  weight="semibold"
                  style={{ color: analytics.profileViews.trend === 'up' ? successColor : errorColor }}
                >
                  {analytics.profileViews.change}% {analytics.profileViews.period}
                </ThemedText>
              </View>
            </View>

            {/* Booking Rate */}
            <View style={[styles.metricCard, { backgroundColor: background }]}>
              <View style={styles.metricHeader}>
                <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
                <ThemedText type="xs" weight="medium" style={{ color: gray600 }}>
                  Booking Rate
                </ThemedText>
              </View>
              <ThemedText type="3xl" weight="bold" style={{ color: gray900, marginBottom: 8 }}>
                {analytics.bookingRate.total}%
              </ThemedText>
              <View style={styles.metricChange}>
                <Ionicons
                  name={analytics.bookingRate.trend === 'up' ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={analytics.bookingRate.trend === 'up' ? successColor : errorColor}
                />
                <ThemedText
                  type="xs"
                  weight="semibold"
                  style={{ color: analytics.bookingRate.trend === 'up' ? successColor : errorColor }}
                >
                  {analytics.bookingRate.change}% {analytics.bookingRate.period}
                </ThemedText>
              </View>
            </View>

            {/* Avg Booking Value */}
            <View style={[styles.metricCard, { backgroundColor: background }]}>
              <View style={styles.metricHeader}>
                <Ionicons name="cash-outline" size={20} color="#ec4899" />
                <ThemedText type="xs" weight="medium" style={{ color: gray600 }}>
                  Avg Booking Value
                </ThemedText>
              </View>
              <ThemedText type="3xl" weight="bold" style={{ color: gray900, marginBottom: 8 }}>
                ₹{analytics.avgBookingValue.total.toLocaleString()}
              </ThemedText>
              <View style={styles.metricChange}>
                <Ionicons
                  name={analytics.avgBookingValue.trend === 'up' ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={analytics.avgBookingValue.trend === 'up' ? successColor : errorColor}
                />
                <ThemedText
                  type="xs"
                  weight="semibold"
                  style={{ color: analytics.avgBookingValue.trend === 'up' ? successColor : errorColor }}
                >
                  {Math.abs(analytics.avgBookingValue.change)}% {analytics.avgBookingValue.period}
                </ThemedText>
              </View>
            </View>

            {/* Response Time */}
            <View style={[styles.metricCard, { backgroundColor: background }]}>
              <View style={styles.metricHeader}>
                <Ionicons name="time-outline" size={20} color="#f59e0b" />
                <ThemedText type="xs" weight="medium" style={{ color: gray600 }}>
                  Response Time
                </ThemedText>
              </View>
              <ThemedText type="3xl" weight="bold" style={{ color: gray900, marginBottom: 8 }}>
                {analytics.responseTime.total}
              </ThemedText>
              <View style={styles.metricChange}>
                <Ionicons
                  name={analytics.responseTime.trend === 'up' ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={analytics.responseTime.trend === 'down' ? successColor : errorColor}
                />
                <ThemedText
                  type="xs"
                  weight="semibold"
                  style={{ color: analytics.responseTime.trend === 'down' ? successColor : errorColor }}
                >
                  {analytics.responseTime.change}% faster
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Monthly Performance Chart */}
          <View style={styles.section}>
            <ThemedText type="lg" weight="bold" style={{ color: gray900, marginBottom: 16 }}>
              Monthly Performance
            </ThemedText>
            <View style={[styles.chartContainer, { backgroundColor: background }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chart}>
                  {monthlyData.map((data, index) => {
                    const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
                    const barHeight = (data.revenue / maxRevenue) * 150;

                    return (
                      <View key={index} style={styles.barContainer}>
                        <View style={styles.barWrapper}>
                          <View style={[styles.bar, { height: barHeight, backgroundColor: '#6366f1' }]}>
                            <ThemedText type="xs" weight="semibold" style={{ color: 'white', paddingTop: 4 }}>
                              ₹{(data.revenue / 1000).toFixed(0)}K
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText type="xs" weight="semibold" style={{ color: gray900, marginTop: 4 }}>
                          {data.month}
                        </ThemedText>
                        <ThemedText type="xs" style={{ color: gray500 }}>
                          {data.bookings} bookings
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Top Performing Services */}
          <View style={styles.section}>
            <ThemedText type="lg" weight="bold" style={{ color: gray900, marginBottom: 16 }}>
              Top Performing Services
            </ThemedText>
            {topPerformingServices.map((service, index) => (
              <View key={index} style={[styles.serviceCard, { backgroundColor: background }]}>
                <View style={styles.serviceHeader}>
                  <ThemedText type="base" weight="semibold" style={{ color: gray900, flex: 1 }}>
                    {service.service}
                  </ThemedText>
                  <View style={[styles.ratingBadge, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="star" size={12} color="#fbbf24" />
                    <ThemedText type="xs" weight="semibold" style={{ color: '#92400e' }}>
                      {service.avgRating}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.serviceStats}>
                  <View style={styles.serviceStat}>
                    <ThemedText type="xs" style={{ color: gray600, marginBottom: 4 }}>
                      Bookings
                    </ThemedText>
                    <ThemedText type="lg" weight="bold" style={{ color: gray900 }}>
                      {service.bookings}
                    </ThemedText>
                  </View>
                  <View style={styles.serviceStat}>
                    <ThemedText type="xs" style={{ color: gray600, marginBottom: 4 }}>
                      Revenue
                    </ThemedText>
                    <ThemedText type="lg" weight="bold" style={{ color: gray900 }}>
                      ₹{(service.revenue / 1000).toFixed(0)}K
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Peak Hours */}
          <View style={styles.section}>
            <ThemedText type="lg" weight="bold" style={{ color: gray900, marginBottom: 16 }}>
              Peak Booking Hours
            </ThemedText>
            {peakHours.map((hour, index) => {
              const maxBookings = Math.max(...peakHours.map(h => h.bookings));
              const percentage = (hour.bookings / maxBookings) * 100;

              return (
                <View key={index} style={styles.peakHourRow}>
                  <ThemedText type="sm" weight="medium" style={{ color: gray900, width: 100 }}>
                    {hour.time}
                  </ThemedText>
                  <View style={[styles.peakHourBar, { backgroundColor: '#f1f5f9' }]}>
                    <View style={[styles.peakHourFill, { width: `${percentage}%`, backgroundColor: '#8b5cf6' }]} />
                    <ThemedText type="xs" weight="semibold" style={{ color: gray900, marginLeft: 8 }}>
                      {hour.bookings}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Customer Insights */}
          <View style={styles.section}>
            <ThemedText type="lg" weight="bold" style={{ color: gray900, marginBottom: 16 }}>
              Customer Insights
            </ThemedText>
            <View style={styles.insightsGrid}>
              <View style={[styles.insightCard, { backgroundColor: background }]}>
                <ThemedText type="3xl" weight="bold" style={{ color: gray900, marginBottom: 4 }}>
                  {customerInsights.repeatCustomers}%
                </ThemedText>
                <ThemedText type="xs" style={{ color: gray600, textAlign: 'center' }}>
                  Repeat Customers
                </ThemedText>
              </View>
              <View style={[styles.insightCard, { backgroundColor: background }]}>
                <ThemedText type="3xl" weight="bold" style={{ color: gray900, marginBottom: 4 }}>
                  {customerInsights.avgReviewScore}
                </ThemedText>
                <ThemedText type="xs" style={{ color: gray600, textAlign: 'center' }}>
                  Avg Review Score
                </ThemedText>
              </View>
              <View style={[styles.insightCard, { backgroundColor: background }]}>
                <ThemedText type="3xl" weight="bold" style={{ color: gray900, marginBottom: 4 }}>
                  {customerInsights.responseRate}%
                </ThemedText>
                <ThemedText type="xs" style={{ color: gray600, textAlign: 'center' }}>
                  Response Rate
                </ThemedText>
              </View>
              <View style={[styles.insightCard, { backgroundColor: background }]}>
                <ThemedText type="3xl" weight="bold" style={{ color: gray900, marginBottom: 4 }}>
                  {customerInsights.completionRate}%
                </ThemedText>
                <ThemedText type="xs" style={{ color: gray600, textAlign: 'center' }}>
                  Completion Rate
                </ThemedText>
              </View>
            </View>
          </View>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    marginBottom: 24,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    paddingVertical: 8,
  },
  barContainer: {
    alignItems: 'center',
    width: 60,
  },
  barWrapper: {
    height: 150,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 40,
    borderRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  serviceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceStats: {
    flexDirection: 'row',
    gap: 24,
  },
  serviceStat: {
    flex: 1,
  },
  peakHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  peakHourBar: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  peakHourFill: {
    height: '100%',
    borderRadius: 8,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
