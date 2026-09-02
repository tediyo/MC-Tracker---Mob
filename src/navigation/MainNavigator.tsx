import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, NativeModules, AppState } from "react-native";
import { Home, TrendingUp, Receipt, Target, User } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { DashboardScreen } from "../screens/DashboardScreen";
import { IncomeScreen } from "../screens/IncomeScreen";
import { CostsScreen } from "../screens/CostsScreen";
import { PlansScreen } from "../screens/PlansScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { HistoryScreen, type HistoryTab } from "../screens/HistoryScreen";
import { useAuth } from "../context/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { AppLogo } from "../components/ui/AppLogo";
import { QuickAddModal } from "../components/ui/QuickAddModal";

const { FloatingWidgetModule } = NativeModules;

export type TabType = "dashboard" | "income" | "costs" | "plans" | "profile" | "history";

export function MainNavigator() {
  const { session, loading } = useAuth();
  const { themeMode, theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [historySource, setHistorySource] = useState<HistoryTab>("income");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const isDark = themeMode === "dark";

  const checkQuickAddIntent = useCallback(() => {
    if (Platform.OS === "android" && FloatingWidgetModule?.consumeQuickAddRequest) {
      FloatingWidgetModule.consumeQuickAddRequest().then((requested: boolean) => {
        if (requested) {
          setIsQuickAddOpen(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    checkQuickAddIntent();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkQuickAddIntent();
      }
    });
    return () => sub.remove();
  }, [checkQuickAddIntent]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <AppLogo width={220} />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const openHistory = (source: HistoryTab) => {
    setHistorySource(source);
    setActiveTab("history");
  };

  const renderScreen = () => {
    switch (activeTab) {
      case "income":
        return <IncomeScreen onViewHistory={() => openHistory("income")} />;
      case "costs":
        return <CostsScreen onViewHistory={() => openHistory("costs")} />;
      case "plans":
        return <PlansScreen />;
      case "profile":
        return <ProfileScreen onNavigate={(tab) => setActiveTab(tab)} />;
      case "history":
        return <HistoryScreen initialTab={historySource} onBack={() => setActiveTab(historySource)} />;
      case "dashboard":
      default:
        return <DashboardScreen />;
    }
  };

  const mainTabs: { type: TabType; label: string; icon: any }[] = [
    { type: "dashboard", label: "Home", icon: Home },
    { type: "income", label: "Income", icon: TrendingUp },
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

      {/* Quick Add Expense & Income Modal opened directly when tapping the Live Floating Overlay */}
      <QuickAddModal visible={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
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
