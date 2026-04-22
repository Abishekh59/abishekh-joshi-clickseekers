import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type TabId = 'dashboard' | 'bookings' | 'chat' | 'portfolio' | 'profile';

interface NavItem {
  id: TabId;
  name: TabId;
  icon: string;
  activeIcon: string;
  label: string;
  library: 'Ionicons' | 'MaterialCommunityIcons';
}

interface PhotographerNavbarProps {
  activeTab: TabId;
  onTabPress: (tabId: TabId) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', name: 'dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard', label: 'Dashboard', library: 'MaterialCommunityIcons' },
  { id: 'bookings', name: 'bookings', icon: 'calendar-today', activeIcon: 'calendar-today', label: 'Bookings', library: 'MaterialCommunityIcons' },
  { id: 'chat', name: 'chat', icon: 'chatbox-ellipses-outline', activeIcon: 'chatbox-ellipses', label: 'Chat', library: 'Ionicons' },
  { id: 'portfolio', name: 'portfolio', icon: 'camera-outline', activeIcon: 'camera', label: 'Portfolio', library: 'Ionicons' },
  { id: 'profile', name: 'profile', icon: 'person-outline', activeIcon: 'person', label: 'Profile', library: 'Ionicons' },
];

export default function PhotographerNavbar({ activeTab, onTabPress }: PhotographerNavbarProps) {
  return (
    <View style={styles.navbar}>
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            testID={"nav-tab-" + item.id}
            style={styles.navItem}
            onPress={() => onTabPress(item.id)}
            activeOpacity={0.95}
          >
            {item.library === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons
                name={(isActive ? item.activeIcon : item.icon) as any}
                size={24}
                color={isActive ? '#2563eb' : '#9ca3af'}
              />
            ) : (
              <Ionicons
                name={(isActive ? item.activeIcon : item.icon) as any}
                size={24}
                color={isActive ? '#2563eb' : '#9ca3af'}
              />
            )}
            <ThemedText style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 50,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
    minWidth: 0,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  navLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
