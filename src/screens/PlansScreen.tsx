import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import {
  ETHIOPIAN_MONTHS,
  getEthiopianDate,
  type PlanRow,
} from "../shared-types";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { formatCurrency } from "../lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function PlansScreen() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const currentEth = getEthiopianDate(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(currentEth.year);

  // Modal State
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [costLimitInput, setCostLimitInput] = useState("");
  const [savingsGoalInput, setSavingsGoalInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["mobile-plans", userId, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("user_id", userId)
        .eq("year", selectedYear);
      if (error) throw error;
      return (data || []) as PlanRow[];
    },
    enabled: !!userId,
  });

  const planByMonth = new Map(plans.map((p) => [p.month, p]));

  const openPlanModal = (monthNum: number) => {
    const existing = planByMonth.get(monthNum);
    setActiveMonth(monthNum);
    setCostLimitInput(existing ? String(existing.target_cost_limit) : "");
    setSavingsGoalInput(existing ? String(existing.target_savings_goal) : "");
  };

  const handleSavePlan = async () => {
    if (activeMonth === null) return;
    const limit = parseFloat(costLimitInput);
    const goal = parseFloat(savingsGoalInput);

    if (isNaN(limit) || limit < 0 || isNaN(goal) || goal < 0) {
      Alert.alert("Invalid Inputs", "Please enter valid non-negative numbers for limits and goals.");
      return;
    }

    setIsSubmitting(true);
    try {
      const existing = planByMonth.get(activeMonth);
      if (existing) {
        const { error } = await supabase
          .from("plans")
          .update({
            target_cost_limit: limit,
            target_savings_goal: goal,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").insert({
          user_id: userId,
          year: selectedYear,
          month: activeMonth,
          target_cost_limit: limit,
          target_savings_goal: goal,
        });
        if (error) throw error;
      }

      Alert.alert("Success", "Budget plan saved!");
      setActiveMonth(null);
      queryClient.invalidateQueries({ queryKey: ["mobile-plans"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: theme.textPrimary }]}>Budget Plans</Text>

      {/* Year Switcher Header */}
      <View style={[styles.yearNavCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          onPress={() => setSelectedYear(selectedYear - 1)}
          style={[styles.navBtn, { backgroundColor: theme.primaryLight }]}
        >
          <ChevronLeft size={20} color={theme.primary} />
        </TouchableOpacity>

        <View style={styles.yearTitleBox}>
          <Text style={[styles.yearTitle, { color: theme.textPrimary }]}>{selectedYear} E.C. / ዓ.ም.</Text>
          <Text style={[styles.yearSubTitle, { color: theme.primary }]}>{plans.length} of 13 months planned</Text>
        </View>

        <TouchableOpacity
          onPress={() => setSelectedYear(selectedYear + 1)}
          style={[styles.navBtn, { backgroundColor: theme.primaryLight }]}
        >
          <ChevronRight size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 30 }} />
      ) : (
        /* 13 Ethiopian Month Cards */
        <View style={styles.gridContainer}>
          {ETHIOPIAN_MONTHS.map((monthInfo) => {
            const plan = planByMonth.get(monthInfo.number);
            const isCurrent =
              currentEth.year === selectedYear && currentEth.month === monthInfo.number;

            return (
              <Card
                key={monthInfo.number}
                style={[styles.monthCard, isCurrent && { borderColor: theme.primary, borderWidth: 1.5 }]}
              >
                <View style={styles.monthHeader}>
                  <Text style={[styles.monthName, { color: theme.textPrimary }]}>{monthInfo.label}</Text>
                  {isCurrent && (
                    <View style={[styles.currentBadge, { backgroundColor: theme.primaryLight }]}>
                      <Text style={[styles.currentBadgeText, { color: theme.primary }]}>CURRENT</Text>
                    </View>
                  )}
                </View>

                {plan ? (
                  <View style={styles.planDetails}>
                    <View style={[styles.detailRow, { backgroundColor: theme.background }]}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Cost Limit:</Text>
                      <Text style={[styles.detailVal, { color: theme.textPrimary }]}>
                        {formatCurrency(Number(plan.target_cost_limit))}
                      </Text>
                    </View>

                    <View style={[styles.detailRow, { backgroundColor: theme.background }]}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Savings Goal:</Text>
                      <Text style={[styles.detailVal, { color: theme.textPrimary }]}>
                        {formatCurrency(Number(plan.target_savings_goal))}
                      </Text>
                    </View>

                    <Button
                      title="Edit Plan"
                      variant="outline"
                      onPress={() => openPlanModal(monthInfo.number)}
                      style={styles.actionBtn}
                    />
                  </View>
                ) : (
                  <View style={styles.noPlanBox}>
                    <Text style={[styles.noPlanText, { color: theme.textMuted }]}>No budget plan set</Text>
                    <Button
                      title="Set Plan"
                      onPress={() => openPlanModal(monthInfo.number)}
                      style={styles.actionBtn}
                    />
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}

      {/* Create / Edit Plan Modal */}
      <Modal visible={activeMonth !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {planByMonth.get(activeMonth || 1) ? "Edit Budget Plan" : "Create Budget Plan"} -{" "}
              {ETHIOPIAN_MONTHS[(activeMonth || 1) - 1]?.nameEn} {selectedYear} E.C.
            </Text>

            <Input
              label="Target Cost Limit (USD)"
              placeholder="e.g. 500.00"
              value={costLimitInput}
              onChangeText={setCostLimitInput}
              keyboardType="numeric"
            />

            <Input
              label="Target Savings Goal (USD)"
              placeholder="e.g. 200.00"
              value={savingsGoalInput}
              onChangeText={setSavingsGoalInput}
              keyboardType="numeric"
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setActiveMonth(null)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save Plan"
                onPress={handleSavePlan}
                loading={isSubmitting}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 14 },
  yearNavCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  navBtn: { padding: 8, borderRadius: 10 },
  yearTitleBox: { alignItems: "center" },
  yearTitle: { fontSize: 16, fontWeight: "800" },
  yearSubTitle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  gridContainer: { flexDirection: "column" },
  monthCard: { marginBottom: 12 },
  monthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  monthName: { fontSize: 15, fontWeight: "700" },
  currentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  currentBadgeText: { fontSize: 9, fontWeight: "900" },
  planDetails: { gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyBetween: "space-between", padding: 8, borderRadius: 8 },
  detailLabel: { fontSize: 12, flex: 1 },
  detailVal: { fontSize: 13, fontWeight: "700" },
  noPlanBox: { alignItems: "center", paddingVertical: 8 },
  noPlanText: { fontSize: 12, marginBottom: 8 },
  actionBtn: { marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  modalContent: { borderRadius: 16, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  modalBtnRow: { flexDirection: "row", marginTop: 14 },
});
