import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import StatusBadge from "./StatusBadge";
import { ISSUE_LABELS, COLORS } from "../utils/constants";
import { imageUrl } from "../services/complaints";

export default function ComplaintCard({ complaint, onPress }) {
  const issueLabel = complaint.issue_type
    ? ISSUE_LABELS[complaint.issue_type] || complaint.issue_type
    : "Awaiting classification";

  const dateStr = complaint.created_at
    ? new Date(complaint.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: imageUrl(complaint.image_path) }} style={styles.thumb} />
      <View style={styles.info}>
        <View style={styles.rowBetween}>
          <Text style={styles.tracking}>{complaint.tracking_id}</Text>
          {complaint.upvote_count > 1 && (
            <Text style={styles.upvotes}>🔥 {complaint.upvote_count}</Text>
          )}
        </View>
        <Text style={styles.issue}>{issueLabel}</Text>
        <Text style={styles.date}>{dateStr}</Text>
        <View style={styles.rowBetween}>
          <StatusBadge status={complaint.status} />
          {complaint.is_escalated && <Text style={styles.escalated}>⚠️ Escalated</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  tracking: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  issue: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
    marginBottom: 4,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  upvotes: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accent,
  },
  escalated: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.danger,
  },
});
