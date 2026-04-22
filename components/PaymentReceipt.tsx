import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import { ThemedText } from "./themed-text";

interface PaymentReceiptProps {
  visible: boolean;
  onClose: () => void;
  data: {
    transactionId: string;
    date: string;
    amount: number;
    method: "Khalti" | "eSewa" | "Cash" | string;
    photographerName: string;
    packageName: string;
    bookingDates: string[];
    customerName: string;
    customerEmail: string;
    platformFeePercentage?: number;
    commissionAmount?: number;
    photographerAmount?: number;
  };
}

export default function PaymentReceipt({
  visible,
  onClose,
  data,
}: PaymentReceiptProps) {
  const Text = ThemedText;
  const viewShotRef = useRef<View>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const uri = await captureRef(viewShotRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      // Check if sharing is available
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Error", "Sharing is not available on this device");
        return;
      }

      // If we want to save to files, we might need more permissions or just share it
      // Sharing is simplest for cross-platform "Download/Save"
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Save Payment Receipt",
        UTI: "public.png",
      });
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Failed to generate receipt");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Payment Receipt</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            activeOpacity={0.6}
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <ViewShot
            ref={viewShotRef}
            style={styles.receiptCard}
            options={{ format: "png", quality: 1 }}
          >
            {/* Brand Header */}
            <View style={styles.brandRow}>
              <View style={styles.logoContainer}>
                <Image
                  source={require("../assets/images/logo.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandName}>ClickSeekers</Text>
            </View>

            <View style={styles.divider} />

            {/* Success Status */}
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={40} color="#10b981" />
              <Text style={styles.statusText}>Payment Successful</Text>
              <Text style={styles.amountText}>
                NPR {data.amount.toLocaleString()}
              </Text>
            </View>

            {/* Payment Breakdown */}
            {data.platformFeePercentage != null &&
              data.platformFeePercentage > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailsContainer}>
                    <Text style={styles.sectionHeader}>Payment Breakdown</Text>
                    <View style={styles.row}>
                      <Text style={styles.label}>Total Amount</Text>
                      <Text style={styles.value}>
                        NPR {data.amount.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={[styles.label, { color: "#ef4444" }]}>
                        Platform Fee ({data.platformFeePercentage}%)
                      </Text>
                      <Text style={[styles.value, { color: "#ef4444" }]}>
                        - NPR {(data.commissionAmount || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.row, styles.breakdownTotalRow]}>
                      <Text
                        style={[
                          styles.label,
                          { fontWeight: "700", color: "#111827" },
                        ]}
                      >
                        Photographer Receives
                      </Text>
                      <Text
                        style={[
                          styles.value,
                          { fontWeight: "800", color: "#10b981" },
                        ]}
                      >
                        NPR {(data.photographerAmount || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </>
              )}

            <View style={styles.divider} />

            {/* Transaction Details */}
            <View style={styles.detailsContainer}>
              <View style={styles.row}>
                <Text style={styles.label}>Transaction ID</Text>
                <Text style={styles.value}>{data.transactionId}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>{data.date}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Payment Method</Text>
                <Text style={styles.value}>{data.method}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Booking Details */}
            <View style={styles.detailsContainer}>
              <Text style={styles.sectionHeader}>Booking Details</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Photographer</Text>
                <Text style={styles.value}>{data.photographerName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Package</Text>
                <Text style={styles.value}>{data.packageName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Event Dates</Text>
                <View style={{ alignItems: "flex-end" }}>
                  {data.bookingDates.map((d, index) => (
                    <Text key={index} style={styles.value}>
                      {d}
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Bill To */}
            <View style={styles.detailsContainer}>
              <Text style={styles.sectionHeader}>Billed To</Text>
              <Text style={styles.value}>{data.customerName}</Text>
              <Text style={styles.subValue}>{data.customerEmail}</Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Thank you for choosing ClickSeekers!
              </Text>
              <Text style={styles.footerSubText}>
                For support: official@gmail.com.com
              </Text>
            </View>
          </ViewShot>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.backBtn]} onPress={onClose}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
            <Text style={styles.backBtnText}>Back to Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.downloadBtn, downloading && styles.disabledBtn]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#fff" />
                <Text style={styles.downloadText}>Download</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  receiptCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fff", // Changed to white for logo
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  brandName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#e5e7eb", // dashed border hack needs View to allow borderStyle
    borderRadius: 1,
  },
  statusRow: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10b981",
    marginTop: 8,
    marginBottom: 4,
  },
  amountText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginTop: 8,
  },
  detailsContainer: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    textAlign: "right",
    marginLeft: 8,
    flex: 1,
  },
  subValue: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9ca3af",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  footerSubText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    flexDirection: "row",
    gap: 12,
  },
  backBtn: {
    flex: 0.35,
    backgroundColor: "#f3f4f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  backBtnText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 14,
  },
  downloadBtn: {
    flex: 0.65,
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  disabledBtn: {
    backgroundColor: "#93c5fd",
  },
  downloadText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
