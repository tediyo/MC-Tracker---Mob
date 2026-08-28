import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

export interface LineChartPoint {
  label: string;
  valueA: number;
  valueB?: number;
}

interface LineChartProps {
  data: LineChartPoint[];
  height?: number;
  colorA?: string;
  colorB?: string;
  /** Legend text for each line - e.g. the period each one represents. */
  labelA?: string;
  labelB?: string;
}

/** One graph, colored lines per series - the comparison view's alternative to grouped bars. */
export function SimpleLineChart({
  data,
  height = 180,
  colorA,
  colorB = "#3b82f6",
  labelA = "Period A",
  labelB = "Period B",
}: LineChartProps) {
  const { theme } = useTheme();
  const resolvedColorA = colorA ?? theme.primary;
  if (!data || data.length === 0) return null;

  const hasSeriesB = data.some((d) => d.valueB !== undefined);

  const maxValue = Math.max(
    ...data.flatMap((d) => [d.valueA, d.valueB ?? 0]),
    10,
  );

  const chartWidth = 300;
  const paddingLeft = 30;
  const paddingBottom = 25;
  const chartHeight = height - paddingBottom;
  const usableHeight = chartHeight - 20;
  const slotWidth = (chartWidth - paddingLeft) / data.length;

  const xFor = (index: number) => paddingLeft + slotWidth * (index + 0.5);
  const yFor = (value: number) => chartHeight - (value / maxValue) * usableHeight;

  const pathFor = (key: "valueA" | "valueB") =>
    data
      .map((point, index) => {
        const value = point[key];
        if (value === undefined) return null;
        return `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(value)}`;
      })
      .filter(Boolean)
      .join(" ");

  return (
    <View style={styles.container}>
      <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        {/* Baseline */}
        <Line
          x1={paddingLeft}
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke={theme.cardBorder}
          strokeWidth={1}
        />

        {/* Series A line + dots */}
        <Path d={pathFor("valueA")} stroke={resolvedColorA} strokeWidth={2.5} fill="none" />
        {data.map((point, index) => (
          <Circle key={`a-${index}`} cx={xFor(index)} cy={yFor(point.valueA)} r={4} fill={resolvedColorA} />
        ))}

        {/* Series B line + dots */}
        {hasSeriesB && (
          <>
            <Path d={pathFor("valueB")} stroke={colorB} strokeWidth={2.5} fill="none" />
            {data.map((point, index) =>
              point.valueB === undefined ? null : (
                <Circle key={`b-${index}`} cx={xFor(index)} cy={yFor(point.valueB)} r={4} fill={colorB} />
              ),
            )}
          </>
        )}

        {/* X-axis labels */}
        {data.map((point, index) => (
          <SvgText
            key={index}
            x={xFor(index)}
            y={chartHeight + 15}
            fontSize={10}
            fill={theme.textMuted}
            textAnchor="middle"
          >
            {point.label}
          </SvgText>
        ))}
      </Svg>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: resolvedColorA }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>{labelA}</Text>
        </View>
        {hasSeriesB && (
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colorB }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>{labelB}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 8,
  },
  legendRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
