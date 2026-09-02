import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  percentage,
  size = 130,
  strokeWidth = 12,
  label,
  sublabel,
}: ProgressRingProps) {
  const { theme } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (circumference * clampedPct) / 100;

  const ringColor =
    clampedPct >= 100 ? "#10b981" : clampedPct >= 60 ? theme.primary : "#f59e0b";

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.cardBorder}
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Progress Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        <View style={styles.centerTextContainer}>
          <Text style={[styles.pctText, { color: theme.textPrimary }]}>{clampedPct.toFixed(0)}%</Text>
          <Text style={[styles.pctLabel, { color: theme.textMuted }]}>Reached</Text>
        </View>
      </View>

      {label && <Text style={[styles.titleLabel, { color: theme.textPrimary }]}>{label}</Text>}
      {sublabel && <Text style={[styles.subLabel, { color: theme.textSecondary }]}>{sublabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  centerTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  pctText: {
    fontSize: 22,
    fontWeight: "900",
  },
  pctLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  titleLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  subLabel: {
    fontSize: 12,
    marginTop: 2,
  },
});
