import React from "react";
import { Modal as RNModal, View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "./Button";

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Standard Cancel/Confirm footer - pass onConfirm to get it. Use `footer` instead for anything non-standard. */
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  cancelLabel?: string;
  footer?: React.ReactNode;
}

/**
 * The one modal shell every screen should use (edit dialogs, create/edit plan, etc.) -
 * keeps the overlay/card chrome, header, and Cancel/Confirm footer uniform app-wide
 * instead of each screen re-implementing it. Backdrop tap and the Android back button
 * both close it, matching the behavior expected of any modal.
 */
export function AppModal({
  visible,
  onClose,
  title,
  children,
  onConfirm,
  confirmLabel = "Save",
  confirmLoading = false,
  confirmDisabled = false,
  cancelLabel = "Cancel",
  footer,
}: AppModalProps) {
  const { theme } = useTheme();

  return (
    <RNModal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[styles.content, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
              <Pressable
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            {children}

            {footer !== undefined ? (
              footer
            ) : (
              <View style={styles.btnRow}>
                <Button title={cancelLabel} variant="outline" onPress={onClose} style={styles.btn} />
                {onConfirm && (
                  <Button
                    title={confirmLabel}
                    onPress={onConfirm}
                    loading={confirmLoading}
                    disabled={confirmDisabled}
                    style={styles.btn}
                  />
                )}
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  btn: {
    flex: 1,
  },
});
