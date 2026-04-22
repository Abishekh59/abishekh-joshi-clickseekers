import { ThemedText } from "@/components/themed-text";
import { API_HOST, apiService } from "@/services/api";
import { socketService } from "@/services/socket";
import { storage } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = "all" | "clients" | "photographers" | "kyc";

const STATUS_CFG = {
  ACTIVE: { label: "Active", dot: "#22c55e", bg: "#f0fdf4", text: "#15803d" },
  WARNING: { label: "Warning", dot: "#f59e0b", bg: "#fefce8", text: "#a16207" },
  BLOCKED: { label: "Blocked", dot: "#ef4444", bg: "#fef2f2", text: "#b91c1c" },
};

const TABS = [
  { key: "all" as Tab, label: "All", icon: "people-outline" as const },
  { key: "clients" as Tab, label: "Clients", icon: "person-outline" as const },
  {
    key: "photographers" as Tab,
    label: "Photographers",
    icon: "camera-outline" as const,
  },
  {
    key: "kyc" as Tab,
    label: "KYC",
    icon: "shield-checkmark-outline" as const,
  },
];

export default function UserManagement({
  onBack,
  initialTab,
}: {
  onBack?: () => void;
  initialTab?: Tab;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || "all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [pendingKYC, setPendingKYC] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedKycId, setSelectedKycId] = useState<number | null>(null);
  const [selectedKycData, setSelectedKycData] = useState<any | null>(null);
  const [warningMessageModalVisible, setWarningMessageModalVisible] =
    useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [warningUser, setWarningUser] = useState<any | null>(null);
  const [warningStatus, setWarningStatus] = useState<
    "WARNING" | "BLOCKED" | null
  >(null);

  const fetchData = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      if (activeTab === "kyc") {
        const res = await apiService.getPendingKyc(token);
        if (res.success) setPendingKYC(res.data);
      } else {
        const role =
          activeTab === "all"
            ? undefined
            : activeTab === "clients"
              ? "CLIENT"
              : "PHOTOGRAPHER";
        const res = await apiService.getAdminUsers(token, { role, search });
        if (res.success) setUsers(res.data);
      }
    } catch {
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, search]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Socket listeners for real-time updates
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshing(true);
      fetchData();
    };

    socketService.on("kyc_submitted", handleRefresh);
    socketService.on("kyc_approved", handleRefresh);
    socketService.on("kyc_rejected", handleRefresh);
    socketService.on("user_status_updated", handleRefresh);
    socketService.on("user_created", handleRefresh);
    socketService.on("profile_updated", handleRefresh);

    return () => {
      socketService.off("kyc_submitted", handleRefresh);
      socketService.off("kyc_approved", handleRefresh);
      socketService.off("kyc_rejected", handleRefresh);
      socketService.off("user_status_updated", handleRefresh);
      socketService.off("user_created", handleRefresh);
      socketService.off("profile_updated", handleRefresh);
    };
  }, [activeTab, search]);

  const updateStatus = (
    user: any,
    status: "ACTIVE" | "WARNING" | "BLOCKED",
  ) => {
    const word =
      status === "BLOCKED"
        ? "Block"
        : status === "WARNING"
          ? "Warn"
          : "Activate";

    // If it's WARNING or BLOCKED, show modal to enter message
    if (status === "WARNING" || status === "BLOCKED") {
      setWarningUser(user);
      setWarningStatus(status);
      setWarningMessage("");
      setWarningMessageModalVisible(true);
      return;
    }

    // If it's ACTIVE, just confirm without message
    Alert.alert(word, `${word} ${user.full_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: word,
        style: status === "ACTIVE" ? "default" : "destructive",
        onPress: async () => {
          try {
            const token = await storage.getToken();
            if (!token) return;
            const res = await apiService.updateUserStatus(
              token,
              user.user_id,
              status,
              `Admin: ${status}`,
            );
            if (res.success) {
              Alert.alert("Done", `User status set to ${status}`);
              fetchData();
            }
          } catch {
            Alert.alert("Error", "Failed to update status");
          }
        },
      },
    ]);
  };

  const handleWarningSubmit = async () => {
    if (!warningUser || !warningStatus) return;

    const message = warningMessage.trim() || `Admin action: ${warningStatus}`;

    try {
      const token = await storage.getToken();
      if (!token) return;

      const res = await apiService.updateUserStatus(
        token,
        warningUser.user_id,
        warningStatus,
        message,
      );

      if (res.success) {
        // Emit socket event to notify the photographer
        socketService.emit("admin_action_notification", {
          photographer_id: warningUser.user_id,
          action: warningStatus,
          message: message,
          adminName: "Admin",
        });

        // Emit socket event for admin dashboard notifications
        socketService.emit("user_status_updated", {
          status: warningStatus,
          userName: warningUser.full_name || "User",
          userId: warningUser.user_id,
          message: message,
        });

        Alert.alert(
          "Done",
          `${warningStatus === "BLOCKED" ? "User blocked" : "User warned"} successfully`,
        );
        setWarningMessageModalVisible(false);
        setWarningMessage("");
        setWarningUser(null);
        setWarningStatus(null);
        fetchData();
      }
    } catch {
      Alert.alert("Error", "Failed to apply action");
    }
  };

  const handleReviewKYC = async (
    id: number,
    status: "APPROVED" | "REJECTED",
    reason?: string,
    kycData?: any,
  ) => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      setPendingKYC((prev) => prev.filter((k) => k.kyc_id !== id));
      await apiService.reviewKyc(
        { kyc_id: id, status, remarks: reason || `Admin ${status}` },
        token,
      );

      // Emit socket event for admin dashboard notifications
      socketService.emit("kyc_" + status.toLowerCase(), {
        photographerName: kycData?.user?.full_name || "Photographer",
        photographerId: kycData?.user?.user_id,
        kycId: id,
      });

      if (status === "REJECTED") {
        setRejectionModalVisible(false);
        setRejectionReason("");
        setSelectedKycId(null);
      }
      Alert.alert("Success", `KYC ${status.toLowerCase()} successfully`);
    } catch {
      Alert.alert("Error", "Action failed");
      fetchData();
    }
  };

  const reviewKYC = (
    id: number,
    status: "APPROVED" | "REJECTED",
    kycData?: any,
  ) => {
    if (status === "REJECTED") {
      setSelectedKycId(id);
      setSelectedKycData(kycData);
      setRejectionReason("");
      setRejectionModalVisible(true);
      return;
    }

    Alert.alert("Approve KYC", "Confirm approval?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: () => handleReviewKYC(id, "APPROVED", undefined, kycData),
      },
    ]);
  };

  const avatarUri = (name: string, img?: any) => {
    if (!img)
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=4f46e5&color=fff&bold=true&size=128`;
    if (typeof img === "string" && img.startsWith("http")) return img;
    if (typeof img === "string" && img.startsWith("data:image")) return img;
    if (typeof img === "string")
      return `${API_HOST}${img.startsWith("/") ? "" : "/"}${img}`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=4f46e5&color=fff&bold=true&size=128`;
  };

  const pt = Platform.OS === "ios" ? insets.top : insets.top + 8;
  const listData = activeTab === "kyc" ? pendingKYC : users;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: pt }]}>
        <View style={s.headerRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Ionicons name="arrow-back" size={17} color="#94a3b8" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <ThemedText style={s.headerEye}>USER MANAGEMENT</ThemedText>
            <ThemedText style={s.headerTitle}>Members</ThemedText>
          </View>
        </View>

        {/* Search */}
        {activeTab !== "kyc" && (
          <View style={s.searchBox}>
            <Ionicons
              name="search-outline"
              size={14}
              color="#64748b"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={s.searchInput}
              placeholder="Search by name or email..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[s.tab, active && s.tabActive]}
              >
                <Ionicons
                  name={tab.icon}
                  size={13}
                  color={active ? "#6366f1" : "#94a3b8"}
                  style={{ marginRight: 5 }}
                />
                <ThemedText style={[s.tabText, active && s.tabTextActive]}>
                  {tab.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : listData.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="people-outline" size={36} color="#cbd5e1" />
            <ThemedText
              style={{ color: "#94a3b8", marginTop: 10, fontSize: 14 }}
            >
              {activeTab === "kyc"
                ? "No pending KYC submissions"
                : search
                  ? `No results for "${search}"`
                  : "No users found"}
            </ThemedText>
          </View>
        ) : activeTab === "kyc" ? (
          listData.map((kyc) => (
            <KYCCard
              key={kyc.kyc_id}
              kyc={kyc}
              onAction={reviewKYC}
              avatarUri={avatarUri}
            />
          ))
        ) : (
          listData.map((user) => (
            <UserCard
              key={user.user_id}
              user={user}
              onStatus={updateStatus}
              avatarUri={avatarUri}
              onViewProfile={(u) => {
                setSelectedClient(u);
              }}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <ClientDetailModal
        user={selectedClient}
        visible={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        avatarUri={avatarUri}
      />

      {/* Rejection Reason Modal */}
      <Modal visible={rejectionModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setRejectionModalVisible(false)}
          />
          <View style={s.rejectionModalContent}>
            <View style={s.sheetHeader}>
              <ThemedText style={s.sheetTitle}>Rejection Reason</ThemedText>
              <TouchableOpacity onPress={() => setRejectionModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ThemedText
              style={{ color: "#64748b", fontSize: 13, lineHeight: 18 }}
            >
              Please provide a clear reason why this KYC is being rejected. The
              photographer will use this to correct their submission.
            </ThemedText>

            <TextInput
              style={s.rejectionInput}
              placeholder="e.g. Document is blurry, expired, or names don't match..."
              placeholderTextColor="#94a3b8"
              multiline
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => setRejectionModalVisible(false)}
                style={[
                  s.footerBtn,
                  { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" },
                ]}
              >
                <ThemedText style={{ color: "#64748b" }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!rejectionReason.trim()) {
                    Alert.alert(
                      "Required",
                      "Please provide a reason for rejection.",
                    );
                    return;
                  }
                  if (selectedKycId)
                    handleReviewKYC(
                      selectedKycId,
                      "REJECTED",
                      rejectionReason,
                      selectedKycData,
                    );
                }}
                style={[
                  s.footerBtn,
                  { backgroundColor: "#ef4444", borderColor: "#ef4444" },
                ]}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "700" }}>
                  Confirm Reject
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Warning/Blocking Message Modal */}
      <Modal
        visible={warningMessageModalVisible}
        transparent
        animationType="fade"
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setWarningMessageModalVisible(false)}
          />
          <View style={s.rejectionModalContent}>
            <View style={s.sheetHeader}>
              <ThemedText style={s.sheetTitle}>
                {warningStatus === "BLOCKED" ? "Block User" : "Warn User"}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setWarningMessageModalVisible(false)}
              >
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ThemedText
              style={{ color: "#64748b", fontSize: 13, lineHeight: 18 }}
            >
              {warningStatus === "BLOCKED"
                ? `You are about to block ${warningUser?.full_name}. Please provide a clear reason.`
                : `You are about to warn ${warningUser?.full_name}. Please provide a clear message.`}
            </ThemedText>

            <TextInput
              style={s.rejectionInput}
              placeholder={
                warningStatus === "BLOCKED"
                  ? "e.g. Blocking due to policy violation..."
                  : "e.g. Warning: Please review our community guidelines..."
              }
              placeholderTextColor="#94a3b8"
              multiline
              value={warningMessage}
              onChangeText={setWarningMessage}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => setWarningMessageModalVisible(false)}
                style={[
                  s.footerBtn,
                  { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" },
                ]}
              >
                <ThemedText style={{ color: "#64748b" }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleWarningSubmit}
                style={[
                  s.footerBtn,
                  {
                    backgroundColor:
                      warningStatus === "BLOCKED" ? "#ef4444" : "#f59e0b",
                    borderColor:
                      warningStatus === "BLOCKED" ? "#ef4444" : "#f59e0b",
                  },
                ]}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "700" }}>
                  {warningStatus === "BLOCKED"
                    ? "Confirm Block"
                    : "Confirm Warn"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── User Card ──────────────────────────────────────────────────────────────────
function UserCard({
  user,
  onStatus,
  avatarUri,
  onViewProfile,
}: {
  user: any;
  onStatus: (u: any, s: any) => void;
  avatarUri: (n: string, img?: any) => string;
  onViewProfile: (u: any) => void;
}) {
  const st = (user.status || "ACTIVE") as "ACTIVE" | "WARNING" | "BLOCKED";
  const cfg = STATUS_CFG[st] || STATUS_CFG.ACTIVE;
  const bookings =
    user._count?.bookings_as_client ||
    user._count?.bookings_as_photographer ||
    0;

  return (
    <View style={s.card}>
      <View style={s.cardBody}>
        <TouchableOpacity
          onPress={() => onViewProfile(user)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: avatarUri(user.full_name, user.profile_image) }}
            style={s.avatar}
          />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 16 }}>
          <View style={s.cardTop}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText style={s.userName}>{user.full_name}</ThemedText>
              {user.role === "PHOTOGRAPHER" && user.kyc_verified && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color="#3b82f6"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <View
              style={[
                s.statusBadge,
                { backgroundColor: cfg.bg, borderColor: cfg.dot + "40" },
              ]}
            >
              <View style={[s.statusDot, { backgroundColor: cfg.dot }]} />
              <ThemedText style={[s.statusText, { color: cfg.text }]}>
                {cfg.label}
              </ThemedText>
            </View>
          </View>

          <View style={s.infoRowSmall}>
            <Ionicons
              name="mail-outline"
              size={14}
              color="#64748b"
              style={{ marginRight: 6 }}
            />
            <ThemedText style={s.userEmail}>{user.email}</ThemedText>
          </View>

          <ThemedText style={s.userMeta}>
            {user.role.toUpperCase()} · {bookings} Bookings
          </ThemedText>
        </View>
      </View>

      <View style={s.actionDivider} />

      {/* Action footer */}
      <View style={s.actionFooter}>
        {st !== "ACTIVE" && (
          <TouchableOpacity
            onPress={() => onStatus(user, "ACTIVE")}
            style={[s.footerBtn, s.btnActivate]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#22c55e"
              style={{ marginRight: 8 }}
            />
            <ThemedText style={[s.footerBtnText, { color: "#22c55e" }]}>
              Activate
            </ThemedText>
          </TouchableOpacity>
        )}
        {st === "ACTIVE" && (
          <TouchableOpacity
            onPress={() => onStatus(user, "WARNING")}
            style={[s.footerBtn, s.btnWarn]}
          >
            <Ionicons
              name="warning-outline"
              size={18}
              color="#f59e0b"
              style={{ marginRight: 8 }}
            />
            <ThemedText style={[s.footerBtnText, { color: "#f59e0b" }]}>
              Warn
            </ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onStatus(user, "BLOCKED")}
          style={[
            s.footerBtn,
            s.btnBlock,
            st === "BLOCKED" && { opacity: 0.5 },
          ]}
          disabled={st === "BLOCKED"}
        >
          <Ionicons
            name="ban-outline"
            size={18}
            color="#ef4444"
            style={{ marginRight: 8 }}
          />
          <ThemedText style={[s.footerBtnText, { color: "#ef4444" }]}>
            Block
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── KYC Card ──────────────────────────────────────────────────────────────────
function KYCCard({
  kyc,
  onAction,
  avatarUri,
}: {
  kyc: any;
  onAction: (id: number, s: "APPROVED" | "REJECTED", kycData?: any) => void;
  avatarUri: (n: string, img?: any) => string;
}) {
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const getDocUri = (img?: string) => {
    if (!img) return null;
    if (img.startsWith("http") || img.startsWith("data:image")) return img;
    return `${API_HOST}${img.startsWith("/") ? "" : "/"}${img}`;
  };

  const front = getDocUri(kyc.document_front_url);
  const back = getDocUri(kyc.document_back_url);

  return (
    <View style={s.card}>
      <View style={s.cardBody}>
        <Image
          source={{
            uri: avatarUri(kyc.user?.full_name, kyc.user?.profile_image),
          }}
          style={s.avatar}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={s.cardTop}>
            <ThemedText style={s.userName}>
              {kyc.user?.full_name || "Unknown"}
            </ThemedText>
            <View
              style={[
                s.statusBadge,
                { backgroundColor: "#fefce8", borderColor: "#fde68a" },
              ]}
            >
              <View style={[s.statusDot, { backgroundColor: "#f59e0b" }]} />
              <ThemedText style={[s.statusText, { color: "#a16207" }]}>
                Pending
              </ThemedText>
            </View>
          </View>
          <ThemedText style={s.userEmail}>
            {kyc.document_type} · {kyc.document_number}
          </ThemedText>
        </View>
      </View>

      {/* Doc buttons */}
      <View
        style={[
          s.actionStrip,
          {
            borderTopWidth: 0,
            paddingTop: 0,
            paddingHorizontal: 14,
            paddingBottom: 12,
          },
        ]}
      >
        {front && (
          <TouchableOpacity
            onPress={() => setPreviewImg(front)}
            style={[
              s.actionChip,
              { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
            ]}
          >
            <Ionicons name="eye-outline" size={13} color="#4f46e5" />
            <ThemedText style={[s.actionChipText, { color: "#4f46e5" }]}>
              Front
            </ThemedText>
          </TouchableOpacity>
        )}
        {back && (
          <TouchableOpacity
            onPress={() => setPreviewImg(back)}
            style={[
              s.actionChip,
              { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
            ]}
          >
            <Ionicons name="eye-outline" size={13} color="#4f46e5" />
            <ThemedText style={[s.actionChipText, { color: "#4f46e5" }]}>
              Back
            </ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setShowDetails(true)}
          style={[
            s.actionChip,
            { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
          ]}
        >
          <Ionicons name="list-outline" size={13} color="#475569" />
          <ThemedText style={[s.actionChipText, { color: "#475569" }]}>
            Details
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Approve / Reject */}
      <View style={s.kycBtns}>
        <TouchableOpacity
          onPress={() => onAction(kyc.kyc_id, "REJECTED", kyc)}
          style={s.rejectBtn}
        >
          <ThemedText
            style={{ color: "#dc2626", fontSize: 13, fontWeight: "600" }}
          >
            Reject
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAction(kyc.kyc_id, "APPROVED", kyc)}
          style={s.approveBtn}
        >
          <ThemedText
            style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}
          >
            Approve & Verify
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Image preview modal */}
      <Modal visible={!!previewImg} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setPreviewImg(null)}
          />
          <TouchableOpacity
            style={s.closeBtn}
            onPress={() => setPreviewImg(null)}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          {previewImg && (
            <Image
              source={{ uri: previewImg }}
              style={s.previewImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Details bottom sheet */}
      <Modal visible={showDetails} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowDetails(false)}
          />
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <ThemedText style={s.sheetTitle}>KYC Details</ThemedText>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { l: "Full Name", v: kyc.full_name },
                {
                  l: "Date of Birth",
                  v: kyc.date_of_birth
                    ? new Date(kyc.date_of_birth).toLocaleDateString()
                    : "N/A",
                },
                { l: "Gender", v: kyc.gender || "N/A" },
                { l: "Contact", v: kyc.contact_number },
                { l: "Email", v: kyc.email },
                {
                  l: "Address",
                  v: `${kyc.address_city}, ${kyc.address_district}`,
                },
                { l: "Document Type", v: kyc.document_type },
                { l: "Document No", v: kyc.document_number },
                { l: "Issued By", v: kyc.issued_by || "N/A" },
              ].map((r, i) => (
                <View key={i} style={s.detailRow}>
                  <ThemedText style={s.detailLabel}>
                    {r.l.toUpperCase()}
                  </ThemedText>
                  <ThemedText style={s.detailVal}>{r.v}</ThemedText>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },

  header: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerEye: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchInput: { flex: 1, color: "#e2e8f0", fontSize: 13 },

  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  tabActive: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: "#4f46e5" },

  content: { padding: 14 },
  center: { alignItems: "center", paddingTop: 80, gap: 10 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9edf2",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  cardBody: { flexDirection: "row", alignItems: "center", padding: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    marginBottom: 4,
  },
  userName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  infoRowSmall: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  userEmail: { fontSize: 13, color: "#64748b" },
  userMeta: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "capitalize",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: "700" },

  actionDivider: { height: 1, backgroundColor: "#f1f5f9" },
  actionFooter: {
    flexDirection: "row",
    padding: 10,
    gap: 10,
    backgroundColor: "#fafbfc",
  },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: "#fff",
  },
  footerBtnText: { fontSize: 14, fontWeight: "700" },
  btnActivate: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  btnWarn: { borderColor: "#f59e0b", backgroundColor: "#fefce8" },
  btnBlock: { borderColor: "#ef4444", backgroundColor: "#fef2f2" },

  kycBtns: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  rejectBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  approveBtn: {
    flex: 2,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: "#4f46e5",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImg: { width: "90%", height: "75%" },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "72%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  detailRow: { marginBottom: 14 },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  detailVal: { fontSize: 14, color: "#0f172a" },
  profileTapHint: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },

  actionStrip: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  actionChipText: { fontSize: 12, fontWeight: "600" },

  rejectionModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  rejectionInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    color: "#0f172a",
    fontSize: 14,
    marginTop: 12,
  },
});

// ── Client Detail Modal ────────────────────────────────────────────────────────
function ClientDetailModal({
  user,
  visible,
  onClose,
  avatarUri,
}: {
  user: any;
  visible: boolean;
  onClose: () => void;
  avatarUri: (n: string, img?: any) => string;
}) {
  if (!user) return null;

  const STATUS_CFG = {
    ACTIVE: { label: "Active", dot: "#22c55e", bg: "#f0fdf4", text: "#15803d" },
    WARNING: {
      label: "Warning",
      dot: "#f59e0b",
      bg: "#fefce8",
      text: "#a16207",
    },
    BLOCKED: {
      label: "Blocked",
      dot: "#ef4444",
      bg: "#fef2f2",
      text: "#b91c1c",
    },
  };
  const st = (user.status || "ACTIVE") as keyof typeof STATUS_CFG;
  const cfg = STATUS_CFG[st] || STATUS_CFG.ACTIVE;
  const bookings = user._count?.bookings_as_client || 0;

  const isPhotographer = user.role === "PHOTOGRAPHER";
  const infoRows = [
    {
      icon: "person-outline" as const,
      label: "Role",
      value: user.role || "CLIENT",
    },
    ...(isPhotographer
      ? [
          {
            icon: "camera-outline" as const,
            label: "Specialty",
            value: user.specialization || "Photographer",
          },
          {
            icon: "star-outline" as const,
            label: "Points",
            value: user.points != null ? `${user.points} pts` : "0 pts",
          },
          {
            icon: "ribbon-outline" as const,
            label: "Badge",
            value: user.badge || "Beginner",
          },
        ]
      : []),
    {
      icon: "calendar-outline" as const,
      label: isPhotographer ? "Bookings Done" : "Bookings",
      value: String(bookings),
    },
    {
      icon: "call-outline" as const,
      label: "Phone",
      value: user.phone || "Not provided",
    },
    {
      icon: "location-outline" as const,
      label: "Location",
      value: user.location || "Not provided",
    },
    {
      icon: "shield-checkmark-outline" as const,
      label: "KYC Status",
      value: user.kyc_verified ? "Verified" : "Not Verified",
    },
    {
      icon: "time-outline" as const,
      label: "Joined",
      value: user.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })
        : "—",
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
        <View style={ms.sheet}>
          <View style={ms.handle} />

          {/* Profile header */}
          <View style={ms.profileRow}>
            <Image
              source={{ uri: avatarUri(user.full_name, user.profile_image) }}
              style={ms.avatar}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <ThemedText style={ms.name}>{user.full_name}</ThemedText>
              <ThemedText style={ms.emailText}>{user.email}</ThemedText>
              <View style={[ms.badge, { backgroundColor: cfg.bg }]}>
                <View style={[ms.dot, { backgroundColor: cfg.dot }]} />
                <ThemedText style={[ms.badgeText, { color: cfg.text }]}>
                  {cfg.label}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Info rows */}
          <View style={ms.infoCard}>
            {infoRows.map((r, i) => (
              <View
                key={i}
                style={[
                  ms.infoRow,
                  i < infoRows.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: "#f1f5f9",
                  },
                ]}
              >
                <View style={ms.infoIcon}>
                  <Ionicons name={r.icon} size={15} color="#6366f1" />
                </View>
                <ThemedText style={ms.infoLabel}>{r.label}</ThemedText>
                <ThemedText style={ms.infoVal}>{r.value}</ThemedText>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
            <ThemedText
              style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}
            >
              Close
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    alignSelf: "center",
    marginBottom: 20,
  },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f1f5f9",
  },
  name: { fontSize: 17, fontWeight: "800", color: "#0f172a", marginBottom: 3 },
  emailText: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  infoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e9edf2",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { flex: 1, fontSize: 13, color: "#64748b" },
  infoVal: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  closeBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
});
