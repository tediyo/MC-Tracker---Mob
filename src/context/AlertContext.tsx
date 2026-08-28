import React, { createContext, useCallback, useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppModal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { useTheme } from "./ThemeContext";

export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertContextValue {
  /** Drop-in replacement for RN's Alert.alert(title, message?, buttons?) - renders the
   * app's own themed modal instead of the OS-native dialog, so it looks and behaves like
   * every other modal in the app instead of standing out. */
  showAlert: (title: string, message?: string, buttons?: AppAlertButton[]) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

const DEFAULT_BUTTONS: AppAlertButton[] = [{ text: "OK" }];

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [state, setState] = useState<AlertState>({ visible: false, title: "", buttons: DEFAULT_BUTTONS });

  const showAlert = useCallback((title: string, message?: string, buttons?: AppAlertButton[]) => {
    setState({ visible: true, title, message, buttons: buttons && buttons.length > 0 ? buttons : DEFAULT_BUTTONS });
  }, []);

  const close = useCallback(() => setState((s) => ({ ...s, visible: false })), []);

  const handlePress = (button: AppAlertButton) => {
    close();
    button.onPress?.();
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AppModal
        visible={state.visible}
        onClose={close}
        title={state.title}
        footer={
          <View style={state.buttons.length > 1 ? styles.btnRow : styles.singleBtnRow}>
            {state.buttons.map((button, index) => (
              <Button
                key={index}
                title={button.text}
                variant={button.style === "destructive" ? "danger" : button.style === "cancel" ? "outline" : "primary"}
                onPress={() => handlePress(button)}
                // Split evenly for a Cancel/Confirm pair; a lone button (e.g. "OK") keeps
                // its natural compact size instead of stretching across the whole modal.
                style={state.buttons.length > 1 ? styles.btn : undefined}
              />
            ))}
          </View>
        }
      >
        {state.message ? <Text style={[styles.message, { color: theme.textSecondary }]}>{state.message}</Text> : null}
      </AppModal>
    </AlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAppAlert must be used within AlertProvider");
  return ctx;
}

const styles = StyleSheet.create({
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  singleBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
  },
  btn: {
    flex: 1,
  },
});
