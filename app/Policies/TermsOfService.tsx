import React from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '../../components/themed-text';
import { useThemeColor } from '../../hooks/use-theme-color';

export default function TermsOfService() {
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
        <View style={[styles.iconContainer, { backgroundColor: '#f0f9ff' }]}>
          <Ionicons name={icon as any} size={20} color={primary} />
        </View>
        <ThemedText type="lg" weight="bold" style={{ color: gray900 }}>{title}</ThemedText>
      </View>
      <ThemedText type="base" style={{ color: gray700, lineHeight: 24 }}>{content}</ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={gray900} />
        </TouchableOpacity>
        <ThemedText type="xl" weight="bold" style={{ color: gray900 }}>Terms of Service</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText type="sm" weight="medium" style={{ color: gray600, marginBottom: 24, textAlign: 'center' }}>
          Welcome to ClickSeekers. These terms govern your use of our platform.
        </ThemedText>

        <Section 
          icon="information-circle-outline"
          title="1. Introduction" 
          content="ClickSeekers is a marketplace connecting clients with photographers. By accessing our services, you agree to comply with these Terms of Service and all applicable laws in Nepal."
        />

        <Section 
          icon="person-outline"
          title="2. User Obligations" 
          content="Users must provide accurate information, maintain account security, and respect other platform participants. Misuse of the platform may lead to account suspension or termination."
        />

        <Section 
          icon="camera-outline"
          title="3. Photographer Verification" 
          content="Photographers must undergo a KYC verification process. While we verify identities, ClickSeekers does not guarantee the quality of individual photographer's work beyond what is shown in their portfolio."
        />

        <Section 
          icon="card-outline"
          title="4. Payments & Fees" 
          content="Payments are handled via secure third-party gateways. ClickSeekers may charge a platform fee for facilitating bookings, which will be clearly displayed during the booking process."
        />

        <Section 
          icon="hammer-outline"
          title="5. Dispute Resolution" 
          content="In case of disputes, we encourage users to reach out to our support team. We may provide mediation assistance but are not legal arbiters for private agreements between users."
        />

        <Section 
          icon="lock-closed-outline"
          title="6. Intellectual Property" 
          content="Photographers retain the copyright to their photos unless otherwise agreed with the client. Clients receive usage rights as specified in the booking package."
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
