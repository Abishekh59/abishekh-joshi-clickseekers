import React, { useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform, Alert, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from './themed-text';
import { useThemeColor } from '../hooks/use-theme-color';

interface HelpSupportModalProps {
  visible: boolean;
  onClose: () => void;
}

const FAQ_DATA = [
  {
    question: "How do I book a photographer?",
    answer: "Browse photographers on the Explore screen, select one you like, choose a package, and click 'Book Now'. Follow the steps to confirm date, time, and location."
  },
  {
    question: "What is the platform fee?",
    answer: "ClickSeekers charges a small platform fee for each booking to maintain the platform and provide secure payments. The fee is shown in your booking summary."
  },
  {
    question: "How can I cancel a booking?",
    answer: "Go to 'My Bookings', select the booking you wish to cancel, and click 'Cancel Booking'. Please note that cancellation policies of individual photographers may apply."
  },
  {
    question: "Is my payment secure?",
    answer: "Yes, we use secure payment gateways like Khalti to process all transactions. Your financial information is never stored on our servers."
  },
  {
    question: "How do I become a verified photographer?",
    answer: "Photographers can apply for verification by submitting their KYC documents in the 'Profile' section. Once approved, you'll receive a 'Verified' badge."
  }
];

export default function HelpSupportModal({ visible, onClose }: HelpSupportModalProps) {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const background = useThemeColor({}, 'background');
  const gray900 = useThemeColor({}, 'gray900');
  const gray700 = useThemeColor({}, 'gray700');
  const gray600 = useThemeColor({}, 'gray600');
  const gray500 = useThemeColor({}, 'gray500');
  const gray400 = useThemeColor({}, 'gray400');
  const primary = useThemeColor({}, 'primary');

  const handleContact = async (type: 'email' | 'phone' | 'whatsapp') => {
    let url = '';
    let errorMessage = '';

    switch (type) {
      case 'email':
        url = 'mailto:clickseekersofficial@gmail.com';
        errorMessage = 'Please ensure you have a mail app configured on your device.';
        break;
      case 'phone':
        url = 'tel:+9779815025634';
        errorMessage = 'This device does not support making phone calls.';
        break;
      case 'whatsapp':
        // Using universal link for better reliability
        url = 'https://wa.me/9779815025634?text=Hello%20Support';
        errorMessage = 'Could not open WhatsApp. Please ensure it is installed.';
        break;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open App', errorMessage);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while trying to open the app.');
    }
  };

  const handlePressPolicy = (type: 'terms' | 'privacy') => {
    onClose();
    if (type === 'terms') {
      router.push('/Policies/TermsOfService');
    } else {
      router.push('/Policies/PrivacyPolicy');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={styles.header}>
            <ThemedText type="xl" weight="bold" style={{ color: gray900 }}>Help & Support</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={gray900} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <ThemedText type="lg" weight="extrabold" style={[styles.sectionTitle, { color: primary }]}>Contact Us</ThemedText>
              <View style={styles.contactRow}>
                <TouchableOpacity 
                  style={[styles.contactCard, { backgroundColor: '#eff6ff' }]}
                  onPress={() => handleContact('email')}
                >
                  <Ionicons name="mail" size={24} color="#2563eb" />
                  <ThemedText type="xs" weight="bold" style={{ color: '#1e40af', marginTop: 8 }}>Email</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.contactCard, { backgroundColor: '#f0fdf4' }]}
                  onPress={() => handleContact('whatsapp')}
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#16a34a" />
                  <ThemedText type="xs" weight="bold" style={{ color: '#166534', marginTop: 8 }}>WhatsApp</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.contactCard, { backgroundColor: '#fff7ed' }]}
                  onPress={() => handleContact('phone')}
                >
                  <Ionicons name="call" size={24} color="#ea580c" />
                  <ThemedText type="xs" weight="bold" style={{ color: '#9a3412', marginTop: 8 }}>Call</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="lg" weight="extrabold" style={[styles.sectionTitle, { color: primary }]}>Frequently Asked Questions</ThemedText>
              {FAQ_DATA.map((faq, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.faqItem, { borderBottomColor: background === '#ffffff' ? '#f1f5f9' : '#334155' }]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedIndex(isExpanded ? null : index);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqHeader}>
                      <ThemedText type="base" weight="bold" style={{ color: gray700, flex: 1 }}>{faq.question}</ThemedText>
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color={gray500} 
                      />
                    </View>
                    {isExpanded && (
                      <ThemedText type="sm" weight="medium" style={[styles.faqAnswer, { color: gray600 }]}>
                        {faq.answer}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.section, styles.noBorder]}>
              <ThemedText type="lg" weight="extrabold" style={[styles.sectionTitle, { color: primary }]}>Legal & Policy</ThemedText>
              <TouchableOpacity style={styles.policyItem} onPress={() => handlePressPolicy('terms')}>
                <Ionicons name="document-text-outline" size={20} color={gray600} />
                <ThemedText type="base" weight="bold" style={{ color: gray700, marginLeft: 12, flex: 1 }}>Terms of Service</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={gray400} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.policyItem} onPress={() => handlePressPolicy('privacy')}>
                <Ionicons name="shield-checkmark-outline" size={20} color={gray600} />
                <ThemedText type="base" weight="bold" style={{ color: gray700, marginLeft: 12, flex: 1 }}>Privacy Policy</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={gray400} />
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <ThemedText type="xs" weight="bold" style={{ color: gray400 }}>ClickSeekers v1.0.0</ThemedText>
              <ThemedText type="xs" weight="medium" style={{ color: gray400, marginTop: 4 }}>© 2026 ClickSeekers. All rights reserved.</ThemedText>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '90%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#f8fafc',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  sectionTitle: {
    marginBottom: 20,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  contactCard: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqAnswer: {
    marginTop: 12,
    lineHeight: 20,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  }
});
