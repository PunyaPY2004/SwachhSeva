import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../utils/constants";

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌱</Text>
      <Text style={styles.title}>SwachhSeva</Text>
      <Text style={styles.subtitle}>Smart Civic Issue Reporting</Text>
      <ActivityIndicator color="#fff" style={{ marginTop: 30 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: "#E8F5E9",
    fontSize: 14,
    marginTop: 6,
  },
});
