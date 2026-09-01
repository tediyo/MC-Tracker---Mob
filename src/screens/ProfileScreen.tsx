import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import {
  UserCheck,
  Lock,
  Palette,
  Pencil,
  ChevronRight,
  Shield,
  Calendar,
  Globe,
  HelpCircle,
  BookOpen,
  FileText,
  LogOut,
  PiggyBank,
  Receipt,
  Target,
  Check,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCalendar, type CalendarMode } from "../context/CalendarContext";
import { useAppAlert } from "../context/AlertContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { AppModal } from "../components/ui/Modal";
import { supabase } from "../lib/supabase";

interface SettingRowProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  isDestructive?: boolean;
  onPress: () => void;
  showDivider?: boolean;
}

function SettingRow({
  icon: Icon,
  title,
  subtitle,
  isDestructive = false,
  onPress,
  showDivider = true,
}: SettingRowProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.rowContainer,
        showDivider && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Icon size={20} color={isDestructive ? "#ef4444" : theme.textPrimary} />
        <Text style={[styles.rowTitle, { color: isDestructive ? "#ef4444" : theme.textPrimary }]}>
          {title}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        ) : null}
        {!isDestructive && <ChevronRight size={18} color={theme.textMuted} />}
      </View>
    </TouchableOpacity>
  );
}

