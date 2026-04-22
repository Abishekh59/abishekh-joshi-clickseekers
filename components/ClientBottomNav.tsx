import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';

const navItems = [
  { route: '/Client/ClientDashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard', label: 'Dashboard', library: 'MaterialCommunityIcons', testID: 'client-nav-dashboard' },
  { route: '/Client/ExplorePhotographers', icon: 'search-outline', activeIcon: 'search', label: 'Explore', library: 'Ionicons', testID: 'client-nav-explore' },
  { route: '/Client/ClientBookings', icon: 'calendar-today', activeIcon: 'calendar-today', label: 'Bookings', library: 'MaterialCommunityIcons', testID: 'client-nav-bookings' },
  { route: '/Client/ClientMessages', icon: 'chatbox-ellipses-outline', activeIcon: 'chatbox-ellipses', label: 'Chat', library: 'Ionicons', testID: 'client-nav-chat' },
  { route: '/Client/ClientProfile', icon: 'person-outline', activeIcon: 'person', label: 'Profile', library: 'Ionicons', testID: 'client-nav-profile' },
];

export default function ClientBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.navBar}>
      {navItems.map((item) => {
        // Simple but effective matching
        const active = pathname === item.route;

        return (
          <TouchableOpacity
            key={item.route}
            testID={item.testID}
            style={styles.navItem}
            onPress={() => router.push(item.route as any)}
          >
            {item.library === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons
                name={(active ? item.activeIcon : item.icon) as any}
                size={26}
                color={active ? '#2563eb' : '#6b7280'}
                style={active ? styles.activeIcon : undefined}
              />
            ) : (
              <Ionicons
                name={(active ? item.activeIcon : item.icon) as any}
                size={26}
                color={active ? '#2563eb' : '#6b7280'}
                style={active ? styles.activeIcon : undefined}
              />
            )}
            <ThemedText style={[styles.label, active && styles.activeLabel]}>{item.label}</ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 8,
    paddingTop: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  activeLabel: {
    color: '#2563eb',
    fontWeight: '700',
  },
  activeIcon: {
    // Optionally add shadow or scale for active icon
  },
});
