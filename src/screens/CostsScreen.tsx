import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { ChevronRight } from "lucide-react-native";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  COST_SUBCATEGORY_LABELS,
  CATEGORY_SUBCATEGORY_MAP,
  type CostCategory,
  type CostSubcategory,
} from "../shared-types";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCalendar } from "../context/CalendarContext";
import { useAppAlert } from "../context/AlertContext";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { SelectPicker } from "../components/ui/SelectPicker";
import { EthiopianDatePicker } from "../components/ui/EthiopianDatePicker";
import { ListFeedSkeleton } from "../components/ui/Skeleton";
import { formatCurrency, formatDateByMode } from "../lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

const RECENT_COUNT = 5;

interface CostsScreenProps {
  onViewHistory: () => void;
}

export function CostsScreen({ onViewHistory }: CostsScreenProps) {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { theme } = useTheme();
  const { calendarMode } = useCalendar();
  const { showAlert } = useAppAlert();
  const queryClient = useQueryClient();

  // Form state
  const [amount, setAmount] = useState("");
  const todayIso = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayIso);
  const [category, setCategory] = useState<CostCategory>("basic");
  const [subcategory, setSubcategory] = useState<CostSubcategory>("food");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available subcategories based on chosen category
  const availableSubcategories = useMemo(() => {
    return CATEGORY_SUBCATEGORY_MAP[category] || [];
  }, [category]);

  const handleCategoryChange = (newCat: CostCategory) => {
    setCategory(newCat);
    const subList = CATEGORY_SUBCATEGORY_MAP[newCat];
    if (subList && subList.length > 0) {
      setSubcategory(subList[0]);
    }
  };

  // Same query/cache the full History screen uses - here we only show the first few.
  const { data: costs = [], isLoading } = useQuery({
    queryKey: ["mobile-costs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("costs")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
  const recentCosts = costs.slice(0, RECENT_COUNT);

  // Add Cost Handler with Mandatory Reason Validation
  const handleAddCost = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showAlert("Invalid Amount", "Please enter a valid cost amount");
      return;
    }

    // MANDATORY REASON VALIDATION FOR OTHER
    if (subcategory === "other" && !description.trim()) {
      showAlert("Reason Required", "Please specify a reason when selecting 'Other' subcategory.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("costs").insert({
        user_id: userId,
        amount: numAmount,
        date,
        category,
        subcategory,
        description,
      });

      if (error) throw error;

      showAlert("Success", "Expense entry logged successfully!");
      setAmount("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["mobile-costs"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to log cost");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = COST_CATEGORIES.map((c) => ({
    label: COST_CATEGORY_LABELS[c],
    value: c,
  }));

  const subcategoryOptions = availableSubcategories.map((sub) => ({
    label: COST_SUBCATEGORY_LABELS[sub],
    value: sub,
  }));

  const isOther = subcategory === "other";

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: theme.textPrimary }]}>Expense Tracker</Text>

      {/* Entry Form */}
      <Card style={styles.formCard}>
        <Text style={[styles.formTitle, { color: theme.textPrimary }]}>Log Expense</Text>

        <Input
          label="Amount (USD)"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          required
        />

        <EthiopianDatePicker label="Date" value={date} onChange={setDate} required />

        <SelectPicker
          label="Category"
          options={categoryOptions}
          selectedValue={category}
          onValueChange={handleCategoryChange}
        />

        <SelectPicker
          label="Subcategory"
          options={subcategoryOptions}
          selectedValue={subcategory}
          onValueChange={setSubcategory}
        />

        {/* Dynamic Reason / Description Label */}
        <Input
          label={isOther ? "Reason (Required) *" : "Description / Notes"}
          placeholder={isOther ? "State the reason for this expense..." : "Add details..."}
          value={description}
          onChangeText={setDescription}
          required={isOther}
          error={isOther && !description.trim() ? "Reason is required when selecting Other" : undefined}
        />

        <Button
          title="Log Expense Entry"
          onPress={handleAddCost}
          loading={isSubmitting}
          style={{ marginTop: 6 }}
        />
      </Card>

      {/* Recent Transactions */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Transactions</Text>
        <TouchableOpacity style={styles.viewHistoryLink} onPress={onViewHistory}>
          <Text style={[styles.viewHistoryText, { color: theme.primary }]}>View Full History</Text>
          <ChevronRight size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ListFeedSkeleton count={3} />
      ) : recentCosts.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No expense entries logged yet.</Text>
      ) : (
        recentCosts.map((item) => (
          <Card key={item.id} style={styles.historyCard}>
            <View style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={[styles.historyDate, { color: theme.textMuted }]}>{formatDateByMode(item.date, calendarMode)}</Text>

                <View style={styles.badgeRow}>
                  <View style={[styles.catBadge, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.catBadgeText, { color: theme.primary }]}>
                      {COST_CATEGORY_LABELS[item.category as CostCategory]}
                    </Text>
                  </View>
                  <Text style={[styles.subText, { color: theme.textSecondary }]}>
                    {COST_SUBCATEGORY_LABELS[item.subcategory as CostSubcategory]}
                  </Text>
                </View>

                {item.description ? (
                  <Text style={[styles.historyDesc, { color: theme.textSecondary }]}>{item.description}</Text>
                ) : null}
              </View>

              <Text style={[styles.historyAmount, { color: theme.textPrimary }]}>
                {formatCurrency(Number(item.amount))}
              </Text>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 14 },
  formCard: { padding: 16, marginBottom: 20 },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  viewHistoryLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewHistoryText: { fontSize: 12, fontWeight: "700" },
  emptyText: { textAlign: "center", fontSize: 13, marginVertical: 20 },
  historyCard: { padding: 14, marginBottom: 10 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyLeft: { flex: 1, paddingRight: 10 },
  historyDate: { fontSize: 11, fontWeight: "600" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 4 },
  catBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontWeight: "700" },
  subText: { fontSize: 11, fontWeight: "600" },
  historyDesc: { fontSize: 12, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: "800" },
});
