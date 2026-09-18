import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import StatusBadge from "../components/StatusBadge";
import PrimaryButton from "../components/PrimaryButton";
import { COLORS, ISSUE_LABELS } from "../utils/constants";
import { fetchComplaintById, imageUrl, disputeComplaint } from "../services/complaints";

export default function ComplaintDetailsScreen({ route }) {
  const { complaintId } = route.params;
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputing, setDisputing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchComplaintById(complaintId);
      setComplaint(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [complaintId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDispute() {
    if (!disputeReason.trim()) {
      Alert.alert("Reason required", "Please explain why this doesn't look resolved to you.");
      return;
    }
    setDisputing(true);
    try {
      const updated = await disputeComplaint(complaintId, disputeReason.trim());
      setComplaint(updated);
      setShowDisputeForm(false);
      setDisputeReason("");
      Alert.alert(
        "Reopened",
        "This complaint has been reopened and flagged for the officer to take another look."
      );
    } catch (err) {
      Alert.alert("Couldn't submit dispute", err.message);
    } finally {
      setDisputing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error || !complaint) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "Complaint not found."}</Text>
      </View>
    );
  }

  const dateStr = new Date(complaint.created_at).toLocaleString("en-IN");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Image source={{ uri: imageUrl(complaint.image_path) }} style={styles.image} />

      <View style={styles.headerRow}>
        <Text style={styles.trackingId}>{complaint.tracking_id}</Text>
        <StatusBadge status={complaint.status} />
      </View>

      {complaint.status === "REOPENED" && complaint.dispute_reason && (
        <View style={styles.disputeBanner}>
          <Text style={styles.disputeBannerTitle}>⚠️ You disputed this resolution</Text>
          <Text style={styles.disputeBannerText}>"{complaint.dispute_reason}"</Text>
        </View>
      )}

      <View style={styles.card}>
        <InfoRow label="Issue Type" value={complaint.issue_type ? ISSUE_LABELS[complaint.issue_type] || complaint.issue_type : "Not yet classified"} />
        {complaint.ai_confidence != null && (
          <InfoRow label="AI Confidence" value={`${Math.round(complaint.ai_confidence * 100)}%`} />
        )}
        {complaint.is_demo_prediction && (
          <InfoRow label="AI Status" value="Demo Mode — pending manual review" />
        )}
        <InfoRow label="Department" value={complaint.department || "Not yet assigned"} />
        {complaint.sla_deadline && (
          <InfoRow label="SLA Deadline" value={new Date(complaint.sla_deadline).toLocaleDateString("en-IN")} />
        )}
        <InfoRow
          label="Location"
          value={`${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)}`}
        />
        <InfoRow label="Submitted" value={dateStr} />
        <InfoRow label="Community Confirmations" value={`🔥 ${complaint.upvote_count}${complaint.upvote_count > 1 ? " people" : " person"}`} />
        {complaint.is_escalated && <InfoRow label="Priority" value="⚠️ Escalated (overdue)" />}
      </View>

      {complaint.description ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{complaint.description}</Text>
        </View>
      ) : null}

      {complaint.officer_remarks ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Officer Remarks</Text>
          <Text style={styles.description}>{complaint.officer_remarks}</Text>
        </View>
      ) : null}

      {complaint.resolution_photo ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resolution Photo</Text>
          <Image source={{ uri: imageUrl(complaint.resolution_photo) }} style={styles.image} />
          {complaint.resolved_at && (
            <Text style={styles.resolvedDate}>
              Resolved on {new Date(complaint.resolved_at).toLocaleDateString("en-IN")}
            </Text>
          )}
        </View>
      ) : null}

      {complaint.status === "RESOLVED" && (
        <View style={styles.card}>
          {!showDisputeForm ? (
            <>
              <Text style={styles.sectionTitle}>Not actually fixed?</Text>
              <Text style={styles.description}>
                If this doesn't look resolved to you, you can dispute it — this reopens the
                complaint for an officer to take another look.
              </Text>
              <View style={{ height: 12 }} />
              <PrimaryButton
                title="Dispute this resolution"
                variant="secondary"
                onPress={() => setShowDisputeForm(true)}
              />
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Why isn't this resolved?</Text>
              <TextInput
                style={styles.disputeInput}
                value={disputeReason}
                onChangeText={setDisputeReason}
                placeholder="e.g. The pothole is still there, only partially filled…"
                multiline
                numberOfLines={4}
              />
              <View style={{ height: 10 }} />
              <PrimaryButton title="Submit Dispute" onPress={handleDispute} loading={disputing} />
              <View style={{ height: 8 }} />
              <PrimaryButton
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowDisputeForm(false);
                  setDisputeReason("");
                }}
              />
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    paddingHorizontal: 30,
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 10,
  },
  trackingId: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  disputeBanner: {
    backgroundColor: "#FDECEA",
    borderWidth: 1,
    borderColor: "#F5C6C0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  disputeBannerTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#B91C1C",
    marginBottom: 4,
  },
  disputeBannerText: {
    fontSize: 12.5,
    color: "#7A2E27",
    fontStyle: "italic",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    maxWidth: "60%",
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  resolvedDate: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 8,
  },
  disputeInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    minHeight: 90,
    textAlignVertical: "top",
  },
});
