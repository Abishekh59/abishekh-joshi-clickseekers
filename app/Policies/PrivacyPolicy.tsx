import React from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '../../components/themed-text';
import { useThemeColor } from '../../hooks/use-theme-color';

export default function PrivacyPolicy() {
  const router = useRouter();
  const background = useThemeColor({}, 'background');
  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray600 = useThemeColor({}, 'gray600');
  const primary = useThemeColor({}, 'primary');
  const cardBg = useThemeColor({}, 'background');

  const Section = ({ title, content, icon }: { title: string; content: string; icon: string }) => (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: '#e2e8f0' }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
          <Ionicons name={icon as any} size={20} color="#16a34a" />
        </View>
        <ThemedText type="base" weight="extrabold" style={{ color: gray900 }}>{title}</ThemedText>
      </View>
      <ThemedText type="sm" weight="medium" style={{ color: gray700, lineHeight: 22 }}>{content}</ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={gray900} />
        </TouchableOpacity>
        <ThemedText type="xl" weight="bold" style={{ color: gray900 }}>Privacy Policy</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText type="sm" weight="medium" style={{ color: gray600, marginBottom: 24, textAlign: 'center' }}>
          Your privacy is important to us. Here's how we protect your data.
        </ThemedText>

        <Section 
          icon="shield-outline"
          title="1. Data Collection" 
          content="We collect personal identifiers seperti name, email, and profiles to provide our services. We also collect usage data to improve application performance."
        />

        <Section 
          icon="eye-outline"
          title="2. Transparency" 
          content="We are transparent about how your data is used. We never sell your personal information to third parties. Data is used solely for the ClickSeekers ecosystem."
        />

        <Section 
          icon="phone-portrait-outline"
          title="3. Device Permissions" 
          content="The app may request access to your photo library for uploading portfolios or location services to help you find nearby photographers."
        />

        <Section 
          icon="wallet-outline"
          title="4. Financial Data" 
          content="Payment information is processed directly by our secure payment partners (e.g., Khalti). ClickSeekers does not store your credit card or bank details."
        />

        <Section 
          icon="log-out-outline"
          title="5. Data Deletion" 
          content="Users have the right to request deletion of their account and all associated data. You can do this through the profile settings or by contacting support."
        />

        <ThemedText type="xs" weight="medium" style={{ color: gray600, textAlign: 'center', marginTop: 40, paddingBottom: 40 }}>
          Last Updated: March 13, 2026
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: { padding: 8 },
  content: { padding: 20 },
  card: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
