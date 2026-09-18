import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import PrimaryButton from "../components/PrimaryButton";
import ComplaintCard from "../components/ComplaintCard";
import { COLORS } from "../utils/constants";
import { fetchMyComplaints } from "../services/complaints";
import { fetchMyEngagement } from "../services/leaderboard";
import { useAuth } from "../services/AuthContext";

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadComplaints = useCallback(async () => {
    try {
      const data = await fetchMyComplaints();
      setComplaints(data.slice(0, 5));
    } catch (err) {
      // Silently ignore on the dashboard; History screen shows full errors.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadEngagement = useCallback(async () => {
    try {
      const data = await fetchMyEngagement();
      setEngagement(data);
    } catch (err) {
      // Non-critical — just skip the score card if it fails.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
      loadEngagement();
    }, [loadComplaints, loadEngagement])
  );

  const openComplaints = complaints.filter((c) => c.status !== "RESOLVED" && c.status !== "REJECTED").length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {user?.name?.split(" ")[0] || "there"} 👋</Text>
        <Text style={styles.headerSubtitle}>See a civic issue? Report it in seconds.</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{complaints.length}</Text>
          <Text style={styles.statLabel}>Recent</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{openComplaints}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
      </View>

      {engagement?.applicable && (
        <TouchableOpacity
          style={styles.scoreCard}
          onPress={() => navigation.navigate("Leaderboard")}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.scoreLabel}>🏆 Your Civic Score</Text>
            <Text style={styles.scoreRank}>
              Rank #{engagement.rank} of {engagement.total_citizens}
            </Text>
          </View>
          <Text style={styles.scoreNumber}>{engagement.score} pts</Text>
        </TouchableOpacity>
      )}

      <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
        <PrimaryButton title="📷  Report an Issue" onPress={() => navigation.navigate("ReportIssue")} />
      </View>

      <Text style={styles.sectionTitle}>Recent Complaints</Text>

      <FlatList
        data={complaints}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadComplaints(); loadEngagement(); }} />}
        renderItem={({ item }) => (
          <ComplaintCard
            complaint={item}
            onPress={() => navigation.navigate("ComplaintDetails", { complaintId: item.id })}
          />
        )}
        ListEmptyComponent={
          !loading && (
            <Text style={styles.empty}>
              No complaints yet. Tap "Report an Issue" above to submit your first one.
            </Text>
          )
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  scoreCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 14,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  scoreRank: {
    fontSize: 11.5,
    color: "#E8F5E9",
    marginTop: 2,
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  empty: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 30,
    lineHeight: 20,
  },
});
