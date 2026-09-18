import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import PrimaryButton from "../components/PrimaryButton";
import StatusBadge from "../components/StatusBadge";
import { COLORS, ISSUE_LABELS } from "../utils/constants";

export default function SubmissionResultScreen({ route, navigation }) {
  const { complaint } = route.params;

  const isDemo = complaint.is_demo_prediction;
  const hasClassification = !!complaint.issue_type;

  return (
    <View style={styles.container}>
      <Text style={styles.checkmark}>✅</Text>
      <Text style={styles.title}>Complaint Submitted</Text>
      <Text style={styles.trackingId}>{complaint.tracking_id}</Text>

      <View style={styles.card}>
        <StatusBadge status={complaint.status} />

        {isDemo && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>
              ⚠️ AI model not loaded — Demo Mode. An officer will manually review and classify this complaint.
            </Text>
          </View>
        )}

        {!isDemo && hasClassification && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Detected Issue</Text>
            <Text style={styles.rowValue}>{ISSUE_LABELS[complaint.issue_type] || complaint.issue_type}</Text>
          </View>
        )}

        {!isDemo && complaint.ai_confidence != null && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>AI Confidence</Text>
            <Text style={styles.rowValue}>{Math.round(complaint.ai_confidence * 100)}%</Text>
          </View>
        )}

        {complaint.department && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Department</Text>
            <Text style={styles.rowValue}>{complaint.department}</Text>
          </View>
        )}

        {complaint.sla_days && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>SLA</Text>
            <Text style={styles.rowValue}>{complaint.sla_days} days</Text>
          </View>
        )}

        {!complaint.department && !isDemo && (
          <Text style={styles.pendingNote}>
            Low AI confidence — this complaint is pending manual review before a department is assigned.
          </Text>
        )}
      </View>

      <Text style={styles.helpText}>
        Save your tracking ID to check on this complaint later from "My Complaints".
      </Text>

      <View style={{ width: "100%", marginTop: 10 }}>
        <PrimaryButton
          title="View Details"
          onPress={() => navigation.replace("ComplaintDetails", { complaintId: complaint.id })}
        />
        <View style={{ height: 12 }} />
        <PrimaryButton title="Back to Home" variant="secondary" onPress={() => navigation.popToTop()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    padding: 24,
    paddingTop: 50,
  },
  checkmark: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 8,
  },
  trackingId: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  demoBanner: {
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  demoBannerText: {
    fontSize: 12,
    color: "#7A5B00",
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  pendingNote: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 14,
    lineHeight: 18,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },
});
