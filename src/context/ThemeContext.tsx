import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors } from "../theme/colors";

type ThemeMode = "dark" | "light";

interface ThemeContextType {
  themeMode: ThemeMode;
  theme: typeof darkColors;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = "@mc-tracker/theme-mode";

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "dark",
  theme: darkColors,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const toggleTheme = async () => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    await setThemeMode(nextMode);
  };

  const theme = themeMode === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeMode, theme, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
