import React, { useState, useMemo } from "react";
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
} from "lucide-react-native";
import {
  ETHIOPIAN_MONTHS,
  getEthiopianDate,
  COST_CATEGORY_LABELS,
  type TimeFrame,
} from "../shared-types";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/ui/Card";
import { SelectPicker } from "../components/ui/SelectPicker";
import { SimpleBarChart } from "../components/charts/BarChart";
import { SimpleLineChart } from "../components/charts/LineChart";
import { SimplePieChart } from "../components/charts/PieChart";
import { formatCurrency } from "../lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { getComparisonData, type ComparisonMode } from "../../src/lib/comparisonHelper";

export function DashboardScreen() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { themeMode, theme, toggleTheme } = useTheme();

  const currentEth = useMemo(() => getEthiopianDate(new Date()), []);

  // Balance Privacy Visibility Toggle
  const [showBalances, setShowBalances] = useState<boolean>(true);

  // Timeframe switcher state
  const [timeframe, setTimeframe] = useState<TimeFrame>("monthly");
  const [refYear, setRefYear] = useState<number>(currentEth.year);
  const [refMonth, setRefMonth] = useState<number>(currentEth.month);

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

  // Fetch Dashboard Core Metrics
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ["mobile-dashboard", userId, timeframe, refYear, refMonth],
    queryFn: async () => {
      const { data: incomes } = await supabase
        .from("incomes")
        .select("*")
        .eq("user_id", userId);
      const { data: costs } = await supabase
        .from("costs")
        .select("*")
        .eq("user_id", userId);
      const { data: plans } = await supabase
        .from("plans")
        .select("*")
        .eq("user_id", userId);

      const totalInc = (incomes || []).reduce((acc, r) => acc + Number(r.amount), 0);
      const totalCost = (costs || []).reduce((acc, r) => acc + Number(r.amount), 0);

      const activePlan = (plans || []).find(
        (p) => p.year === refYear && p.month === refMonth,
      );

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
      };
    },
    enabled: !!userId,
  });

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

  return (
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

      {/* Ethiopian Date Navigation */}
      <View style={[styles.dateNavRow, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: "transparent" }]}
          onPress={() => {
            if (refMonth > 1) setRefMonth(refMonth - 1);
            else {
              setRefMonth(13);
              setRefYear(refYear - 1);
            }
          }}
        >
          <ChevronLeft size={18} color={theme.primary} />
        </TouchableOpacity>

        <Text style={[styles.dateNavText, { color: theme.textPrimary }]}>
          {monthName} {refYear} E.C.
        </Text>

        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: "transparent" }]}
          onPress={() => {
            if (refMonth < 13) setRefMonth(refMonth + 1);
            else {
              setRefMonth(1);
              setRefYear(refYear + 1);
            }
          }}
        >
          <ChevronRight size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 30 }} />
      ) : (
        <>
          {/* Summary Cards Grid */}
          <View style={styles.cardsGrid}>
            {/* Total Income */}
            <Card style={styles.cardHalf}>
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Total Income</Text>
              <Text style={[styles.cardValue, { color: theme.textPrimary }]}>
                {showBalances ? formatCurrency(dashboardData?.totalIncome || 0) : "ETB ••••••"}
              </Text>
            </Card>

            {/* Total Costs */}
            <Card style={styles.cardHalf}>
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Total Costs</Text>
              <Text style={[styles.cardValue, { color: theme.textPrimary }]}>
                {showBalances ? formatCurrency(dashboardData?.totalCosts || 0) : "ETB ••••••"}
              </Text>
            </Card>

            {/* Net Savings */}
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

            {/* Budget Variance */}
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
          </View>

          {/* Category Donut Chart */}
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Category Expense Proportions</Text>
            <SimplePieChart
              data={[
                { label: "Basic", value: dashboardData?.basicCost || 0, color: theme.primary },
                { label: "Fancy", value: dashboardData?.fancyCost || 0, color: "#f59e0b" },
                { label: "Extra", value: dashboardData?.extraCost || 0, color: "#3b82f6" },
              ]}
              showBalances={showBalances}
            />
          </Card>

          {/* Income vs Expense Overview */}
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Income vs Expense Overview</Text>
            <SimpleBarChart
              data={[
                { label: "Income", valueA: dashboardData?.totalIncome || 0 },
                { label: "Costs", valueA: dashboardData?.totalCosts || 0 },
                { label: "Net", valueA: Math.max(dashboardData?.netProfitLoss || 0, 0) },
              ]}
              height={150}
              colorA={theme.primary}
            />
          </Card>

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
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 100 },
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
    marginBottom: 16,
    borderWidth: 1,
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
});
