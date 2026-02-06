import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const navItems = [
  { route: '/Client/ClientDashboard', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
  { route: '/Client/ExplorePhotographers', icon: 'search-outline', activeIcon: 'search', label: 'Explore' },
  { route: '/Client/ClientBookings', icon: 'calendar-outline', activeIcon: 'calendar', label: 'Bookings' },
  { route: '/Client/ClientMessages', icon: 'chatbubble-outline', activeIcon: 'chatbubble', label: 'Chat' },
  { route: '/Client/ClientProfile', icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
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
            style={styles.navItem}
            onPress={() => router.push(item.route as any)}
          >
            <Ionicons
              name={(active ? item.activeIcon : item.icon) as any}
              size={26}
              color={active ? '#2563eb' : '#6b7280'}
              style={active ? styles.activeIcon : undefined}
            />
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
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
