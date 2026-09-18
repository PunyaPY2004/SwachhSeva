import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ComplaintCard from "../components/ComplaintCard";
import { COLORS } from "../utils/constants";
import { fetchMyComplaints } from "../services/complaints";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "PENDING_REVIEW", label: "Pending" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "REOPENED", label: "Disputed" },
];

export default function ComplaintHistoryScreen({ navigation }) {
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchMyComplaints();
      setComplaints(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visible = filter === "ALL" ? complaints : complaints.filter((c) => c.status === filter);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Complaints</Text>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, paddingTop: 6 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => (
            <ComplaintCard
              complaint={item}
              onPress={() => navigation.navigate("ComplaintDetails", { complaintId: item.id })}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No complaints in this category.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 12,
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  filterTextActive: {
    color: "#fff",
  },
  empty: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 30,
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: "center",
    marginTop: 30,
    paddingHorizontal: 30,
  },
});
