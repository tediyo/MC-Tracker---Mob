import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Download,
  Plus,
  Target,
} from "lucide-react-native";
import {
  ETHIOPIAN_MONTHS,
  getEthiopianDate,
  toGregorianDate,
  getDaysInEthiopianMonth,
  COST_CATEGORY_LABELS,
  COST_SUBCATEGORY_LABELS,
  type CostSubcategory,
  type TimeFrame,
} from "../shared-types";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCalendar } from "../context/CalendarContext";
import { useAppAlert } from "../context/AlertContext";
import { Card } from "../components/ui/Card";
import { SelectPicker } from "../components/ui/SelectPicker";
import { EthiopianDatePicker } from "../components/ui/EthiopianDatePicker";
import { SimpleBarChart } from "../components/charts/BarChart";
import { SimpleLineChart } from "../components/charts/LineChart";
import { SimplePieChart } from "../components/charts/PieChart";
import { ProgressRing } from "../components/charts/ProgressRing";
import { QuickAddModal } from "../components/ui/QuickAddModal";
import { DashboardCardsSkeleton, ChartCardSkeleton } from "../components/ui/Skeleton";
import { formatCurrency } from "../lib/utils";
import { buildOverviewReportHtml } from "../lib/reportGenerator";
import { checkBudgetThresholds } from "../services/notificationService";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { getComparisonData, type ComparisonMode } from "../../src/lib/comparisonHelper";
import { captureRef } from "react-native-view-shot";
import RNPrint from "react-native-print";

/** Same 4-bucket weekly scheme as comparisonHelper.ts's weekly comparison mode (an Ethiopian
 * month split into days 1-7 / 8-14 / 15-21 / 22-end) - kept consistent so the main
 * dashboard's "Weekly" filter and the Period Comparison section below it mean the same thing. */
function getWeekBounds(daysInMonth: number, week: number): { start: number; end: number } {
  if (week === 1) return { start: 1, end: 7 };
  if (week === 2) return { start: 8, end: 14 };
  if (week === 3) return { start: 15, end: 21 };
  return { start: 22, end: daysInMonth };
}

