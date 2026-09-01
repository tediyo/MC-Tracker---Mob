import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Animated Shimmer Skeleton loader component for Supabase async data loading state.
 */
export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.cardBorder || "#e2e8f0",
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton placeholder for Summary Cards grid
 */
export function DashboardCardsSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={styles.cardsGrid}>
      {[1, 2, 3, 4].map((key) => (
        <View
          key={key}
          style={[
            styles.cardHalf,
            { backgroundColor: theme.surface, borderColor: theme.cardBorder },
          ]}
        >
          <Skeleton width="60%" height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="85%" height={24} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton placeholder for Charts and Analytics Cards
 */
export function ChartCardSkeleton({ height = 180 }: { height?: number }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.chartCard,
        { backgroundColor: theme.surface, borderColor: theme.cardBorder },
      ]}
    >
      <Skeleton width="50%" height={16} style={{ marginBottom: 14 }} />
      <Skeleton width="100%" height={height} borderRadius={12} />
    </View>
  );
}

/**
 * Skeleton placeholder for History & Feed Item rows
 */
export function ListFeedSkeleton({ count = 3 }: { count?: number }) {
  const { theme } = useTheme();

  return (
    <View style={styles.feedContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.feedRow,
            { backgroundColor: theme.surface, borderColor: theme.cardBorder },
          ]}
        >
          <View style={styles.feedLeft}>
            <Skeleton width={38} height={38} borderRadius={19} />
            <View style={{ gap: 6, flex: 1 }}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={10} />
            </View>
          </View>
          <Skeleton width={70} height={16} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardHalf: {
    width: "48%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  chartCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  feedContainer: {
    gap: 10,
    marginVertical: 8,
  },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
});