export function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { themeMode, theme, setThemeMode } = useTheme();
  const { calendarMode, setCalendarMode } = useCalendar();
  const { showAlert } = useAppAlert();

  // Modals state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<string | null>(null);

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
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) throw new Error("Current password is incorrect.");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      closeChangePassword();
      showAlert("Success", "Password updated successfully.");
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
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Profile Card */}
      <Card style={styles.headerCard}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Your Profile</Text>
            <TouchableOpacity onPress={openEditEmail} activeOpacity={0.7} style={styles.editBtn}>
              <Pencil size={14} color={theme.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.pill, { backgroundColor: theme.primaryLight }]}>
            <UserCheck size={12} color={theme.primary} />
            <Text style={[styles.pillText, { color: theme.primary }]}>Active Session</Text>
          </View>
        </View>
      </Card>

      {/* Main Feature Quick Links */}
      <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <SettingRow
          icon={PiggyBank}
          title="Incomes"
          onPress={() => navigation?.navigate?.("Income")}
          showDivider={true}
        />
        <SettingRow
          icon={Receipt}
          title="Costs"
          onPress={() => navigation?.navigate?.("Costs")}
          showDivider={true}
        />
        <SettingRow
          icon={Target}
          title="Plans"
          onPress={() => navigation?.navigate?.("Plans")}
          showDivider={false}
        />
      </View>

      {/* Security & Preferences Section */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Security & Preferences</Text>
      <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <SettingRow
          icon={Calendar}
          title="Calendar System"
          subtitle={calendarMode === "ethiopian" ? "Ethiopian (E.C.)" : "Gregorian (G.C.)"}
          onPress={() => setIsCalendarModalOpen(true)}
          showDivider={true}
        />
        <SettingRow
          icon={Palette}
          title="Theme Mode"
          subtitle={themeMode === "dark" ? "Dark" : "Light"}
          onPress={() => setIsThemeModalOpen(true)}
          showDivider={true}
        />
        <SettingRow
          icon={Shield}
          title="Change Password"
          onPress={() => setIsChangingPassword(true)}
          showDivider={false}
        />
      </View>

      {/* General Section */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>General</Text>
      <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <SettingRow
          icon={Globe}
          title="Language"
          subtitle="English (US)"
          onPress={() => setIsInfoModalOpen("Language preference is set to English (US).")}
          showDivider={true}
        />
        <SettingRow
          icon={HelpCircle}
          title="Help and Support"
          onPress={() =>
            setIsInfoModalOpen(
              "MC Tracker Support\n\nFor assistance or feedback, contact support@mctracker.com or visit the Web Dashboard."
            )
          }
          showDivider={false}
        />
      </View>

      {/* Legal Section */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Legal</Text>
      <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <SettingRow
          icon={BookOpen}
          title="Privacy policy"
          onPress={() =>
            setIsInfoModalOpen(
              "Privacy Policy\n\nYour financial data is encrypted and tied exclusively to your authenticated user account. We do not share your private financial logs with third parties."
            )
          }
          showDivider={true}
        />
        <SettingRow
          icon={FileText}
          title="Terms & Conditions"
          onPress={() =>
            setIsInfoModalOpen(
              "Terms & Conditions\n\nMC Tracker is provided for personal financial management and metrics tracking."
            )
          }
          showDivider={false}
        />
      </View>

      {/* Logout Row */}
      <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginTop: 16 }]}>
        <SettingRow
          icon={LogOut}
          title="Logout"
          isDestructive={true}
          onPress={handleSignOut}
          showDivider={false}
        />
      </View>

      {/* Calendar Selection Modal */}
      <AppModal
        visible={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        title="Calendar System"
      >
        <TouchableOpacity
          style={[
            styles.optionCard,
            { borderColor: calendarMode === "ethiopian" ? theme.primary : theme.cardBorder },
            calendarMode === "ethiopian" && { backgroundColor: theme.primaryLight },
          ]}
          onPress={() => {
            setCalendarMode("ethiopian");
            setIsCalendarModalOpen(false);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.optionInfo}>
            <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>Ethiopian Calendar (E.C.)</Text>
            <Text style={[styles.optionSub, { color: theme.textMuted }]}>
              Default 13-month calendar (Meskerem - Pagume)
            </Text>
          </View>
          {calendarMode === "ethiopian" && <Check size={18} color={theme.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            { borderColor: calendarMode === "gregorian" ? theme.primary : theme.cardBorder },
            calendarMode === "gregorian" && { backgroundColor: theme.primaryLight },
          ]}
          onPress={() => {
            setCalendarMode("gregorian");
            setIsCalendarModalOpen(false);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.optionInfo}>
            <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>Gregorian Calendar (G.C.)</Text>
            <Text style={[styles.optionSub, { color: theme.textMuted }]}>
              Standard 12-month calendar (January - December)
            </Text>
          </View>
          {calendarMode === "gregorian" && <Check size={18} color={theme.primary} />}
        </TouchableOpacity>
      </AppModal>

      {/* Theme Selection Modal */}
      <AppModal
        visible={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        title="Theme Mode"
      >
        <TouchableOpacity
          style={[
            styles.optionCard,
            { borderColor: themeMode === "dark" ? theme.primary : theme.cardBorder },
            themeMode === "dark" && { backgroundColor: theme.primaryLight },
          ]}
          onPress={() => {
            setThemeMode("dark");
            setIsThemeModalOpen(false);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.optionInfo}>
            <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>Dark Mode</Text>
            <Text style={[styles.optionSub, { color: theme.textMuted }]}>High contrast dark visual theme</Text>
          </View>
          {themeMode === "dark" && <Check size={18} color={theme.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            { borderColor: themeMode === "light" ? theme.primary : theme.cardBorder },
            themeMode === "light" && { backgroundColor: theme.primaryLight },
          ]}
          onPress={() => {
            setThemeMode("light");
            setIsThemeModalOpen(false);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.optionInfo}>
            <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>Light Mode</Text>
            <Text style={[styles.optionSub, { color: theme.textMuted }]}>Clean light visual theme</Text>
          </View>
          {themeMode === "light" && <Check size={18} color={theme.primary} />}
        </TouchableOpacity>
      </AppModal>

      {/* General Info Modal */}
      <AppModal
        visible={!!isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(null)}
        title="Information"
      >
        <Text style={[styles.infoModalText, { color: theme.textPrimary }]}>{isInfoModalOpen}</Text>
      </AppModal>

      {/* Edit Email Modal */}
      <AppModal
        visible={isEditingEmail}
        onClose={() => setIsEditingEmail(false)}
        title="Edit Email"
        onConfirm={handleSaveEmail}
        confirmLabel="Save"
        confirmLoading={isSavingEmail}
      >
        <Input
          label="Email Address"
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
  container: { padding: 16, paddingBottom: 120 },
  headerCard: { flexDirection: "row", items: "center", gap: 14, padding: 16, marginBottom: 16 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "900" },
  headerInfo: { flex: 1, gap: 2 },
  headerNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  editBtn: { padding: 4 },
  headerEmail: { fontSize: 12 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  pillText: { fontSize: 10, fontWeight: "700" },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
    paddingLeft: 4,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowSubtitle: {
    fontSize: 13,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
  },
  infoModalText: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 8,
  },
});
