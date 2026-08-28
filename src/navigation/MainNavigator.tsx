import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from "react-native";
import { Home, PiggyBank, Receipt, Target, User } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { DashboardScreen } from "../screens/DashboardScreen";
import { IncomeScreen } from "../screens/IncomeScreen";
import { CostsScreen } from "../screens/CostsScreen";
import { PlansScreen } from "../screens/PlansScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { useAuth } from "../context/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";

export type TabType = "dashboard" | "income" | "costs" | "plans" | "profile";

export function MainNavigator() {
  const { session, loading } = useAuth();
  const { themeMode, theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const isDark = themeMode === "dark";

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Loading MC Tracker Mobile...
        </Text>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case "income":
        return <IncomeScreen />;
      case "costs":
        return <CostsScreen />;
      case "plans":
        return <PlansScreen />;
      case "profile":
        return <ProfileScreen />;
      case "dashboard":
      default:
        return <DashboardScreen />;
    }
  };

  const mainTabs: { type: TabType; label: string; icon: any }[] = [
    { type: "dashboard", label: "Home", icon: Home },
    { type: "income", label: "Income", icon: PiggyBank },
    { type: "costs", label: "Costs", icon: Receipt },
    { type: "plans", label: "Plans", icon: Target },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.screenContainer}>{renderScreen()}</View>

      {/* Floating Translucent Bottom Nav Bar */}
      <View style={styles.floatingNavWrapper} pointerEvents="box-none">
        {/* Main 4-Tab Translucent Pill Container */}
        <View
          style={[
            styles.mainNavPill,
            {
              backgroundColor: theme.pillBg,
              borderColor: theme.cardBorder,
              borderWidth: 1,
            },
          ]}
        >
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.type;

            return (
              <TouchableOpacity
                key={tab.type}
                style={styles.tabButton}
                onPress={() => setActiveTab(tab.type)}
                activeOpacity={0.7}
              >
                <Icon
                  size={22}
                  color={theme.primary}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? theme.primary : theme.pillInactiveText },
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Standalone Circular Profile Action Button */}
        <TouchableOpacity
          style={[
            styles.profileCircleBtn,
            { backgroundColor: theme.primary },
            activeTab === "profile" && [
              styles.profileCircleBtnActive,
              { borderColor: isDark ? "#ffffff" : "#09090b" },
            ],
          ]}
          onPress={() => setActiveTab("profile")}
          activeOpacity={0.8}
        >
          <User size={24} color="#ffffff" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
  },
  screenContainer: {
    flex: 1,
  },
  floatingNavWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 28 : 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "transparent",
    zIndex: 99,
    elevation: 10,
  },
  mainNavPill: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  tabLabelActive: {
    fontWeight: "800",
  },
  profileCircleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  profileCircleBtnActive: {
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
});
