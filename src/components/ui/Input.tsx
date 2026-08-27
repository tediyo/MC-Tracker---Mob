import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, TouchableOpacity } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  required = false,
  containerStyle,
  style,
  isPassword,
  secureTextEntry,
  rightElement,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const isSecure = isPassword ? !showPassword : secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: error ? theme.danger : theme.textSecondary }]}>
          {label} {required && <Text style={{ color: theme.danger }}>*</Text>}
        </Text>
      )}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              borderColor: error ? theme.danger : theme.cardBorder,
              color: theme.textPrimary,
            },
            (isPassword || rightElement) ? styles.inputWithRight : null,
            style,
          ]}
          secureTextEntry={isSecure}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showPassword ? (
              <EyeOff size={18} color={theme.textMuted} />
            ) : (
              <Eye size={18} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        )}
        {rightElement}
      </View>
      {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputWithRight: {
    paddingRight: 44,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },
});
