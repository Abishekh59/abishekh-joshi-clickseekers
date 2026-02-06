import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { apiService } from "../services/api";

export default function Register() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = (params.role as 'PHOTOGRAPHER' | 'CLIENT') || 'CLIENT';

  const [fullName, setFullName] = useState("");
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const nameValidation = validateFullName(fullName);
    if (nameValidation) {
      Alert.alert("Error", nameValidation);
      return;
    }
    const phoneValidation = validatePhone(phone);
    if (phoneValidation) {
      Alert.alert("Error", phoneValidation);
      return;
    }
    const emailValidation = validateEmail(email);
    setEmailError(emailValidation);
    if (emailValidation) {
      Alert.alert("Error", emailValidation);
      return;
    }
    const passwordValidation = validatePassword(password);
    setPasswordError(passwordValidation);
    if (passwordValidation) {
      Alert.alert("Error", passwordValidation);
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        role: role,
      });

      if (response.success) {
        Alert.alert(
          "Success",
          "OTP sent to your email. Please verify to complete registration.",
          [
            {
              text: "OK",
              onPress: () => {
                router.push({
                  pathname: "/verify-otp",
                  params: {
                    email: email.trim().toLowerCase(),
                    role: role
                  },
                });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const validateFullName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return "Please enter your full name";
    if (trimmed.length < 4) return "Full name must be at least 4 characters";
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return "Please enter at least first and last name";
    return null;
  };

  const validatePhone = (p: string) => {
    const trimmed = p.trim();
    if (!trimmed) return null; // phone optional — only validate when provided
    const normalized = trimmed.replace(/[\s-]/g, "");
    // allow optional leading + and 7-15 digits
    if (!/^\+?\d{7,15}$/.test(normalized)) return "Please enter a valid phone number";
    return null;
  };

  const validateEmail = (e: string) => {
    const trimmed = e.trim();
    if (!trimmed) return "Please enter your email address";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return "Please enter a valid email address";
    return null;
  };

  const validatePassword = (p: string) => {
    if (!p) return "Please enter a password";
    if (p.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
            />
          </View>


          <Text style={styles.title}>
            Create Your <Text style={styles.highlight}>ClickSeekers</Text> Account
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Subtitle (role-specific) */}
          <Text style={styles.subtitle}>
            {role === 'PHOTOGRAPHER'
              ? 'Sign up and start building your photography career with trusted clients.'
              : 'Start your journey — hire the right photographer in just a few clicks.'}
          </Text>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                placeholder="Click Seekers"
                placeholderTextColor="#999"
                style={[styles.input, fullNameError ? styles.inputError : null]}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  setFullNameError(validateFullName(text));
                }}
                editable={!loading}
                autoCapitalize="words"
              />
              {fullNameError ? (
                <Text style={styles.fieldErrorText}>{fullNameError}</Text>
              ) : null}
            </View>

            {/* Phone Number */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                placeholder="9815025634"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  setPhoneError(validatePhone(text));
                }}
                editable={!loading}
              />
              {phoneError ? (
                <Text style={styles.fieldErrorText}>{phoneError}</Text>
              ) : null}
            </View>

            {/* Email Address */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                placeholder="clickseekersofficial@gmail.com"
                placeholderTextColor="#999"
                style={[styles.input, emailError ? styles.inputError : null]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  const sanitized = text.replace(/\s+/g, "");
                  setEmail(sanitized);
                  setEmailError(validateEmail(sanitized));
                }}
                onFocus={() => setEmailError(validateEmail(email))}
                editable={!loading}
              />
              {emailError ? (
                <Text style={styles.fieldErrorText}>{emailError}</Text>
              ) : null}
            </View>

            {/* Password */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordContainer, passwordError ? styles.inputError : null]}>
                <TextInput
                  placeholder="**********"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(text) => {
                    const sanitized = text.replace(/^\s+/, "");
                    setPassword(sanitized);
                    setPasswordError(validatePassword(sanitized));
                  }}
                  onFocus={() => setPasswordError(validatePassword(password))}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text style={styles.fieldErrorText}>{passwordError}</Text>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomSection}>
          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.registerButtonText}>Register Now</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/login", params: { role } })}
              disabled={loading}
            >
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 20,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginBottom: 8,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#000000",
    marginBottom: 8,
  },
  highlight: {
    color: "#4A90E2",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginBottom: 10,
  },
  subtitle: {
    color: "#666666",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  form: {
    marginBottom: 12,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 46,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#000000",
  },
  inputError: {
    borderColor: "#4A90E2",
  },
  fieldErrorText: {
    color: "#4A90E2",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 0,
  },
  helperTextSlot: {
    height: 22,
    marginTop: 6,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 46,
    backgroundColor: "#FFFFFF",
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  eyeButton: {
    padding: 4,
  },
  registerButton: {
    width: "100%",
    height: 50,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#101920",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 2,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  registerButtonText: {
    color: "#101920",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginLinkText: {
    color: "#000000",
    fontSize: 14,
  },
  loginLink: {
    color: "#4A90E2",
    fontSize: 14,
    fontWeight: "600",
  },
});
