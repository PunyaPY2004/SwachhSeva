import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SplashScreen from "../screens/SplashScreen";
import MainTabs from "./MainTabs";
import ReportIssueScreen from "../screens/ReportIssueScreen";
import SubmissionResultScreen from "../screens/SubmissionResultScreen";
import ComplaintDetailsScreen from "../screens/ComplaintDetailsScreen";
import NearbyComplaintsScreen from "../screens/NearbyComplaintsScreen";
import { useAuth } from "../services/AuthContext";
import { COLORS } from "../utils/constants";

const Stack = createNativeStackNavigator();

const screenHeaderOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "700" },
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function CitizenStack() {
  return (
    <Stack.Navigator screenOptions={screenHeaderOptions}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ title: "Report Issue" }} />
      <Stack.Screen
        name="NearbyComplaints"
        component={NearbyComplaintsScreen}
        options={{ title: "Similar Reports Nearby" }}
      />
      <Stack.Screen
        name="SubmissionResult"
        component={SubmissionResultScreen}
        options={{ title: "Submission Result", headerBackVisible: false }}
      />
      <Stack.Screen
        name="ComplaintDetails"
        component={ComplaintDetailsScreen}
        options={{ title: "Complaint Details" }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, checkingSession } = useAuth();

  if (checkingSession) {
    return <SplashScreen />;
  }

  return <NavigationContainer>{user ? <CitizenStack /> : <AuthStack />}</NavigationContainer>;
}
