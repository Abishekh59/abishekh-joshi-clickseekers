import { usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";

interface NavItem {
  name: string;
  icon: string;
  route: string;
  label: string;
}

const navItems: NavItem[] = [
  { name: "home", icon: "home-outline", route: "/role", label: "Home" },
  { name: "explore", icon: "search-outline", route: "/explore", label: "Explore" },
  { name: "login", icon: "person-outline", route: "/login", label: "Login" },
  { name: "about", icon: "information-circle-outline", route: "/about", label: "About" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (route === "/role") {
      return pathname === "/role" || pathname === "/";
    }
    return pathname === route || pathname?.startsWith(route);
  };

  return (
    <View
      style={[
        styles.navbar,
        {
          marginBottom: -insets.bottom,
          paddingBottom: Math.max(insets.bottom, 12) + 12,
          height: 60 + Math.max(insets.bottom, 12) // Ensure enough height
        }
      ]}
    >
      {navItems.map((item) => {
        const active = isActive(item.route);
        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            onPress={() => router.push(item.route as any)}
          >
            <Ionicons
              name={item.icon as any}
              size={24}
              color={active ? "#6BA6FF" : "#fff"}
            />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({

  navbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#000",
    paddingTop: 12,
    borderTopWidth: 0,
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navLabel: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#6BA6FF",
  },
});

