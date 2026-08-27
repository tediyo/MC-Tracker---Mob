import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const { theme } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: theme.cardBorder,
        };
      case "secondary":
        return {
          backgroundColor: theme.primaryLight,
        };
      case "danger":
        return {
          backgroundColor: theme.danger,
        };
      case "primary":
      default:
        return {
          backgroundColor: theme.primary,
        };
    }
  };

  const getTextColorStyle = (): TextStyle => {
    switch (variant) {
      case "outline":
        return { color: theme.textPrimary };
      case "secondary":
        return { color: theme.primary };
      case "danger":
      case "primary":
      default:
        return { color: "#ffffff" };
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        getVariantStyle(),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? theme.primary : "#ffffff"} size="small" />
      ) : (
        <Text style={[styles.baseText, getTextColorStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    alignSelf: "flex-end", // Modern compact width aligned to form container
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  baseText: {
    fontSize: 13,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
});
