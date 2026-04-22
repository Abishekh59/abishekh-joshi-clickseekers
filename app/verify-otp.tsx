import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { ThemedText } from "../components/themed-text";
import { apiService } from "../services/api";

const { width } = Dimensions.get("window");
const BOX_SIZE = (width - 100) / 6;

export default function VerifyOTP() {
  const Text = ThemedText;
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const role = (params.role as 'PHOTOGRAPHER' | 'CLIENT') || null;
  const flow = (params.flow as string) || 'registration'; // 'registration' or 'reset-password'

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) return Alert.alert("Wait", "Enter the 6-digit code");
    setLoading(true);
    try {
      // If password reset flow, verify first then navigate to reset-password screen
      if (flow === 'reset-password') {
        const res = await apiService.verifyPasswordResetOTP({ email, otp_code: otpCode });
        if (res.success) {
          router.push({
            pathname: "/reset-password",
            params: {
              email: email,
              otp_code: otpCode,
            },
          });
        }
        setLoading(false);
        return;
      }

      // Otherwise, it's registration flow
      const res = await apiService.verifyOTP({ email, otp_code: otpCode });
      if (res.success) {
        // Redirect based on user role (from params or response)
        const userRole = role || res.data?.role;
        if (userRole === "CLIENT" || userRole === "PHOTOGRAPHER") {
          Alert.alert("Success", "Registration completed! Please login.", [
            { text: "OK", onPress: () => router.replace("/login") }
          ]);
        } else {
          router.replace("/login");
        }
      }
    } catch {
      Alert.alert("Error", "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.safeArea}>
          {/* 1. Header Navigation */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verify Identity</Text>
            <View style={{ width: 40 }} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>


              <View style={styles.imageContainer}>
                <Image
                  source={require("../assets/images/forotpinput.png")}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              </View>

              {/* 3. Text Content */}
              <View style={styles.content}>
                <Text style={styles.title}>Check your mail</Text>
                <Text style={styles.subtitle}>
                  {"We've sent a code to "}
                  <Text style={styles.emailText}>{email || "your email"}</Text>
                </Text>

                {/* 4. OTP Row */}
                <View style={styles.otpRow}>
                  {otp.map((digit, i) => (
                    <View key={i} style={[styles.box, digit ? styles.boxActive : null]}>
                      <TextInput
                        ref={(ref) => { inputRefs.current[i] = ref; }}
                        style={styles.input}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        selectionColor="#FACC15"
                        onChangeText={(v) => handleOtpChange(v, i)}
                        onKeyPress={(e) => handleKeyPress(e, i)}
                      />
                    </View>
                  ))}
                </View>

                {/* 5. Verify Button */}
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleVerify}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify Account</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendBtn}>
                  <Text style={styles.resendText}>
                    {"Didn't get a code? "}
                    <Text style={styles.resendLink}>Resend</Text>
                  </Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 50,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  imageContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#000",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  emailText: {
    color: "#000",
    fontWeight: "700",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: '100%',
    marginTop: 35,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE + 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  boxActive: {
    borderColor: "#FACC15",
    backgroundColor: "#FFF",
  },
  input: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
    color: "#000",
  },
  button: {
    backgroundColor: "#000",
    width: '100%',
    height: 58,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  resendBtn: {
    marginTop: 25,
  },
  resendText: {
    color: "#71717a",
    fontSize: 14,
  },
  resendLink: {
    color: "#000",
    fontWeight: "700",
    textDecorationLine: 'underline'
  },
});