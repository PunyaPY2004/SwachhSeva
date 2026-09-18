import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from "react-native";
import PrimaryButton from "../components/PrimaryButton";
import StatusBadge from "../components/StatusBadge";
import { COLORS, ISSUE_LABELS } from "../utils/constants";
import { submitComplaint, upvoteComplaint, imageUrl } from "../services/complaints";

export default function NearbyComplaintsScreen({ route, navigation }) {
  const { nearby, pendingSubmission } = route.params;
  const [upvotingId, setUpvotingId] = useState(null);
  const [submittingNew, setSubmittingNew] = useState(false);

  async function handleUpvote(complaintId) {
    setUpvotingId(complaintId);
    try {
      const updated = await upvoteComplaint(complaintId);
      Alert.alert(
        "Thanks for confirming!",
        `You've confirmed this report. It now has ${updated.upvote_count} confirmations, which helps officers prioritize it.`,
        [{ text: "OK", onPress: () => navigation.popToTop() }]
      );
    } catch (err) {
      Alert.alert("Couldn't confirm", err.message);
    } finally {
      setUpvotingId(null);
    }
  }

  async function handleSubmitAnyway() {
    setSubmittingNew(true);
    try {
      const complaint = await submitComplaint(pendingSubmission);
      navigation.replace("SubmissionResult", { complaint });
    } catch (err) {
      Alert.alert("Submission failed", err.message);
      setSubmittingNew(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Is this the same issue?</Text>
        <Text style={styles.subtitle}>
          We found {nearby.length} similar report{nearby.length > 1 ? "s" : ""} nearby. Confirming an
          existing report helps officers prioritize it, instead of creating a duplicate.
        </Text>
      </View>

      <FlatList
        data={nearby}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingTop: 0 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: imageUrl(item.image_path) }} style={styles.thumb} />
            <View style={styles.cardInfo}>
              <Text style={styles.tracking}>{item.tracking_id}</Text>
              <Text style={styles.issue}>
                {item.issue_type ? ISSUE_LABELS[item.issue_type] || item.issue_type : "Awaiting classification"}
              </Text>
              <Text style={styles.distance}>📍 ~{Math.round(item.distance_meters)}m away</Text>
              <View style={styles.rowBetween}>
                <StatusBadge status={item.status} />
                <Text style={styles.upvoteCount}>🔥 {item.upvote_count} confirmed</Text>
              </View>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleUpvote(item.id)}
                disabled={upvotingId === item.id}
              >
                <Text style={styles.confirmButtonText}>
                  {upvotingId === item.id ? "Confirming…" : "✓ Yes, same issue — confirm it"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 8 }}>
            <PrimaryButton
              title="None of these — submit as a new report"
              variant="secondary"
              onPress={handleSubmitAnyway}
              loading={submittingNew}
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 6,
    lineHeight: 19,
  },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tracking: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.text,
  },
  issue: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
    marginBottom: 6,
  },
  distance: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  upvoteCount: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accent,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "700",
  },
});
