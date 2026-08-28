import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { UserCheck, LogOut, Shield, Smartphone, Sun, Moon } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useAppAlert } from "../context/AlertContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { themeMode, theme, toggleTheme, setThemeMode } = useTheme();
  const { showAlert } = useAppAlert();

  const handleSignOut = () => {
    showAlert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  return (
    <ScrollView style={[styles.flex, { backgroundColor: theme.background }]} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Account & Profile</Text>

      {/* User Info Card */}
      <Card style={styles.userCard}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.userEmail, { color: theme.textPrimary }]}>{user?.email}</Text>
          <View style={styles.activeRow}>
            <UserCheck size={14} color={theme.primary} />
            <Text style={[styles.activeText, { color: theme.primary }]}>Active Session</Text>
          </View>
        </View>
      </Card>

      {/* Appearance & Theme Selector Card */}
      <Card>
        <Text style={[styles.sectionHeader, { color: theme.textPrimary }]}>Appearance & Theme</Text>
        <Text style={[styles.themeSubtitle, { color: theme.textMuted }]}>
          Select your preferred background theme style:
        </Text>

        <View style={styles.themeToggleRow}>
          {/* Dark Mode (Pure Black #000000) Button */}
          <TouchableOpacity
            style={[
              styles.themeOptionBtn,
              { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
              themeMode === "dark" && [styles.themeOptionBtnActive, { borderColor: theme.primary }],
            ]}
            onPress={() => setThemeMode("dark")}
            activeOpacity={0.8}
          >
            <Moon size={20} color={themeMode === "dark" ? theme.primary : theme.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.themeOptionTitle, { color: theme.textPrimary }]}>Dark Mode</Text>
              <Text style={[styles.themeOptionSub, { color: theme.textMuted }]}>Pure Black (#000000)</Text>
            </View>
          </TouchableOpacity>

          {/* Light Mode (Pure White #ffffff) Button */}
          <TouchableOpacity
            style={[
              styles.themeOptionBtn,
              { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
              themeMode === "light" && [styles.themeOptionBtnActive, { borderColor: theme.primary }],
            ]}
            onPress={() => setThemeMode("light")}
            activeOpacity={0.8}
          >
            <Sun size={20} color={themeMode === "light" ? theme.primary : theme.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.themeOptionTitle, { color: theme.textPrimary }]}>Light Mode</Text>
              <Text style={[styles.themeOptionSub, { color: theme.textMuted }]}>Pure White (#ffffff)</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Card>

      {/* App Info Card */}
      <Card>
        <Text style={[styles.sectionHeader, { color: theme.textPrimary }]}>App Details</Text>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Smartphone size={16} color={theme.primary} />
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Platform:</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>React Native Mobile</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Shield size={16} color={theme.primary} />
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Calendar Engine:</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>13-Month Ethiopian E.C.</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Version:</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>1.0.0</Text>
        </View>
      </Card>

      {/* Sign Out Button */}
      <Button
        title="Sign Out"
        variant="danger"
        onPress={handleSignOut}
        style={{ marginTop: 10 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 14 },
  userCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "900" },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 15, fontWeight: "700" },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  activeText: { fontSize: 12, fontWeight: "600" },
  sectionHeader: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  themeSubtitle: { fontSize: 12, marginBottom: 12 },
  themeToggleRow: { gap: 10 },
  themeOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  themeOptionBtnActive: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  themeOptionTitle: { fontSize: 13, fontWeight: "700" },
  themeOptionSub: { fontSize: 11, marginTop: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13, flex: 1 },
  infoVal: { fontSize: 13, fontWeight: "700" },
});
