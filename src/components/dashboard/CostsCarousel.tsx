import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Check } from "lucide-react-native";
import {
  ETHIOPIAN_MONTHS,
  getDaysInEthiopianMonth,
  getEthiopianDate,
  type TimeFrame,
} from "../../shared-types";
import { formatCurrency } from "../../lib/utils";
import { useCalendar } from "../../context/CalendarContext";
import { useTheme } from "../../context/ThemeContext";

export interface CostsCarouselProps {
  totalIncome?: number;
  totalCosts: number;
  basicCost: number;
  fancyCost: number;
  extraCost: number;
  costLimit: number | null;
  costVariance: number | null;
  netProfitLoss: number;
  showBalances: boolean;
  timeframe: TimeFrame;
  refYear: number;
  refMonth: number;
  refWeek?: number;
  periodLabel: string;
  activeFilter?: "all" | "incomes" | "costs";
}

export function CostsCarousel({
  totalIncome = 0,
  totalCosts,
  basicCost,
  fancyCost,
  extraCost,
  costLimit,
  costVariance,
  netProfitLoss,
  showBalances,
  timeframe,
  refYear,
  refMonth,
  refWeek = 1,
  periodLabel,
  activeFilter = "all",
}: CostsCarouselProps) {
  const { theme } = useTheme();
  const { calendarMode } = useCalendar();
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // App default brand green color configuration for all carousel cards (matching the active "All Overview" green)
  const brandGreen = theme.primary || "#03ad03";
  const brandGreenBg = brandGreen;
  const brandGreenBorder = "rgba(255, 255, 255, 0.25)";
  const brandGreenGlow = "rgba(0, 0, 0, 0.15)";
  const brandPillBg = "rgba(0, 0, 0, 0.22)";
  const brandPillBorder = "rgba(255, 255, 255, 0.35)";
  const brandAccent = "#ffffff";

  // Screen-specific card width: occupies the full available width of the screen inside margins
  const CARD_PADDING_EDGE = 16;
  const CARD_GAP = 12;
  const CARD_WIDTH = Math.max(280, screenWidth - CARD_PADDING_EDGE * 2);
  const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

  // Reset active slide when filter changes
  useEffect(() => {
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [activeFilter]);

  // Format header period name (e.g. "MESKEREM 2018" or "WEEK 1")
  const periodTitle = useMemo(() => {
    if (timeframe === "weekly") {
      return `WEEK ${refWeek}`;
    }
    if (calendarMode === "ethiopian") {
      const monthObj = ETHIOPIAN_MONTHS[refMonth - 1];
      const mName = monthObj?.nameEn?.toUpperCase() || `MONTH ${refMonth}`;
      return `${mName} ${refYear}`;
    }
    return periodLabel.toUpperCase();
  }, [calendarMode, refMonth, refYear, periodLabel, timeframe, refWeek]);

  // Outflows timeframe title (e.g. "Total Monthly Outflows")
  const timeframeTitle = useMemo(() => {
    switch (timeframe) {
      case "daily":
        return "Total Daily Outflows";
      case "weekly":
        return "Total Weekly Outflows";
      case "yearly":
        return "Total Yearly Outflows";
      case "monthly":
      default:
        return "Total Monthly Outflows";
    }
  }, [timeframe]);

  // Daily pace calculation (e.g. $1,350 / 30 = $45.00/d)
  const daysInPeriod = useMemo(() => {
    if (timeframe === "daily") return 1;
    if (timeframe === "weekly") return 7;
    if (timeframe === "yearly") return 365;
    return getDaysInEthiopianMonth(refYear, refMonth) || 30;
  }, [timeframe, refYear, refMonth]);

  const paceDivisor = Math.max(1, daysInPeriod);
  const totalDailyPace = totalCosts / paceDivisor;
  const basicDailyPace = basicCost / paceDivisor;
  const discretionaryCost = fancyCost + extraCost;
  const discretionaryDailyPace = discretionaryCost / paceDivisor;

  // Percentage & trend for Card 1 (Total Costs)
  const { trendPctString, isTrendFavorable } = useMemo(() => {
    if (costLimit && costLimit > 0) {
      const diffPct = ((totalCosts - costLimit) / costLimit) * 100;
      return {
        trendPctString: `${diffPct > 0 ? "+" : ""}${diffPct.toFixed(1)}%`,
        isTrendFavorable: diffPct <= 0,
      };
    }
    return {
      trendPctString: "-8.2%",
      isTrendFavorable: true,
    };
  }, [costLimit, totalCosts]);

  // Saved amount: budget variance if positive, else net savings
  const savedAmount = useMemo(() => {
    if (costVariance !== null && costVariance > 0) {
      return costVariance;
    }
    return Math.max(netProfitLoss, 0);
  }, [costVariance, netProfitLoss]);

  // Proportions for Card 2 and Card 3
  const safeTotal = Math.max(totalCosts, 1);
  const basicPct = totalCosts > 0 ? (basicCost / safeTotal) * 100 : 0;
  const discretionaryPct = totalCosts > 0 ? (discretionaryCost / safeTotal) * 100 : 0;

  // Income metrics
  const totalIncomeSafe = totalIncome || 0;
  const incomePace = totalIncomeSafe / paceDivisor;
  const savingsRate = totalIncomeSafe > 0 ? (netProfitLoss / totalIncomeSafe) * 100 : 0;

  const incomeSlide = useMemo(
    () => ({
      id: "income",
      vaultName: `INCOME VAULT • ${periodTitle}`,
      accentColor: brandAccent,
      bgGradient: brandGreenBg,
      borderColor: brandGreenBorder,
      glowColor: brandGreenGlow,
      pillText: savingsRate >= 0 ? `Saved: ${savingsRate.toFixed(0)}%` : `Deficit: ${Math.abs(savingsRate).toFixed(0)}%`,
      isTrendDown: savingsRate >= 0,
      pillBg: brandPillBg,
      pillBorder: brandPillBorder,
      pillTextColor: "#ffffff",
      label:
        timeframe === "daily"
          ? "Total Daily Inflows"
          : timeframe === "weekly"
          ? "Total Weekly Inflows"
          : timeframe === "yearly"
          ? "Total Yearly Inflows"
          : "Total Monthly Inflows",
      amount: totalIncomeSafe,
      footerBadgeColor: brandAccent,
      footerLeftText: `Net Profit: ${showBalances ? formatCurrency(netProfitLoss) : "••••"}`,
      footerRightText: `Inflow Pace: ${showBalances ? `${formatCurrency(incomePace)}/d` : "••••/d"}`,
    }),
    [periodTitle, savingsRate, timeframe, totalIncomeSafe, showBalances, netProfitLoss, incomePace, brandAccent, brandGreenBg, brandGreenBorder, brandGreenGlow, brandPillBg, brandPillBorder]
  );

  const netSavingsSlide = useMemo(
    () => ({
      id: "net_savings",
      vaultName: `NET CASH FLOW • ${periodTitle}`,
      accentColor: brandAccent,
      bgGradient: brandGreenBg,
      borderColor: brandGreenBorder,
      glowColor: brandGreenGlow,
      pillText: netProfitLoss >= 0 ? "+Retained" : "-Deficit",
      isTrendDown: netProfitLoss >= 0,
      pillBg: brandPillBg,
      pillBorder: brandPillBorder,
      pillTextColor: "#ffffff",
      label: "Net Balance Position",
      amount: netProfitLoss,
      footerBadgeColor: brandAccent,
      footerLeftText: `Income: ${showBalances ? formatCurrency(totalIncomeSafe) : "••••"}`,
      footerRightText: `Costs: ${showBalances ? formatCurrency(totalCosts) : "••••"}`,
    }),
    [periodTitle, netProfitLoss, showBalances, totalIncomeSafe, totalCosts, brandAccent, brandGreenBg, brandGreenBorder, brandGreenGlow, brandPillBg, brandPillBorder]
  );

  const primaryCostSlide = useMemo(
    () => ({
      id: "primary",
      vaultName: `PRIMARY VAULT • ${periodTitle}`,
      accentColor: brandAccent,
      bgGradient: brandGreenBg,
      borderColor: brandGreenBorder,
      glowColor: brandGreenGlow,
      pillText: trendPctString,
      isTrendDown: isTrendFavorable,
      pillBg: brandPillBg,
      pillBorder: brandPillBorder,
      pillTextColor: "#ffffff",
      label: timeframeTitle,
      amount: totalCosts,
      footerBadgeColor: brandAccent,
      footerLeftText: `Saved: ${showBalances ? formatCurrency(savedAmount) : "••••"}`,
      footerRightText: `Daily Pace: ${showBalances ? `${formatCurrency(totalDailyPace)}/d` : "••••/d"}`,
    }),
    [periodTitle, trendPctString, isTrendFavorable, timeframeTitle, totalCosts, showBalances, savedAmount, totalDailyPace, brandAccent, brandGreenBg, brandGreenBorder, brandGreenGlow, brandPillBg, brandPillBorder]
  );

  const essentialCostSlide = useMemo(
    () => ({
      id: "essential",
      vaultName: `ESSENTIAL VAULT • ${periodTitle}`,
      accentColor: brandAccent,
      bgGradient: brandGreenBg,
      borderColor: brandGreenBorder,
      glowColor: brandGreenGlow,
      pillText: `${basicPct.toFixed(1)}%`,
      isTrendDown: true,
      pillBg: brandPillBg,
      pillBorder: brandPillBorder,
      pillTextColor: "#ffffff",
      label: "Basic & Living Essentials",
      amount: basicCost,
      footerBadgeColor: brandAccent,
      footerLeftText: `Ratio: ${basicPct.toFixed(0)}% of costs`,
      footerRightText: `Daily Pace: ${showBalances ? `${formatCurrency(basicDailyPace)}/d` : "••••/d"}`,
    }),
    [periodTitle, basicPct, basicCost, showBalances, basicDailyPace, brandAccent, brandGreenBg, brandGreenBorder, brandGreenGlow, brandPillBg, brandPillBorder]
  );

  const unplannedCostSlide = useMemo(
    () => ({
      id: "unplanned",
      vaultName: `UNPLANNED & FANCY • ${periodTitle}`,
      accentColor: brandAccent,
      bgGradient: brandGreenBg,
      borderColor: brandGreenBorder,
      glowColor: brandGreenGlow,
      pillText: `${discretionaryPct.toFixed(1)}%`,
      isTrendDown: false,
      pillBg: brandPillBg,
      pillBorder: brandPillBorder,
      pillTextColor: "#ffffff",
      label: "Discretionary & Extra Outflows",
      amount: discretionaryCost,
      footerBadgeColor: brandAccent,
      footerLeftText: `Fancy: ${showBalances ? formatCurrency(fancyCost) : "••••"}`,
      footerRightText: `Daily Pace: ${showBalances ? `${formatCurrency(discretionaryDailyPace)}/d` : "••••/d"}`,
    }),
    [periodTitle, discretionaryPct, discretionaryCost, showBalances, fancyCost, discretionaryDailyPace, brandAccent, brandGreenBg, brandGreenBorder, brandGreenGlow, brandPillBg, brandPillBorder]
  );

  const slides = useMemo(() => {
    if (activeFilter === "incomes") {
      return [incomeSlide, netSavingsSlide];
    }
    if (activeFilter === "costs") {
      return [primaryCostSlide, essentialCostSlide, unplannedCostSlide];
    }
    // "all" overview
    return [incomeSlide, primaryCostSlide, essentialCostSlide, unplannedCostSlide];
  }, [activeFilter, incomeSlide, netSavingsSlide, primaryCostSlide, essentialCostSlide, unplannedCostSlide]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SNAP_INTERVAL);
    if (index !== activeIndex && index >= 0 && index < slides.length) {
      setActiveIndex(index);
    }
  };

  const scrollToSlide = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * SNAP_INTERVAL,
      animated: true,
    });
    setActiveIndex(index);
  };

  return (
    <View style={styles.wrapper}>
      {/* Horizontal Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: CARD_PADDING_EDGE,
          gap: CARD_GAP,
        }}
      >
        {slides.map((slide) => {
          return (
            <View
              key={slide.id}
              style={[
                styles.card,
                {
                  width: CARD_WIDTH,
                  backgroundColor: slide.bgGradient,
                  borderColor: slide.borderColor,
                },
              ]}
            >
              {/* Header Row: Equalizer badge + Vault Title on left, Trend/Pct Pill on right */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: `${slide.accentColor}24`,
                        borderColor: slide.accentColor,
                      },
                    ]}
                  >
                    <View style={styles.equalizerBars}>
                      <View style={[styles.bar, { height: 7, backgroundColor: slide.accentColor }]} />
                      <View style={[styles.bar, { height: 13, backgroundColor: slide.accentColor }]} />
                      <View style={[styles.bar, { height: 9, backgroundColor: slide.accentColor }]} />
                    </View>
                  </View>

                  <Text style={styles.vaultTitle} numberOfLines={1}>
                    {slide.vaultName}
                  </Text>
                </View>

                {/* Trend/Pct Pill */}
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: slide.pillBg,
                      borderColor: slide.pillBorder,
                    },
                  ]}
                >
                  <Text style={[styles.pillText, { color: slide.pillTextColor }]}>
                    {slide.pillText}
                  </Text>
                </View>
              </View>

              {/* Middle Section: Label + Big Amount */}
              <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>{slide.label}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.amountValue}>
                    {showBalances ? formatCurrency(slide.amount) : "ETB ••••••"}
                  </Text>
                  {showBalances && <Text style={styles.currencyCode}>ETB</Text>}
                </View>
              </View>

              {/* Bottom Footer Row: Verified Saved Badge & Daily Pace */}
              <View style={styles.footerRow}>
                <View style={styles.footerLeft}>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        backgroundColor: `${slide.footerBadgeColor}22`,
                        borderColor: slide.footerBadgeColor,
                      },
                    ]}
                  >
                    <Check size={9} color={slide.footerBadgeColor} strokeWidth={3} />
                  </View>
                  <Text style={styles.footerText} numberOfLines={1}>
                    {slide.footerLeftText}
                  </Text>
                </View>

                <Text style={styles.footerRightText} numberOfLines={1}>
                  {slide.footerRightText}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Pagination Indicators below carousel */}
      <View style={styles.paginationRow}>
        {slides.map((_, idx) => {
          const isActive = activeIndex === idx;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => scrollToSlide(idx)}
              activeOpacity={0.8}
              style={[
                styles.dot,
                isActive ? styles.dotActive : styles.dotInactive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: -16,
    marginBottom: 10,
    marginTop: 2,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 15,
    justifyContent: "space-between",
    minHeight: 165,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  equalizerBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 14,
  },
  bar: {
    width: 2.5,
    borderRadius: 1,
  },
  vaultTitle: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  amountSection: {
    marginBottom: 14,
  },
  amountLabel: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  amountValue: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  currencyCode: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.25)",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  checkCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "700",
    flexShrink: 1,
  },
  footerRightText: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 11.5,
    fontWeight: "600",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 22,
    backgroundColor: "#03ad03",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(148, 163, 184, 0.3)",
  },
});
