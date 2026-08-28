import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, G, Circle } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";
import { formatCurrency } from "../../lib/utils";

export interface PieChartSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartSlice[];
  size?: number;
  showBalances?: boolean;
  /** Center label above the total value. Defaults to "Total Costs" since that's the only
   * caller historically - pass an explicit label for charts summing anything else. */
  totalLabel?: string;
  /** Renders text/legend colors from a fixed light palette instead of the active app theme.
   * Used only when this chart is captured off-screen for the PDF report: the printed page
   * is always white regardless of whether the app itself is in dark mode, so reusing
   * theme colors there baked dark-mode's near-black text/background into the export. */
  forceLightMode?: boolean;
}

const LIGHT_CAPTURE_COLORS = {
  textMuted: "#71717a",
  textPrimary: "#09090b",
  textSecondary: "#475569",
  border: "#e2e8f0",
};

export function SimplePieChart({
  data,
  size = 160,
  showBalances = true,
  totalLabel = "Total Costs",
  forceLightMode = false,
}: PieChartProps) {
  const { theme: appTheme } = useTheme();
  const theme = forceLightMode ? LIGHT_CAPTURE_COLORS : appTheme;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <View style={[styles.emptyContainer, { height: size }]}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No expenses logged for this period</Text>
      </View>
    );
  }

  const radius = size / 2;
  const strokeWidth = 24;
  const innerRadius = radius - strokeWidth;
  const center = radius;

  let cumulativeAngle = 0;

  const createArc = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const x3 = center + innerRadius * Math.cos(endRad);
    const y3 = center + innerRadius * Math.sin(endRad);
    const x4 = center + innerRadius * Math.cos(startRad);
    const y4 = center + innerRadius * Math.sin(startRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, position: "relative", alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          <G>
            {data.map((slice, index) => {
              if (slice.value === 0) return null;
              const angle = (slice.value / total) * 360;
              const startAngle = cumulativeAngle;
              const endAngle = cumulativeAngle + (angle >= 360 ? 359.99 : angle);
              cumulativeAngle += angle;

              return (
                <Path
                  key={index}
                  d={createArc(startAngle, endAngle)}
                  fill={slice.color}
                />
              );
            })}
          </G>
        </Svg>
        <View style={styles.centerTextContainer}>
          <Text style={[styles.totalLabel, { color: theme.textMuted }]}>{totalLabel}</Text>
          <Text style={[styles.totalValue, { color: theme.textPrimary }]}>
            {showBalances ? formatCurrency(total) : "ETB ••••••"}
          </Text>
        </View>
      </View>

      {/* Legend List */}
      <View style={styles.legendContainer}>
        {data.map((slice, idx) => {
          const percent = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0.0";
          return (
            <View key={idx} style={[styles.legendItem, { borderBottomColor: theme.border }]}>
              <View style={styles.legendLeft}>
                <View style={[styles.colorDot, { backgroundColor: slice.color }]} />
                <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>{slice.label}</Text>
              </View>
              <Text style={[styles.legendValue, { color: theme.textPrimary }]}>
                {showBalances ? formatCurrency(slice.value) : "ETB ••••••"} ({percent}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 10,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
  },
  centerTextContainer: {
    position: "absolute",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  legendContainer: {
    width: "100%",
    marginTop: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  legendValue: {
    fontSize: 12,
    fontWeight: "700",
  },
});
