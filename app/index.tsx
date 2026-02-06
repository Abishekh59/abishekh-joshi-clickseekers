import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { socketService } from "../services/socket";
import { storage } from "../utils/storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get("window");

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await storage.getToken();
        const user = await storage.getUser();
        if (token && user) {
          socketService.connect(token);
          socketService.emit('join_room', user.user_id);
          if (user.role === "PHOTOGRAPHER") {
            router.replace("/Photographer/PhotographerDashboard");
          } else if (user.role === "CLIENT") {
            router.replace("/Client/ClientDashboard");
          }
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  if (checkingAuth) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6BA6FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status bar overlays content */}
      <StatusBar translucent backgroundColor="transparent" />

      <ImageBackground
        source={require("../assets/images/mountain.jpg")}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Dark overlay */}
        <View style={styles.overlay} />

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
            />

            <Text style={styles.title}>
              Click<Text style={styles.titleBlue}>Seekers</Text>
            </Text>

            <Text style={styles.subtitle}>
              Connect with talented photographers{"\n"}
              and capture your perfect moments
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.getStartedBtn}
              onPress={() => router.push("/role")}
            >
              <Text style={styles.getStartedText}>Get Started ➜</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push("/")}
            >
              <Text style={styles.exploreText}>Explore Photographers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Image */}
        <View style={styles.bottomImageContainer}>
          <Image
            source={require("../assets/images/handcam.png")}
            style={styles.bottomImage}
            resizeMode="contain"
          />
        </View>
      </ImageBackground>
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
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },

  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40, // notch-safe
  },

  logoContainer: {
    alignItems: "center",
  },

  logo: {
    width: 90,
    height: 90,
    resizeMode: "contain",
  },

  title: {
    color: "#fff",
    fontSize: 32,
    marginTop: 10,
    fontWeight: "700",
  },

  titleBlue: {
    color: "#6BA6FF",
  },

  subtitle: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },

  buttonsContainer: {
    alignItems: "center",
    marginTop: 30,
  },

  getStartedBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 30,
    marginBottom: 15,
  },

  getStartedText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  exploreBtn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
  },

  exploreText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },

  bottomImageContainer: {
    position: "absolute",
    bottom: -50,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  bottomImage: {
    width: "100%",
    height: 320,
  },
});
