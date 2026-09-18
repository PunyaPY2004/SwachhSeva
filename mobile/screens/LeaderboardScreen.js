import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../utils/constants";
import { fetchCitizenLeaderboard, fetchMyEngagement } from "../services/leaderboard";

const RANK_MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myEngagement, setMyEngagement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [board, mine] = await Promise.all([fetchCitizenLeaderboard(10), fetchMyEngagement()]);
      setLeaderboard(board);
      setMyEngagement(mine);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Reporters</Text>
        <Text style={styles.subtitle}>
          Points for reports you file, bonus points when they get resolved, and for upvoting
          reports that turn out to be real.
        </Text>
      </View>

      {myEngagement?.applicable && (
        <View style={styles.myCard}>
          <View style={styles.myCardLeft}>
            <Text style={styles.myCardRank}>
              {myEngagement.rank ? `#${myEngagement.rank}` : "—"}
            </Text>
            <Text style={styles.myCardOf}>of {myEngagement.total_citizens}</Text>
          </View>
          <View style={styles.myCardRight}>
            <Text style={styles.myCardScore}>{myEngagement.score} pts</Text>
            <Text style={styles.myCardBreakdown}>
              {myEngagement.reports_submitted} reports · {myEngagement.reports_resolved} resolved ·{" "}
              {myEngagement.accurate_upvotes} accurate upvotes
            </Text>
          </View>
        </View>
      )}

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => String(item.citizen_id)}
          contentContainerStyle={{ padding: 20, paddingTop: 6 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          renderItem={({ item, index }) => {
            const rank = index + 1;
            const isMe = myEngagement?.citizen_id === item.citizen_id;
            return (
              <View style={[styles.row, isMe && styles.rowMe]}>
                <Text style={styles.rowRank}>{RANK_MEDALS[rank] || `#${rank}`}</Text>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>
                    {item.name}
                    {isMe ? " (You)" : ""}
                  </Text>
                  <Text style={styles.rowDetail}>
                    {item.reports_submitted} reports · {item.reports_resolved} resolved
                  </Text>
                </View>
                <Text style={styles.rowScore}>{item.score}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No activity yet — be the first to report an issue!</Text>}
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  myCard: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  myCardLeft: {
    alignItems: "center",
    marginRight: 16,
    minWidth: 50,
  },
  myCardRank: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  myCardOf: {
    fontSize: 10,
    color: "#E8F5E9",
  },
  myCardRight: {
    flex: 1,
  },
  myCardScore: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  myCardBreakdown: {
    fontSize: 11,
    color: "#E8F5E9",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowMe: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  rowRank: {
    fontSize: 18,
    width: 40,
    textAlign: "center",
  },
  rowInfo: {
    flex: 1,
    marginLeft: 8,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  rowDetail: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  rowScore: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
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
