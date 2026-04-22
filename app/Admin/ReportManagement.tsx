import { ThemedText } from "@/components/themed-text";
import { apiService } from "@/services/api";
import { socketService } from "@/services/socket";
import { storage } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export default function ReportManagement({ onBack }: { onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ReportStatus>("OPEN");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      const res = await apiService.getAdminReports(token);
      if (res.success) setReports(res.data);
    } catch {
      Alert.alert("Error", "Failed to load reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);
  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  // Socket listeners for real-time report updates
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshing(true);
      fetchReports();
    };

    socketService.on("new_report", handleRefresh);
    socketService.on("report_status_updated", handleRefresh);
    socketService.on("report_resolved", handleRefresh);
    socketService.on("report_dismissed", handleRefresh);

    return () => {
      socketService.off("new_report", handleRefresh);
      socketService.off("report_status_updated", handleRefresh);
      socketService.off("report_resolved", handleRefresh);
      socketService.off("report_dismissed", handleRefresh);
    };
  }, []);

  const updateReport = async (id: number, status: string) => {
    const label = status === "RESOLVED" ? "Resolve" : "Dismiss";
    Alert.alert(`${label} Report`, "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: label,
        style: status === "RESOLVED" ? "default" : "destructive",
        onPress: async () => {
          try {
            const token = await storage.getToken();
            if (!token) return;
            const res = await apiService.updateReportStatus(token, id, status);
            if (res.success) {
              // Emit socket event for admin dashboard notifications
              socketService.emit("report_" + status.toLowerCase(), {
                reporterName: "Admin",
                reportId: id,
                status: status,
              });
              Alert.alert("Done", `Report ${status.toLowerCase()}`);
              fetchReports();
            }
          } catch {
            Alert.alert("Error", "Action failed");
          }
        },
      },
    ]);
  };

  const counts = {
    OPEN: reports.filter((r) => r.status?.status_name === "OPEN").length,
    RESOLVED: reports.filter((r) => r.status?.status_name === "RESOLVED")
      .length,
    DISMISSED: reports.filter((r) => r.status?.status_name === "DISMISSED")
      .length,
  };
  const filtered = reports.filter((r) => r.status?.status_name === activeTab);
  const pt = Platform.OS === "ios" ? insets.top : insets.top + 8;

  const TABS: {
    key: ReportStatus;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
  }[] = [
    { key: "OPEN", label: "Pending", icon: "time-outline" },
    { key: "RESOLVED", label: "Resolved", icon: "checkmark-circle-outline" },
    { key: "DISMISSED", label: "Dismissed", icon: "close-circle-outline" },
  ];

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: pt }]}>
        <View style={s.headerRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Ionicons name="arrow-back" size={17} color="#94a3b8" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <ThemedText style={s.headerEye}>MODERATION</ThemedText>
            <ThemedText style={s.headerTitle}>Reports</ThemedText>
          </View>
        </View>

        {/* Counts */}
        <View style={s.countsRow}>
          {TABS.map((t) => (
            <View key={t.key} style={s.countItem}>
              <ThemedText
                style={[
                  s.countNum,
                  {
                    color:
                      counts[t.key] > 0 && t.key === "OPEN"
                        ? "#fbbf24"
                        : "#f1f5f9",
                  },
                ]}
              >
                {counts[t.key]}
              </ThemedText>
              <ThemedText style={s.countLabel}>
                {t.label.toUpperCase()}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={s.tabsRow}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                style={[s.tab, active && s.tabActive]}
              >
                <Ionicons
                  name={t.icon}
                  size={13}
                  color={active ? "#4f46e5" : "#64748b"}
                  style={{ marginRight: 5 }}
                />
                <ThemedText style={[s.tabText, active && { color: "#4f46e5" }]}>
                  {t.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
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
        ) : filtered.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="flag-outline" size={36} color="#cbd5e1" />
            <ThemedText
              style={{ color: "#94a3b8", marginTop: 10, fontSize: 14 }}
            >
              No {activeTab.toLowerCase()} reports
            </ThemedText>
          </View>
        ) : (
          filtered.map((r) => (
            <ReportCard
              key={r.report_id}
              report={r}
              status={activeTab}
              onAction={updateReport}
              onRefresh={fetchReports}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Report Card ────────────────────────────────────────────────────────────────
function ReportCard({
  report,
  status,
  onAction,
  onRefresh,
}: {
  report: any;
  status: ReportStatus;
  onAction: (id: number, s: string) => void;
  onRefresh: () => void;
}) {
  const date = report.reported_at
    ? new Date(report.reported_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const doUserAction = (action: "WARNING" | "BLOCKED" | "ACTIVE") => {
    const target = report.target;
    if (!target) return;
    const labels = { WARNING: "Warn", BLOCKED: "Block", ACTIVE: "Activate" };
    const label = labels[action];
    Alert.alert(`${label} User`, `${label} ${target.full_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: label,
        style: action === "ACTIVE" ? "default" : "destructive",
        onPress: async () => {
          try {
            const token = await storage.getToken();
            if (!token) return;
            const res = await apiService.updateUserStatus(
              token,
              target.user_id,
              action,
              `${label} via report #${report.report_id}`,
            );
            if (res.success) {
              Alert.alert("Success", `User ${label.toLowerCase()}ed`);
              // Auto-resolve the report when an action is taken
              if (action !== "ACTIVE") onAction(report.report_id, "RESOLVED");
              onRefresh();
            }
          } catch {
            Alert.alert("Error", "Action failed");
          }
        },
      },
    ]);
  };

  const isOpen = status === "OPEN";
  const reportedIsBlocked = report.target?.status === "BLOCKED";

  return (
    <View style={s.card}>
      {/* Top: reason + date */}
      <View style={s.cardTop}>
        <View style={s.reasonBadge}>
          <Ionicons
            name="flag"
            size={10}
            color="#f59e0b"
            style={{ marginRight: 4, marginTop: 2 }}
          />
          <ThemedText style={s.reasonText} numberOfLines={2}>
            {(report.reason || "VIOLATION").toUpperCase()}
          </ThemedText>
        </View>
        <ThemedText style={s.dateText} numberOfLines={1}>
          {date}
        </ThemedText>
      </View>

      {/* Parties */}
      <View style={s.parties}>
        <View style={{ flex: 1 }}>
          <ThemedText style={s.partyRole}>REPORTER</ThemedText>
          <ThemedText style={s.partyName} numberOfLines={1}>
            {report.reporter?.full_name || "—"}
          </ThemedText>
          <ThemedText style={s.partyRole2} numberOfLines={1}>
            {report.reporter?.email}
          </ThemedText>
        </View>
        <Ionicons
          name="arrow-forward"
          size={12}
          color="#cbd5e1"
          style={{ marginHorizontal: 8, marginTop: 12 }}
        />
        <View style={{ flex: 1 }}>
          <ThemedText style={[s.partyRole, { color: "#ef4444" }]}>
            REPORTED
          </ThemedText>
          <ThemedText style={s.partyName} numberOfLines={1}>
            {report.target?.full_name || "—"}
          </ThemedText>
          <ThemedText style={s.partyRole2} numberOfLines={1}>
            {report.target?.email}
          </ThemedText>
        </View>
      </View>

      {/* Description */}
      {!!report.description && (
        <View style={s.descBox}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={12}
            color="#94a3b8"
            style={{ marginRight: 6, marginTop: 1 }}
          />
          <ThemedText style={s.descText}>{report.description}</ThemedText>
        </View>
      )}

      {/* Actions — only on OPEN reports */}
      {isOpen && (
        <View style={s.actionsBox}>
          {/* Dismiss */}
          <TouchableOpacity
            onPress={() => onAction(report.report_id, "DISMISSED")}
            style={s.chipGray}
          >
            <ThemedText
              style={{ color: "#64748b", fontSize: 12, fontWeight: "600" }}
              numberOfLines={1}
            >
              Dismiss
            </ThemedText>
          </TouchableOpacity>

          {/* Warn user */}
          <TouchableOpacity
            onPress={() => doUserAction("WARNING")}
            style={s.chipWarn}
          >
            <Ionicons name="warning-outline" size={12} color="#ca8a04" />
            <ThemedText
              style={{ color: "#ca8a04", fontSize: 12, fontWeight: "600" }}
              numberOfLines={1}
            >
              Warn
            </ThemedText>
          </TouchableOpacity>

          {/* Block or Activate based on user's current status */}
          {reportedIsBlocked ? (
            <TouchableOpacity
              onPress={() => doUserAction("ACTIVE")}
              style={s.chipActivate}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={12}
                color="#16a34a"
              />
              <ThemedText
                style={{ color: "#16a34a", fontSize: 12, fontWeight: "600" }}
                numberOfLines={1}
              >
                Activate
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => doUserAction("BLOCKED")}
              style={s.chipBlock}
            >
              <Ionicons name="ban-outline" size={12} color="#dc2626" />
              <ThemedText
                style={{ color: "#dc2626", fontSize: 12, fontWeight: "600" }}
                numberOfLines={1}
              >
                Block
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
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
    marginBottom: 16,
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

  countsRow: { flexDirection: "row", gap: 28, marginBottom: 18 },
  countItem: { alignItems: "center" },
  countNum: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  countLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  tabsRow: { flexDirection: "row", gap: 8 },
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

  content: { padding: 14 },
  center: { alignItems: "center", paddingTop: 80, gap: 10 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e9edf2",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    padding: 14,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  reasonBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  reasonText: { fontSize: 10, fontWeight: "700", color: "#a16207", flex: 1 },
  dateText: { fontSize: 11, color: "#94a3b8" },

  parties: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  partyRole: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.8,
  },
  partyName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 3,
    marginBottom: 2,
    flex: 1,
  },
  partyRole2: { fontSize: 11, color: "#94a3b8", flex: 1 },

  descBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 2,
    marginBottom: 8,
    gap: 6,
  },
  descText: { flex: 1, fontSize: 12, color: "#64748b", lineHeight: 18 },

  actionsBox: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  chipGray: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipWarn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fde68a",
    gap: 4,
  },
  chipBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    gap: 4,
  },
  chipActivate: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 4,
  },
});
