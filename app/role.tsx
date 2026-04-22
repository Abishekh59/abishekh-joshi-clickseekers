import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  ImageBackground,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../components/themed-text";
import Ionicons from "react-native-vector-icons/Ionicons";
import Navbar from "../components/navbar";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get("window");

export default function Role() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <ImageBackground
        source={require("../assets/images/backdrop_for_role_page.png")}
        style={[styles.background, { backgroundColor: '#1e3a8a' }]}
        resizeMode="stretch"
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Join ClickSeekers</ThemedText>
          <ThemedText style={styles.subtitle}>
            Choose how you'd like to use our platform
          </ThemedText>
        </View>

        {/* Photographer */}
        <TouchableOpacity
          testID="photographer-role-button"
          style={styles.card}
          onPress={() => router.push({
            pathname: "/register",
            params: { role: "PHOTOGRAPHER" }
          })}
        >
          <View style={styles.iconBox}>
            <Ionicons name="camera-outline" size={30} color="#000" />
          </View>
          <View>
            <ThemedText style={styles.cardTitle}>I'm a Photographer</ThemedText>
            <ThemedText style={styles.cardText}>
              Showcase your work and get booked
            </ThemedText>
          </View>
        </TouchableOpacity>

        {/* Client */}
        <TouchableOpacity
          testID="client-role-button"
          style={styles.card}
          onPress={() => router.push({
            pathname: "/register",
            params: { role: "CLIENT" }
          })}
        >
          <View style={styles.iconBox}>
            <Ionicons name="person-outline" size={30} color="#000" />
          </View>
          <View>
            <ThemedText style={styles.cardTitle}>I need a Photographer</ThemedText>
            <ThemedText style={styles.cardText}>
              Find and book talented photographers
            </ThemedText>
          </View>
        </TouchableOpacity>
      </ImageBackground>
      <Navbar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 80,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: "600",
    color: "#fff",
    lineHeight: 38,
  },
  subtitle: {
    color: "#fff",
    fontSize: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  iconBox: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: "#f1f1f1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  cardText: {
    color: "#666",
    marginTop: 4,
    fontSize: 14,
  },
});
