import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { UserCheck, Lock, Palette, Pencil, ChevronRight, Smartphone, Shield } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useAppAlert } from "../context/AlertContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { SelectPicker } from "../components/ui/SelectPicker";
import { AppModal } from "../components/ui/Modal";
import { supabase } from "../lib/supabase";

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { themeMode, theme, setThemeMode } = useTheme();
  const { showAlert } = useAppAlert();

  // Edit-email modal state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Change-password modal state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const openEditEmail = () => {
    setNewEmail(user?.email || "");
    setIsEditingEmail(true);
  };

  const handleSaveEmail = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed || trimmed === user?.email) {
      setIsEditingEmail(false);
      return;
    }
    setIsSavingEmail(true);
    try {
      // No emailRedirectTo here - the mobile app doesn't have deep-link handling for the
      // confirmation link yet, so it falls back to the Supabase project's default Site URL
      // (the web app's callback route).
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) throw error;
      setIsEditingEmail(false);
      showAlert("Confirmation Sent", `Check ${trimmed} for a link to confirm your new email.`);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to update email");
    } finally {
      setIsSavingEmail(false);
    }
  };

  const closeChangePassword = () => {
    setIsChangingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      showAlert("Error", "New passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      showAlert("Error", "New password must be at least 6 characters.");
      return;
    }
    if (!user?.email) return;

    setIsSavingPassword(true);
    try {
      // Re-authenticate with the current password first, same as the web app - Supabase
      // requires a fresh session to allow a password change.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) throw new Error("Current password is incorrect.");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      closeChangePassword();
      showAlert("Success", "Password updated.");
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

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

      {/* Header Card */}
      <Card style={styles.headerCard}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Your Profile</Text>
          <Text style={[styles.headerEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.pill, { backgroundColor: theme.primaryLight }]}>
            <UserCheck size={12} color={theme.primary} />
            <Text style={[styles.pillText, { color: theme.primary }]}>Active Session</Text>
          </View>
        </View>
      </Card>

      {/* PROFILE section */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>PROFILE</Text>
      <Card>
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
          <Text style={[styles.fieldValue, { color: theme.textPrimary }]}>{user?.email}</Text>
        </View>

        <TouchableOpacity style={styles.editProfileLink} onPress={openEditEmail} activeOpacity={0.7}>
          <Pencil size={14} color={theme.primary} />
          <Text style={[styles.editProfileText, { color: theme.primary }]}>Edit profile</Text>
        </TouchableOpacity>
      </Card>

      {/* Theme card */}
      <Card>
        <View style={styles.cardHeaderRow}>
          <Palette size={18} color={theme.primary} />
          <Text style={[styles.cardHeaderTitle, { color: theme.textPrimary }]}>Theme</Text>
        </View>
        <Text style={[styles.cardHeaderSub, { color: theme.textMuted }]}>
          Current: {themeMode === "dark" ? "Dark" : "Light"}
        </Text>

        <SelectPicker
          options={[
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" },
          ]}
          selectedValue={themeMode}
          onValueChange={(value) => setThemeMode(value)}
        />
      </Card>

      {/* Change password row */}
      <Card>
        <TouchableOpacity style={styles.navRow} onPress={() => setIsChangingPassword(true)} activeOpacity={0.7}>
          <View style={[styles.navRowIcon, { backgroundColor: theme.primaryLight }]}>
            <Lock size={18} color={theme.primary} />
          </View>
          <View style={styles.navRowInfo}>
            <Text style={[styles.navRowTitle, { color: theme.textPrimary }]}>Change password</Text>
            <Text style={[styles.navRowSub, { color: theme.textMuted }]}>Update your password</Text>
          </View>
          <ChevronRight size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* App Details */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>APP</Text>
      <Card>
        {/* <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Smartphone size={16} color={theme.primary} />
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Platform:</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>React Native Mobile</Text>
        </View> */}

        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Shield size={16} color={theme.primary} />
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Calendar Engine:</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>13-Month Ethiopian E.C.</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Version:</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>1.0.0</Text>
        </View>
      </Card>

      {/* Sign Out Button */}
      <Button title="Sign Out" variant="danger" onPress={handleSignOut} style={{ marginTop: 10 }} />

      {/* Edit Email Modal */}
      <AppModal
        visible={isEditingEmail}
        onClose={() => setIsEditingEmail(false)}
        title="Edit Profile"
        onConfirm={handleSaveEmail}
        confirmLabel="Save"
        confirmLoading={isSavingEmail}
      >
        <Input
          label="Email"
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </AppModal>

      {/* Change Password Modal */}
      <AppModal
        visible={isChangingPassword}
        onClose={closeChangePassword}
        title="Change Password"
        onConfirm={handleChangePassword}
        confirmLabel="Update Password"
        confirmLoading={isSavingPassword}
      >
        <Input
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          isPassword
        />
        <Input label="New Password" value={newPassword} onChangeText={setNewPassword} isPassword />
        <Input
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          isPassword
        />
      </AppModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 14 },
  headerCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "900" },
  headerInfo: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  headerEmail: { fontSize: 12 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  pillText: { fontSize: 11, fontWeight: "700" },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  fieldLabel: { fontSize: 13 },
  fieldValue: { fontSize: 13, fontWeight: "700" },
  editProfileLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 12,
  },
  editProfileText: { fontSize: 13, fontWeight: "700" },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardHeaderTitle: { fontSize: 15, fontWeight: "700" },
  cardHeaderSub: { fontSize: 12, marginBottom: 12 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  navRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navRowInfo: { flex: 1 },
  navRowTitle: { fontSize: 14, fontWeight: "700" },
  navRowSub: { fontSize: 12, marginTop: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13, flex: 1 },
  infoVal: { fontSize: 13, fontWeight: "700" },
});