function weekBucketForDay(day: number): number {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function DashboardScreen() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { themeMode, theme, toggleTheme } = useTheme();
  const { calendarMode } = useCalendar();
  const { showAlert } = useAppAlert();

  const currentEth = useMemo(() => getEthiopianDate(new Date()), []);

  // Balance Privacy Visibility Toggle
  const [showBalances, setShowBalances] = useState<boolean>(true);

  // PDF report generation - refs let react-native-view-shot capture these exact charts.
  // Both capture targets are hidden, forceLightMode copies (see the offscreen block below)
  // rather than the on-screen charts, so the export stays white/print-friendly no matter
  // what theme the app is currently in.
  const barChartRef = useRef<View>(null);
  const categoryPieCaptureRef = useRef<View>(null);
  const incomeCostPieRef = useRef<View>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [analyticsFilter, setAnalyticsFilter] = useState<"all" | "incomes" | "costs">("all");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<TimeFrame>("monthly");
  const [refYear, setRefYear] = useState<number>(currentEth.year);
  const [refMonth, setRefMonth] = useState<number>(currentEth.month);
  const [refWeek, setRefWeek] = useState<number>(weekBucketForDay(currentEth.day));
  const [refDay, setRefDay] = useState<number>(currentEth.day);

  // Collapsible Comparison State
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [compMode, setCompMode] = useState<ComparisonMode>("monthly");

  // Monthly Comparison state
  const [compYearA, setCompYearA] = useState<number>(currentEth.month > 1 ? currentEth.year : currentEth.year - 1);
  const [compMonthA, setCompMonthA] = useState<number>(currentEth.month > 1 ? currentEth.month - 1 : 13);
  const [compYearB, setCompYearB] = useState<number>(currentEth.year);
  const [compMonthB, setCompMonthB] = useState<number>(currentEth.month);

  // Weekly Comparison state
  const [compWeekYear, setCompWeekYear] = useState<number>(currentEth.year);
  const [compWeekMonth, setCompWeekMonth] = useState<number>(currentEth.month);
  const [compWeekA, setCompWeekA] = useState<number>(1);
  const [compWeekB, setCompWeekB] = useState<number>(2);

  // Yearly Comparison state
  const [compYearOnlyA, setCompYearOnlyA] = useState<number>(currentEth.year - 1);
  const [compYearOnlyB, setCompYearOnlyB] = useState<number>(currentEth.year);

  // The exact Gregorian date range the selected timeframe pill covers, anchored to the
  // Ethiopian nav state above - daily/weekly resolve within the navigated month, same as
  // the arrows below step through history for every timeframe. This is what was missing
  // before: the query used to fetch every row ever entered regardless of which pill or
  // which month was selected.
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (timeframe === "yearly") {
      return {
        rangeStart: toGregorianDate(refYear, 1, 1),
        rangeEnd: toGregorianDate(refYear, 13, getDaysInEthiopianMonth(refYear, 13)),
      };
    }
    if (timeframe === "weekly") {
      const daysInMonth = getDaysInEthiopianMonth(refYear, refMonth);
      const bounds = getWeekBounds(daysInMonth, refWeek);
      return {
        rangeStart: toGregorianDate(refYear, refMonth, bounds.start),
        rangeEnd: toGregorianDate(refYear, refMonth, bounds.end),
      };
    }
    if (timeframe === "daily") {
      const d = toGregorianDate(refYear, refMonth, refDay);
      return { rangeStart: d, rangeEnd: d };
    }
    // monthly
    return {
      rangeStart: toGregorianDate(refYear, refMonth, 1),
      rangeEnd: toGregorianDate(refYear, refMonth, getDaysInEthiopianMonth(refYear, refMonth)),
    };
  }, [timeframe, refYear, refMonth, refWeek, refDay]);

  // Fetch Dashboard Core Metrics
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ["mobile-dashboard", userId, timeframe, refYear, refMonth, refWeek, refDay],
    queryFn: async () => {
      const startIso = formatIso(rangeStart);
      const endIso = formatIso(rangeEnd);

      const { data: incomes } = await supabase
        .from("incomes")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startIso)
        .lte("date", endIso);
      const { data: costs } = await supabase
        .from("costs")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startIso)
        .lte("date", endIso);
      const { data: plans } = await supabase
        .from("plans")
        .select("*")
        .eq("user_id", userId);

      const totalInc = (incomes || []).reduce((acc, r) => acc + Number(r.amount), 0);
      const totalCost = (costs || []).reduce((acc, r) => acc + Number(r.amount), 0);

      // Budget targets only resolve for an exact monthly match - daily/weekly/yearly would
      // need pro-rating or summing multiple plans (the web dashboard's shared-types
      // calculatePeriodMetrics does this) which isn't wired up here. Falling back to
      // "No Plan"/"Unbudgeted" for those is honest; showing the monthly plan's numbers
      // against a differently-sized period would be misleading.
      const activePlan =
        timeframe === "monthly"
          ? (plans || []).find((p) => p.year === refYear && p.month === refMonth)
          : undefined;

      const costLimit = activePlan ? Number(activePlan.target_cost_limit) : null;
      const savingsGoal = activePlan ? Number(activePlan.target_savings_goal) : null;

      const basicCost = (costs || [])
        .filter((c) => c.category === "basic")
        .reduce((sum, c) => sum + Number(c.amount), 0);
      const fancyCost = (costs || [])
        .filter((c) => c.category === "fancy")
        .reduce((sum, c) => sum + Number(c.amount), 0);
      const extraCost = (costs || [])
        .filter((c) => c.category === "extra")
        .reduce((sum, c) => sum + Number(c.amount), 0);

      // Top 3 Expense Subcategories
      const subcategoryMap: Record<string, number> = {};
      (costs || []).forEach((c) => {
        const sub = c.subcategory || "other";
        subcategoryMap[sub] = (subcategoryMap[sub] || 0) + Number(c.amount);
      });

      const topSubcategories = Object.entries(subcategoryMap)
        .map(([sub, amount]) => ({ subcategory: sub as CostSubcategory, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      if (costLimit && costLimit > 0) {
        checkBudgetThresholds(totalCost, costLimit);
      }

      return {
        totalIncome: totalInc,
        totalCosts: totalCost,
        netProfitLoss: totalInc - totalCost,
        costLimit,
        savingsGoal,
        costVariance: costLimit !== null ? costLimit - totalCost : null,
        basicCost,
        fancyCost,
        extraCost,
        topSubcategories,
      };
    },
    enabled: !!userId,
  });

  const savingsProgressPct = useMemo(() => {
    if (!dashboardData || !dashboardData.savingsGoal || dashboardData.savingsGoal <= 0) return 0;
    const netSavings = Math.max(dashboardData.netProfitLoss, 0);
    return (netSavings / dashboardData.savingsGoal) * 100;
  }, [dashboardData]);

  // Fetch Period Comparison Data
  const { data: compData, isLoading: isCompLoading } = useQuery({
    queryKey: [
      "mobile-comparison",
      userId,
      compMode,
      compYearA,
      compMonthA,
      compYearB,
      compMonthB,
      compWeekYear,
      compWeekMonth,
      compWeekA,
      compWeekB,
      compYearOnlyA,
      compYearOnlyB,
    ],
    queryFn: () =>
      getComparisonData(supabase, userId, {
        mode: compMode,
        yearA: compYearA,
        monthA: compMonthA,
        yearB: compYearB,
        monthB: compMonthB,
        weekYear: compWeekYear,
        weekMonth: compWeekMonth,
        weekA: compWeekA,
        weekB: compWeekB,
        yearOnlyA: compYearOnlyA,
        yearOnlyB: compYearOnlyB,
      }),
    enabled: !!userId && isComparisonOpen,
  });

  const monthOptions = ETHIOPIAN_MONTHS.map((m) => ({
    label: `${m.nameEn} (${m.nameAm})`,
    value: m.number,
  }));

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentEth.year - 2 + i).map(
    (y) => ({
      label: `${y} E.C.`,
      value: y,
    }),
  );

  const monthName = ETHIOPIAN_MONTHS[refMonth - 1]?.nameEn || `Month ${refMonth}`;

  const GREGORIAN_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const periodLabel = useMemo(() => {
    if (calendarMode === "gregorian") {
      const d = rangeStart;
      const gYear = d.getFullYear();
      const gMonthName = GREGORIAN_MONTHS[d.getMonth()];
      if (timeframe === "yearly") return `${gYear} G.C.`;
      if (timeframe === "weekly") return `Week of ${gMonthName} ${d.getDate()}, ${gYear}`;
      if (timeframe === "daily") return `${gMonthName} ${d.getDate()}, ${gYear}`;
      return `${gMonthName} ${gYear}`;
    }

    if (timeframe === "yearly") return `${refYear} E.C.`;
    if (timeframe === "weekly") return `Week ${refWeek} - ${monthName} ${refYear} E.C.`;
    if (timeframe === "daily") return `${refDay} ${monthName} ${refYear} E.C.`;
    return `${monthName} ${refYear} E.C.`;
  }, [calendarMode, timeframe, rangeStart, refYear, refMonth, refWeek, refDay, monthName]);

  const handleDownloadReport = async () => {
    if (!dashboardData) return;
    setIsGeneratingReport(true);
    // The report always shows real numbers (see reportGenerator.ts) - if balances are
    // currently hidden on screen, the captured chart *images* would otherwise still bake
    // in the "••••••" mask. Reveal them for the capture, then restore afterward.
    const wasHidden = !showBalances;
    if (wasHidden) {
      setShowBalances(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    try {
      // Captured sequentially, NOT via Promise.all - firing two native captureRef calls at
      // once is a known react-native-view-shot issue on Android where the second capture can
      // read back stale/in-flight bitmap state from the first, cross-contaminating or
      // truncating one of the two images (intermittent - hence "sometimes" in testing).
      const pieChartBase64 = await captureRef(categoryPieCaptureRef, {
        format: "png",
        quality: 0.9,
        result: "base64",
      });
      const incomeCostPieBase64 = await captureRef(incomeCostPieRef, {
        format: "png",
        quality: 0.9,
        result: "base64",
      });

      const html = buildOverviewReportHtml({
        periodLabel,
        totalIncome: dashboardData.totalIncome,
        totalCosts: dashboardData.totalCosts,
        netProfitLoss: dashboardData.netProfitLoss,
        costLimit: dashboardData.costLimit,
        costVariance: dashboardData.costVariance,
        savingsGoal: dashboardData.savingsGoal,
        basicCost: dashboardData.basicCost,
        fancyCost: dashboardData.fancyCost,
        extraCost: dashboardData.extraCost,
        pieChartBase64,
        incomeCostPieBase64,
      });

      await RNPrint.print({ html });
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to generate report");
    } finally {
      if (wasHidden) setShowBalances(false);
      setIsGeneratingReport(false);
    }
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        style={[styles.flex, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
      >
      {/* Header with Clean Controls */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Financial Overview</Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            {themeMode === "dark" ? (
              <Sun size={18} color={theme.primary} />
            ) : (
              <Moon size={18} color={theme.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
            onPress={() => setShowBalances(!showBalances)}
            activeOpacity={0.7}
          >
            {showBalances ? (
              <EyeOff size={18} color={theme.primary} />
            ) : (
              <Eye size={18} color={theme.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
            onPress={handleDownloadReport}
            disabled={isGeneratingReport || isLoading}
            activeOpacity={0.7}
          >
            {isGeneratingReport ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Download size={18} color={theme.primary} />
            )}
          </TouchableOpacity>

          <View style={[styles.timeframeContainer, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            {(["daily", "weekly", "monthly", "yearly"] as TimeFrame[]).map((tf) => (
              <TouchableOpacity
                key={tf}
                style={[styles.tfPill, timeframe === tf && { backgroundColor: theme.primary }]}
                onPress={() => setTimeframe(tf)}
              >
                <Text
                  style={[
                    styles.tfPillText,
                    { color: theme.textMuted },
                    timeframe === tf && { color: "#ffffff" },
                  ]}
                >
                  {tf.charAt(0).toUpperCase() + tf.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Ethiopian Date Navigation - steps by the unit matching the active timeframe pill
          (day/week/month/year), rolling over into the adjacent month/year at the edges. */}
      <View style={[styles.dateNavRow, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: "transparent" }]}
          onPress={() => {
            if (timeframe === "yearly") {
              setRefYear(refYear - 1);
            } else if (timeframe === "weekly") {
              if (refWeek > 1) setRefWeek(refWeek - 1);
              else if (refMonth > 1) {
                setRefMonth(refMonth - 1);
                setRefWeek(4);
              } else {
                setRefMonth(13);
                setRefYear(refYear - 1);
                setRefWeek(4);
              }
            } else if (timeframe === "daily") {
              if (refDay > 1) setRefDay(refDay - 1);
              else if (refMonth > 1) {
                const prevMonth = refMonth - 1;
                setRefMonth(prevMonth);
                setRefDay(getDaysInEthiopianMonth(refYear, prevMonth));
              } else {
                setRefMonth(13);
                setRefYear(refYear - 1);
                setRefDay(getDaysInEthiopianMonth(refYear - 1, 13));
              }
            } else if (refMonth > 1) {
              setRefMonth(refMonth - 1);
            } else {
              setRefMonth(13);
              setRefYear(refYear - 1);
            }
          }}
        >
          <ChevronLeft size={18} color={theme.primary} />
        </TouchableOpacity>

        <Text style={[styles.dateNavText, { color: theme.textPrimary }]}>{periodLabel}</Text>

        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: "transparent" }]}
          onPress={() => {
            if (timeframe === "yearly") {
              setRefYear(refYear + 1);
            } else if (timeframe === "weekly") {
              if (refWeek < 4) setRefWeek(refWeek + 1);
              else if (refMonth < 13) {
                setRefMonth(refMonth + 1);
                setRefWeek(1);
              } else {
                setRefMonth(1);
                setRefYear(refYear + 1);
                setRefWeek(1);
              }
            } else if (timeframe === "daily") {
              const daysInCurrentMonth = getDaysInEthiopianMonth(refYear, refMonth);
              if (refDay < daysInCurrentMonth) setRefDay(refDay + 1);
              else if (refMonth < 13) {
                setRefMonth(refMonth + 1);
                setRefDay(1);
              } else {
                setRefMonth(1);
                setRefYear(refYear + 1);
                setRefDay(1);
              }
            } else if (refMonth < 13) {
              setRefMonth(refMonth + 1);
            } else {
              setRefMonth(1);
              setRefYear(refYear + 1);
            }
          }}
        >
          <ChevronRight size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Analytics Filter Selector (All / Incomes / Costs) */}
      <View style={[styles.filterBar, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        {(["all", "incomes", "costs"] as const).map((filterKey) => (
          <TouchableOpacity
            key={filterKey}
            style={[
              styles.filterTab,
              analyticsFilter === filterKey && { backgroundColor: theme.primary },
            ]}
            onPress={() => setAnalyticsFilter(filterKey)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: analyticsFilter === filterKey ? "#ffffff" : theme.textSecondary },
                analyticsFilter === filterKey && styles.filterTabActiveText,
              ]}
            >
              {filterKey === "all" ? "All Overview" : filterKey === "incomes" ? "Incomes Only" : "Costs Only"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ gap: 12, marginVertical: 8 }}>
          <DashboardCardsSkeleton />
          <ChartCardSkeleton height={140} />
          <ChartCardSkeleton height={160} />
        </View>
      ) : (
        <>
          {/* Summary Cards Grid */}
          <View style={styles.cardsGrid}>
            {/* Display based on active analyticsFilter */}
            {(analyticsFilter === "all" || analyticsFilter === "incomes") && (
              <Card style={styles.cardHalf}>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Total Income</Text>
                <Text style={[styles.cardValue, { color: theme.primary }]}>
                  {showBalances ? formatCurrency(dashboardData?.totalIncome || 0) : "ETB ••••••"}
                </Text>
              </Card>
            )}

            {(analyticsFilter === "all" || analyticsFilter === "costs") && (
              <Card style={styles.cardHalf}>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Total Costs</Text>
                <Text style={[styles.cardValue, { color: theme.textPrimary }]}>
                  {showBalances ? formatCurrency(dashboardData?.totalCosts || 0) : "ETB ••••••"}
                </Text>
              </Card>
            )}

            {(analyticsFilter === "all" || analyticsFilter === "incomes") && (
              <Card style={styles.cardHalf}>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Net Savings</Text>
                <Text
                  style={[
                    styles.cardValue,
                    { color: (dashboardData?.netProfitLoss || 0) >= 0 ? theme.primary : theme.danger },
                  ]}
                >
                  {showBalances ? formatCurrency(dashboardData?.netProfitLoss || 0) : "ETB ••••••"}
                </Text>
              </Card>
            )}

            {(analyticsFilter === "all" || analyticsFilter === "costs") && (
              <Card style={styles.cardHalf}>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Cost Budget</Text>
                <Text style={[styles.cardValue, { color: theme.textPrimary }]}>
                  {dashboardData?.costLimit !== null
                    ? showBalances
                      ? formatCurrency(dashboardData?.costLimit || 0)
                      : "ETB ••••••"
                    : "No Plan"}
                </Text>
                <Text style={[styles.badgeText, { color: theme.primary }]}>
                  {dashboardData?.costVariance !== null
                    ? showBalances
                      ? (dashboardData?.costVariance || 0) >= 0
                        ? `+${formatCurrency(dashboardData?.costVariance || 0)} left`
                        : `${formatCurrency(dashboardData?.costVariance || 0)} over`
                      : "• • • • • •"
                    : "Unbudgeted"}
                </Text>
              </Card>
            )}

            {analyticsFilter === "costs" && (
              <>
                <Card style={styles.cardHalf}>
                  <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Basic Expenses</Text>
                  <Text style={[styles.cardValue, { color: theme.textPrimary }]}>
                    {showBalances ? formatCurrency(dashboardData?.basicCost || 0) : "ETB ••••••"}
                  </Text>
                </Card>
                <Card style={styles.cardHalf}>
                  <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Fancy Expenses</Text>
                  <Text style={[styles.cardValue, { color: "#f59e0b" }]}>
                    {showBalances ? formatCurrency(dashboardData?.fancyCost || 0) : "ETB ••••••"}
                  </Text>
                </Card>
              </>
            )}
          </View>

          {/* Savings Progress Ring & Top Subcategories Section */}
          <View style={styles.gridRow}>
            {/* Savings Target Progress Ring */}
            <Card style={styles.cardHalf}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: "center" }]}>
                Savings Target
              </Text>
              <ProgressRing
                percentage={savingsProgressPct}
                size={110}
                sublabel={
                  dashboardData?.savingsGoal
                    ? `Goal: ${formatCurrency(dashboardData.savingsGoal)}`
                    : "No Target Goal"
                }
              />
            </Card>

            {/* Top 3 Expense Subcategories */}
            <Card style={styles.cardHalf}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Top Expenses</Text>
              {dashboardData?.topSubcategories && dashboardData.topSubcategories.length > 0 ? (
                dashboardData.topSubcategories.map((item, idx) => (
                  <View key={item.subcategory} style={styles.subCatItem}>
                    <View style={styles.subCatLeft}>
                      <Text style={[styles.subCatRank, { color: theme.primary }]}>#{idx + 1}</Text>
                      <Text style={[styles.subCatName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {COST_SUBCATEGORY_LABELS[item.subcategory] || item.subcategory}
                      </Text>
                    </View>
                    <Text style={[styles.subCatAmount, { color: theme.textSecondary }]}>
                      {showBalances ? formatCurrency(item.amount) : "••••"}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptySubText, { color: theme.textMuted }]}>No costs logged</Text>
              )}
            </Card>
          </View>

          {/* Donut Chart Analytics */}
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {analyticsFilter === "incomes"
                ? "Income vs Net Ratio"
                : analyticsFilter === "costs"
                ? "Costs Category Breakdown"
                : "Category Expense Proportions"}
            </Text>
            <View style={{ backgroundColor: theme.card }}>
              {analyticsFilter === "incomes" ? (
                <SimplePieChart
                  data={[
                    { label: "Income", value: dashboardData?.totalIncome || 0, color: theme.primary },
                    { label: "Costs", value: dashboardData?.totalCosts || 0, color: "#f59e0b" },
                    { label: "Net Savings", value: Math.max(dashboardData?.netProfitLoss || 0, 0), color: "#3b82f6" },
                  ]}
                  showBalances={showBalances}
                />
              ) : (
                <SimplePieChart
                  data={[
                    { label: "Basic", value: dashboardData?.basicCost || 0, color: theme.primary },
                    { label: "Fancy", value: dashboardData?.fancyCost || 0, color: "#f59e0b" },
                    { label: "Extra", value: dashboardData?.extraCost || 0, color: "#3b82f6" },
                  ]}
                  showBalances={showBalances}
                />
              )}
            </View>
          </Card>

          {/* Bar Chart Overview */}
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {analyticsFilter === "incomes"
                ? "Income & Savings Trends"
                : analyticsFilter === "costs"
                ? "Expenses Breakdown"
                : "Income vs Expense Overview"}
            </Text>
            <View ref={barChartRef} collapsable={false} style={{ backgroundColor: theme.card }}>
              {analyticsFilter === "incomes" ? (
                <SimpleBarChart
                  data={[
                    { label: "Total Income", valueA: dashboardData?.totalIncome || 0 },
                    { label: "Net Profit", valueA: Math.max(dashboardData?.netProfitLoss || 0, 0) },
                  ]}
                  height={150}
                  colorA={theme.primary}
                />
              ) : analyticsFilter === "costs" ? (
                <SimpleBarChart
                  data={[
                    { label: "Basic", valueA: dashboardData?.basicCost || 0 },
                    { label: "Fancy", valueA: dashboardData?.fancyCost || 0 },
                    { label: "Extra", valueA: dashboardData?.extraCost || 0 },
                  ]}
                  height={150}
                  colorA="#f59e0b"
                />
              ) : (
                <SimpleBarChart
                  data={[
                    { label: "Income", valueA: dashboardData?.totalIncome || 0 },
                    { label: "Costs", valueA: dashboardData?.totalCosts || 0 },
                    { label: "Net", valueA: Math.max(dashboardData?.netProfitLoss || 0, 0) },
                  ]}
                  height={150}
                  colorA={theme.primary}
                />
              )}
            </View>
          </Card>

          {/* Not shown on screen - captured for the PDF report only. Both charts here use
              forceLightMode and a fixed white background instead of the on-screen theme,
              since the printed report page is always white - reusing the (possibly
              dark-themed) on-screen charts baked a black background into the export. The
              category chart is duplicated here rather than reused from the section above
              purely so the on-screen version can stay theme-aware. */}
          <View style={styles.offscreenCapture} pointerEvents="none">
            <View ref={categoryPieCaptureRef} collapsable={false} style={{ backgroundColor: "#ffffff" }}>
              <SimplePieChart
                data={[
                  { label: "Basic", value: dashboardData?.basicCost || 0, color: theme.primary },
                  { label: "Fancy", value: dashboardData?.fancyCost || 0, color: "#f59e0b" },
                  { label: "Extra", value: dashboardData?.extraCost || 0, color: "#3b82f6" },
                ]}
                showBalances={showBalances}
                forceLightMode
              />
            </View>
            <View ref={incomeCostPieRef} collapsable={false} style={{ backgroundColor: "#ffffff" }}>
              <SimplePieChart
                data={[
                  { label: "Income", value: dashboardData?.totalIncome || 0, color: theme.primary },
                  { label: "Costs", value: dashboardData?.totalCosts || 0, color: "#3b82f6" },
                ]}
                showBalances={showBalances}
                totalLabel="Total"
                forceLightMode
              />
            </View>
          </View>

          {/* COLLAPSIBLE PERIOD COMPARISON ANALYTICS */}
          <Card style={styles.compCard}>
            <TouchableOpacity
              style={styles.compHeader}
              onPress={() => setIsComparisonOpen(!isComparisonOpen)}
              activeOpacity={0.8}
            >
              <View>
                <Text style={[styles.compTitle, { color: theme.textPrimary }]}>Period Comparison Analytics</Text>
                
              </View>
              {isComparisonOpen ? (
                <ChevronUp size={20} color={theme.primary} />
              ) : (
                <ChevronDown size={20} color={theme.primary} />
              )}
            </TouchableOpacity>

            {isComparisonOpen && (
              <View style={[styles.compBody, { borderTopColor: theme.cardBorder }]}>
                {/* Mode Tabs */}
                <View style={[styles.compModeRow, { backgroundColor: theme.background }]}>
                  {(["monthly", "weekly", "yearly"] as ComparisonMode[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.compModeBtn, compMode === m && { backgroundColor: theme.primary }]}
                      onPress={() => setCompMode(m)}
                    >
                      <Text
                        style={[
                          styles.compModeText,
                          { color: theme.textMuted },
                          compMode === m && { color: "#ffffff" },
                        ]}
                      >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* MONTHLY CONTROLS */}
                {compMode === "monthly" && (
                  <View style={styles.controlsBlock}>
                    <SelectPicker
                      label="Month A"
                      options={monthOptions}
                      selectedValue={compMonthA}
                      onValueChange={setCompMonthA}
                    />
                    <SelectPicker
                      label="Year A"
                      options={yearOptions}
                      selectedValue={compYearA}
                      onValueChange={setCompYearA}
                    />
                    <Text style={[styles.vsText, { color: theme.primary }]}>VS</Text>
                    <SelectPicker
                      label="Month B"
                      options={monthOptions}
                      selectedValue={compMonthB}
                      onValueChange={setCompMonthB}
                    />
                    <SelectPicker
                      label="Year B"
                      options={yearOptions}
                      selectedValue={compYearB}
                      onValueChange={setCompYearB}
                    />
                  </View>
                )}

                {/* WEEKLY CONTROLS */}
                {compMode === "weekly" && (
                  <View style={styles.controlsBlock}>
                    <SelectPicker
                      label="Select Month"
                      options={monthOptions}
                      selectedValue={compWeekMonth}
                      onValueChange={setCompWeekMonth}
                    />
                    <SelectPicker
                      label="Week A"
                      options={[
                        { label: "Week 1", value: 1 },
                        { label: "Week 2", value: 2 },
                        { label: "Week 3", value: 3 },
                        { label: "Week 4", value: 4 },
                      ]}
                      selectedValue={compWeekA}
                      onValueChange={setCompWeekA}
                    />
                    <Text style={[styles.vsText, { color: theme.primary }]}>VS</Text>
                    <SelectPicker
                      label="Week B"
                      options={[
                        { label: "Week 1", value: 1 },
                        { label: "Week 2", value: 2 },
                        { label: "Week 3", value: 3 },
                        { label: "Week 4", value: 4 },
                      ]}
                      selectedValue={compWeekB}
                      onValueChange={setCompWeekB}
                    />
                  </View>
                )}

                {/* YEARLY CONTROLS */}
                {compMode === "yearly" && (
                  <View style={styles.controlsBlock}>
                    <SelectPicker
                      label="Year A"
                      options={yearOptions}
                      selectedValue={compYearOnlyA}
                      onValueChange={setCompYearOnlyA}
                    />
                    <Text style={[styles.vsText, { color: theme.primary }]}>VS</Text>
                    <SelectPicker
                      label="Year B"
                      options={yearOptions}
                      selectedValue={compYearOnlyB}
                      onValueChange={setCompYearOnlyB}
                    />
                  </View>
                )}

                {/* Render Comparison Metrics */}
                {isCompLoading ? (
                  <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
                ) : compData ? (
                  <View style={styles.compResults}>
                    <View style={[styles.deltaCard, { backgroundColor: theme.background }]}>
                      <Text style={[styles.deltaLabel, { color: theme.textSecondary }]}>Income Delta</Text>
                      <Text
                        style={[
                          styles.deltaValue,
                          { color: compData.delta.income >= 0 ? theme.primary : theme.danger },
                        ]}
                      >
                        {showBalances ? (
                          <>
                            {compData.delta.income >= 0 ? "+" : ""}
                            {formatCurrency(compData.delta.income)}
                          </>
                        ) : (
                          "ETB ••••••"
                        )}
                      </Text>
                    </View>

                    <View style={[styles.deltaCard, { backgroundColor: theme.background }]}>
                      <Text style={[styles.deltaLabel, { color: theme.textSecondary }]}>Expense Delta</Text>
                      <Text
                        style={[
                          styles.deltaValue,
                          { color: compData.delta.costs <= 0 ? theme.primary : theme.danger },
                        ]}
                      >
                        {showBalances ? (
                          <>
                            {compData.delta.costs >= 0 ? "+" : ""}
                            {formatCurrency(compData.delta.costs)}
                          </>
                        ) : (
                          "ETB ••••••"
                        )}
                      </Text>
                    </View>

                    {/* Side by Side Chart */}
                    <Text style={[styles.chartTitle, { color: theme.textSecondary }]}>Side-by-Side Comparison</Text>
                    <SimpleLineChart
                      data={[
                        {
                          label: "Income",
                          valueA: compData.summaryA.totalIncome,
                          valueB: compData.summaryB.totalIncome,
                        },
                        {
                          label: "Costs",
                          valueA: compData.summaryA.totalCosts,
                          valueB: compData.summaryB.totalCosts,
                        },
                        {
                          label: "Net",
                          valueA: Math.max(compData.summaryA.netProfitLoss, 0),
                          valueB: Math.max(compData.summaryB.netProfitLoss, 0),
                        },
                      ]}
                      height={160}
                      colorA={theme.primary}
                      colorB="#3b82f6"
                      labelA={compData.summaryA.label}
                      labelB={compData.summaryB.label}
                    />
                  </View>
                ) : null}
              </View>
            )}
          </Card>
        </>
      )}
      </ScrollView>

      {/* Floating Action Button for Quick Add */}
      <TouchableOpacity
        style={[styles.fabBtn, { backgroundColor: theme.primary }]}
        onPress={() => setIsQuickAddOpen(true)}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#ffffff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Quick Add Modal */}
      <QuickAddModal visible={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 100 },
  // Rendered off-screen (not visible, doesn't affect layout) purely so react-native-view-shot
  // has a real mounted view to capture for the PDF report. Deliberately NOT using opacity: 0
  // to hide it - combined with an off-screen position that alone made captureRef return a
  // blank/partially-cropped bitmap on Android (a known react-native-view-shot pitfall: it
  // skips/short-circuits drawing for zero-opacity views). Off-screen positioning alone is
  // already enough to keep it invisible to the user.
  offscreenCapture: { position: "absolute", top: -9999, left: -9999 },
  headerRow: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeframeContainer: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  tfPill: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  tfPillText: { fontSize: 11, fontWeight: "600" },
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  filterBar: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterTabActiveText: {
    fontWeight: "800",
  },
  navBtn: { padding: 6, borderRadius: 8 },
  dateNavText: { fontSize: 14, fontWeight: "700" },
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  cardHalf: { width: "48%" },
  cardLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: "800" },
  badgeText: { fontSize: 10, fontWeight: "600", marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  compCard: { padding: 0, overflow: "hidden" },
  compHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  compTitle: { fontSize: 14, fontWeight: "700" },
  compSubtitle: { fontSize: 11 },
  compBody: { padding: 16, borderTopWidth: 1 },
  compModeRow: { flexDirection: "row", marginBottom: 12, borderRadius: 10, padding: 3 },
  compModeBtn: { flex: 1, paddingVertical: 6, alignItems: "center", borderRadius: 8 },
  compModeText: { fontSize: 12, fontWeight: "600" },
  controlsBlock: { marginTop: 4 },
  vsText: { textAlign: "center", fontWeight: "900", marginVertical: 4 },
  compResults: { marginTop: 12 },
  deltaCard: { padding: 10, borderRadius: 10, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deltaLabel: { fontSize: 12, fontWeight: "600" },
  deltaValue: { fontSize: 14, fontWeight: "800" },
  chartTitle: { fontSize: 12, fontWeight: "700", marginTop: 10, marginBottom: 6 },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  subCatItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.1)",
  },
  subCatLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  subCatRank: {
    fontSize: 11,
    fontWeight: "900",
  },
  subCatName: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  subCatAmount: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptySubText: {
    fontSize: 11,
    textAlign: "center",
    marginVertical: 12,
  },
  fabBtn: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
});
