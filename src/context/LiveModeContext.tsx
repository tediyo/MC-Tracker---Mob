import React, { createContext, useContext, useEffect, useState } from "react";
import { NativeModules, Platform, Alert, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { FloatingWidgetModule } = NativeModules;

interface LiveModeContextType {
  isLiveMode: boolean;
  setIsLiveMode: (enabled: boolean) => Promise<boolean>;
}

const LIVE_MODE_STORAGE_KEY = "@mc-tracker/live-mode-enabled";

const LiveModeContext = createContext<LiveModeContextType>({
  isLiveMode: false,
  setIsLiveMode: async () => false,
});

export function LiveModeProvider({ children }: { children: React.ReactNode }) {
  const [isLiveMode, setIsLiveModeState] = useState<boolean>(false);

  // Checks overlay permission on Android
  const checkPermission = async (): Promise<boolean> => {
    if (Platform.OS === "android" && FloatingWidgetModule) {
      try {
        return await FloatingWidgetModule.checkOverlayPermission();
      } catch (e) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    AsyncStorage.getItem(LIVE_MODE_STORAGE_KEY).then(async (saved) => {
      const enabled = saved === "true";
      if (enabled) {
        const hasPerm = await checkPermission();
        if (hasPerm) {
          setIsLiveModeState(true);
          if (Platform.OS === "android" && FloatingWidgetModule) {
            FloatingWidgetModule.startOverlay();
          }
        } else {
          setIsLiveModeState(false);
          await AsyncStorage.setItem(LIVE_MODE_STORAGE_KEY, "false");
        }
      }
    });

    // When app resumes from background (e.g. returning from settings), recheck permission
    const subscription = AppState.addEventListener("change", async (nextState: AppStateStatus) => {
      if (nextState === "active") {
        const saved = await AsyncStorage.getItem(LIVE_MODE_STORAGE_KEY);
        if (saved === "pending" || saved === "true") {
          const hasPerm = await checkPermission();
          if (hasPerm) {
            setIsLiveModeState(true);
            await AsyncStorage.setItem(LIVE_MODE_STORAGE_KEY, "true");
            if (Platform.OS === "android" && FloatingWidgetModule) {
              FloatingWidgetModule.startOverlay();
            }
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const setIsLiveMode = async (enabled: boolean): Promise<boolean> => {
    if (!enabled) {
      setIsLiveModeState(false);
      await AsyncStorage.setItem(LIVE_MODE_STORAGE_KEY, "false");
      if (Platform.OS === "android" && FloatingWidgetModule) {
        FloatingWidgetModule.stopOverlay();
      }
      return true;
    }

    // When turning ON: check permission first
    const hasPerm = await checkPermission();
    if (hasPerm) {
      // Permission already granted: immediately display without asking the user
      setIsLiveModeState(true);
      await AsyncStorage.setItem(LIVE_MODE_STORAGE_KEY, "true");
      if (Platform.OS === "android" && FloatingWidgetModule) {
        FloatingWidgetModule.startOverlay();
      }
      return true;
    }

    // Permission not granted: ask user to turn on setting and navigate there
    Alert.alert(
      "Display Over Other Apps Required",
      "Live Mode requires the 'Display over other apps' setting so the floating tracker can appear. Would you like to turn it on now?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setIsLiveModeState(false);
          },
        },
        {
          text: "Open Settings",
          onPress: async () => {
            await AsyncStorage.setItem(LIVE_MODE_STORAGE_KEY, "pending");
            if (Platform.OS === "android" && FloatingWidgetModule) {
              FloatingWidgetModule.openOverlaySettings();
            }
          },
        },
      ]
    );

    return false;
  };

  return (
    <LiveModeContext.Provider value={{ isLiveMode, setIsLiveMode }}>
      {children}
    </LiveModeContext.Provider>
  );
}

export const useLiveMode = () => useContext(LiveModeContext);
