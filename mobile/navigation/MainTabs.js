import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import ComplaintHistoryScreen from "../screens/ComplaintHistoryScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { COLORS } from "../utils/constants";

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: "🏠",
  History: "📋",
  Leaderboard: "🏆",
  Profile: "👤",
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={ComplaintHistoryScreen} options={{ title: "My Complaints" }} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: "Top Reporters" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
