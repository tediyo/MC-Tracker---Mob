import React, { createContext, useContext, useEffect, useState } from "react";
import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { FloatingWidgetModule } = NativeModules;

interface LiveModeContextType {
  isLiveMode: boolean;
  setIsLiveMode: (enabled: boolean) => void;
}

const LIVE_MODE_STORAGE_KEY = "@mc-tracker/live-mode-enabled";

const LiveModeContext = createContext<LiveModeContextType>({
  isLiveMode: false,
  setIsLiveMode: () => {},
});

export function LiveModeProvider({ children }: { children: React.ReactNode }) {
  const [isLiveMode, setIsLiveModeState] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem(LIVE_MODE_STORAGE_KEY).then((saved) => {
      const enabled = saved === "true";
      setIsLiveModeState(enabled);
      if (enabled && Platform.OS === "android" && FloatingWidgetModule) {
        FloatingWidgetModule.startOverlay();
      }
    });
  }, []);

  const setIsLiveMode = async (enabled: boolean) => {
    setIsLiveModeState(enabled);
    await AsyncStorage.setItem(LIVE_MODE_STORAGE_KEY, String(enabled));
    if (Platform.OS === "android" && FloatingWidgetModule) {
      if (enabled) {
        FloatingWidgetModule.startOverlay();
      } else {
        FloatingWidgetModule.stopOverlay();
      }
    }
  };

  return (
    <LiveModeContext.Provider value={{ isLiveMode, setIsLiveMode }}>
      {children}
    </LiveModeContext.Provider>
  );
}

export const useLiveMode = () => useContext(LiveModeContext);
