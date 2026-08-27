import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { colors } from "../../theme/colors";
import { formatCurrency } from "../../lib/utils";

export interface BarChartGroup {
  label: string;
  valueA: number;
  labelA?: string;
  valueB?: number;
  labelB?: string;
}

interface BarChartProps {
  data: BarChartGroup[];
  height?: number;
  colorA?: string;
  colorB?: string;
}

export function SimpleBarChart({
  data,
  height = 180,
  colorA = colors.primary,
  colorB = "#3b82f6",
}: BarChartProps) {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(
    ...data.flatMap((d) => [d.valueA, d.valueB ?? 0]),
    10,
  );

  const chartWidth = 300;
  const paddingLeft = 30;
  const paddingBottom = 25;
  const chartHeight = height - paddingBottom;
  const groupWidth = (chartWidth - paddingLeft) / data.length;

  return (
    <View style={styles.container}>
      <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        {/* Baseline */}
        <Line
          x1={paddingLeft}
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke={colors.cardBorder}
          strokeWidth={1}
        />

        {data.map((group, idx) => {
          const xGroup = paddingLeft + idx * groupWidth + groupWidth * 0.1;
          const isDual = group.valueB !== undefined;
          const barWidth = isDual ? groupWidth * 0.35 : groupWidth * 0.6;

          const heightA = (group.valueA / maxValue) * (chartHeight - 20);
          const yA = chartHeight - heightA;

          const heightB = isDual ? ((group.valueB || 0) / maxValue) * (chartHeight - 20) : 0;
          const yB = chartHeight - heightB;

          return (
            <G key={idx}>
              {/* Bar A */}
              <Rect
                x={xGroup}
                y={yA}
                width={barWidth}
                height={Math.max(heightA, 2)}
                fill={colorA}
                rx={4}
              />

              {/* Bar B */}
              {isDual && (
                <Rect
                  x={xGroup + barWidth + 4}
                  y={yB}
                  width={barWidth}
                  height={Math.max(heightB, 2)}
                  fill={colorB}
                  rx={4}
                />
              )}

              {/* Label */}
              <SvgText
                x={xGroup + groupWidth * 0.3}
                y={chartHeight + 15}
                fontSize={10}
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {group.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 8,
  },
});
