
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface KhaltiWebViewProps {
    visible: boolean;
    paymentUrl: string;
    onClose: () => void;
    onPaymentComplete: (pidx: string, bookingId?: string) => void;
}

export default function KhaltiWebView({ visible, paymentUrl, onClose, onPaymentComplete }: KhaltiWebViewProps) {
    // Extract pidx from URL parameters if payment is successful
    const handleNavigationStateChange = (navState: any) => {
        const { url } = navState;

        // Strict check for return_url to avoid triggering on the initial payment page
        // Using includes check for robustness (http/https)
        if (url.includes('example.com/payment/') && url.includes('pidx=')) {
            // Extract pidx
            const match = url.match(/pidx=([^&]*)/);
            if (match && match[1]) {
                const pidx = match[1];
                const bookingIdMatch = url.match(/booking_id=([^&]*)/);
                const bookingId = bookingIdMatch ? bookingIdMatch[1] : undefined;
                onPaymentComplete(pidx, bookingId);
            }
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={28} color="#000" />
                    </TouchableOpacity>
                    <ThemedText type="lg" weight="bold">Khalti Payment</ThemedText>
                    <View style={{ width: 28 }} />
                </View>
                <WebView
                    source={{ uri: paymentUrl }}
                    style={{ flex: 1 }}
                    onNavigationStateChange={handleNavigationStateChange}
                    onShouldStartLoadWithRequest={(request) => {
                        const url = request.url;
                        if (url.includes('example.com')) {
                            // Extract pidx and booking_id
                            const pidxMatch = url.match(/pidx=([^&]*)/);
                            const bookingIdMatch = url.match(/booking_id=([^&]*)/);
                            if (pidxMatch && pidxMatch[1]) {
                                onPaymentComplete(pidxMatch[1], bookingIdMatch ? bookingIdMatch[1] : undefined);
                            } else {
                                // Fallback close if it hits example.com but pidx is missing (or other params)
                                onClose();
                            }
                            return false; // Prevent loading example.com entirely
                        }
                        return true;
                    }}
                    startInLoadingState={true}
                    renderLoading={() => <ActivityIndicator size="large" color="#5c2d91" style={styles.loading} />}
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    closeBtn: {
        padding: 4,
    },
    loading: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -20,
        marginLeft: -20,
    }
});
