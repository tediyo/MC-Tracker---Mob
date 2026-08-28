import React from "react";
import { Image, StyleProp, ImageStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

// Same logo files used for the native splash screen (android/app/src/main/res/drawable
// and drawable-night) - kept here too so the JS side (auth screens, the post-splash
// loading screen) can show the identical theme-appropriate logo.
const logoLight = require("../../assets/logo-light.jpg");
const logoDark = require("../../assets/logo-dark.jpg");
const SOURCE_ASPECT_RATIO = 2658 / 1568;

interface AppLogoProps {
  /** Width in pixels - height is derived from the logo's own aspect ratio. */
  width?: number;
  style?: StyleProp<ImageStyle>;
}

export function AppLogo({ width = 160, style }: AppLogoProps) {
  const { themeMode } = useTheme();
  const source = themeMode === "dark" ? logoDark : logoLight;

  return (
    <Image
      source={source}
      style={[{ width, height: width / SOURCE_ASPECT_RATIO }, style]}
      resizeMode="contain"
    />
  );
}
