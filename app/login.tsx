import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../components/themed-text";
import Ionicons from "react-native-vector-icons/Ionicons";
import { apiService } from "../services/api";
import { storage } from "../utils/storage";

const { width, height } = Dimensions.get("window");

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = (params.role as "PHOTOGRAPHER" | "CLIENT") || "CLIENT";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter your credentials");
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.login({
        email: email.trim().toLowerCase(),
        password,
      });

      // Backends sometimes omit a `success` flag, so fall back to the presence of token + user
      const payload = (response as any)?.data ?? response;
      const token = (payload as any)?.token;
      const user = (payload as any)?.user;

      if (token) {
        await storage.saveToken(token);
        // Decode JWT
        let decodedUser: any = {};
        try {
          decodedUser = jwtDecode(token);
        } catch (e) {
          decodedUser = {};
        }

        const finalUser = {
          ...(user || {}),
          ...decodedUser,
        };
        await storage.saveUser(finalUser);

        // Fetch and store KYC status as well
        try {
          const kycRes = await apiService.getKycStatus(token);
          if (kycRes && kycRes.data) {
            await AsyncStorage.setItem(
              "@clickseekers_kyc_status",
              JSON.stringify(kycRes.data),
            );
          } else {
            await AsyncStorage.removeItem("@clickseekers_kyc_status");
          }
        } catch (e) {
          // If error, clear any old KYC status
          await AsyncStorage.removeItem("@clickseekers_kyc_status");
        }

        if (decodedUser.role === "PHOTOGRAPHER") {
          // Initialize socket connection and join room
          const { socketService } = await import("../services/socket");
          socketService.connect(token);
          socketService.emit('join_room', decodedUser.user_id);

          router.replace("../Photographer/PhotographerDashboard");
        } else if (decodedUser.role === "CLIENT") {
          // Initialize socket connection and join room
          const { socketService } = await import("../services/socket");
          socketService.connect(token);
          socketService.emit('join_room', decodedUser.user_id);

          router.replace("../Client/ClientDashboard");
        } else if (decodedUser.role === "ADMIN") {
          // Initialize socket connection and join room
          const { socketService } = await import("../services/socket");
          socketService.connect(token);
          socketService.emit('join_room', decodedUser.user_id);

          router.replace("../Admin/AdminDashboard");
        } else {
          router.replace("/");
        }
        return;
      }

      const failureMessage =
        (response as any)?.message || "Unable to login. Please try again.";
      Alert.alert("Login Failed", failureMessage);
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Section (Black) */}
      <View style={styles.headerBackground}>
        <View>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
            />
          </View>
        </View>
      </View>

      {/* 2. Form Body (White Card) */}
      <View style={styles.formContainer}>
        <ScrollView
          testID="login-scroll-view"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={styles.title}>Welcome back!</ThemedText>
          <ThemedText style={styles.subtitle}>
            Sign in to your {role.toLowerCase()} account
          </ThemedText>

          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                testID="email-input"
                placeholder="Email Address"
                placeholderTextColor="#999"
                style={styles.input}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.passwordFieldContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  testID="password-input"
                  placeholder="Password"
                  placeholderTextColor="#999"
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIconButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="forgot-password-link"
              style={styles.forgotBtn}
              onPress={() => router.push("/forgot-password")}
            >
              <ThemedText style={styles.forgotText}>Forgot Password?</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              testID="login-button"
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <ThemedText style={styles.loginButtonText}>Login</ThemedText>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>New to ClickSeekers? </ThemedText>
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: "/register", params: { role } })
                }
              >
                <ThemedText style={styles.registerLink}>Register Now</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  headerBackground: {
    height: height * 0.35, // Top 35% of the screen is black
    justifyContent: "center",
    backgroundColor: "#000",
  },
  backBtn: {
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 25,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    tintColor: "#FFF",
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -20,
    paddingTop: 10,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#000",
    textAlign: "left",
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: "#777",
    marginTop: 5,
    marginBottom: 30,
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 15,
    paddingHorizontal: 18,
    height: 60,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  passwordFieldContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  eyeIconButton: {
    padding: 10,
    marginRight: -10,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 30,
  },
  forgotText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#FFFFFF",
    height: 50,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#101920",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  loginButtonText: {
    color: "#101920",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  footerText: {
    color: "#777",
    fontSize: 15,
  },
  registerLink: {
    color: "#4A90E2",
    fontSize: 15,
    fontWeight: "500",
  },
});
