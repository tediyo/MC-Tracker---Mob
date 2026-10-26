import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { ChevronRight } from "lucide-react-native";
import {
  COST_CATEGORIES,
  CATEGORY_SUBCATEGORY_MAP,
  decodeCostRow,
  encodeDynamicDescription,
  formatCategoryLabel,
  formatSubcategoryLabel,
  type CostCategory,
  type CostSubcategory,
} from "../shared-types";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCalendar } from "../context/CalendarContext";
import { useAppAlert } from "../context/AlertContext";
import { useCategories } from "../context/CategoryContext";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { SelectPicker } from "../components/ui/SelectPicker";
import { EthiopianDatePicker } from "../components/ui/EthiopianDatePicker";
import { ListFeedSkeleton } from "../components/ui/Skeleton";
import { formatCurrency, formatDateByMode } from "../lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { syncDailyNotificationState, getLocalDateString } from "../services/notificationService";

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
  const { categories, categoryLabels, categorySubcategoryMap, subcategoryLabels } = useCategories();
  const queryClient = useQueryClient();

  // Form state
  const [amount, setAmount] = useState("");
  const todayIso = getLocalDateString();
  const [date, setDate] = useState(todayIso);
  const [category, setCategory] = useState<string>("basic");
  const [subcategory, setSubcategory] = useState<string>("food");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available subcategories based on chosen category
  const availableSubcategories = useMemo(() => {
    return categorySubcategoryMap[category] || ["other"];
  }, [category, categorySubcategoryMap]);

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const subList = categorySubcategoryMap[newCat];
    if (subList && subList.length > 0) {
      setSubcategory(subList[0]);
    } else {
      setSubcategory("other");
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
      return (data || []).map((row: any) => decodeCostRow(row));
    },
    enabled: !!userId,
  });
  const recentCosts = costs.slice(0, RECENT_COUNT);

  const [amountError, setAmountError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  // Add Cost Handler with Mandatory Reason Validation & Resilient Dynamic Category Encoding
  const handleAddCost = async () => {
    setAmountError("");
    setDescriptionError("");

    const numAmount = parseFloat(amount);
    let hasError = false;

    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError("Please enter a valid cost amount");
      hasError = true;
    }

    // MANDATORY REASON VALIDATION FOR OTHER
    if (subcategory === "other" && !description.trim()) {
      setDescriptionError("Please specify a reason when selecting 'Other'");
      hasError = true;
    }

    if (hasError) return;

    setIsSubmitting(true);
    try {
      // 1. Try direct insertion first
      const { error } = await supabase.from("costs").insert({
        user_id: userId,
        amount: numAmount,
        date,
        category: category as any,
        subcategory: subcategory as any,
        description: description.trim() || null,
      });

      if (error) {
        // If enum or check constraint fails, use resilient dynamic fallback encoding
        const isConstraintError =
          error.code === "22P02" ||
          error.message?.includes("enum") ||
          error.message?.includes("chk_category_subcategory");

        if (isConstraintError) {
          const encodedDesc = encodeDynamicDescription(category, subcategory, description);
          const { error: fallbackError } = await supabase.from("costs").insert({
            user_id: userId,
            amount: numAmount,
            date,
            category: "basic",
            subcategory: "other",
            description: encodedDesc,
          });
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }

      showAlert("Success", "Expense entry logged successfully!");
      setAmount("");
      setDescription("");
      setAmountError("");
      setDescriptionError("");
      queryClient.invalidateQueries({ queryKey: ["mobile-costs"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
      syncDailyNotificationState(userId);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to log cost");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = categories.map((c) => ({
    label: categoryLabels[c] || formatCategoryLabel(c),
    value: c,
  }));

  const subcategoryOptions = availableSubcategories.map((sub) => ({
    label: subcategoryLabels[sub] || formatSubcategoryLabel(sub),
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
          label="Amount (ETB)"
          placeholder="0.00"
          value={amount}
          onChangeText={(t) => {
            setAmount(t);
            if (amountError) setAmountError("");
          }}
          keyboardType="decimal-pad"
          error={amountError}
        />

        <EthiopianDatePicker
          label="Date"
          value={date}
          onChange={(newDate) => setDate(newDate)}
        />

        <SelectPicker
          label="Category"
          selectedValue={category}
          options={categoryOptions}
          onValueChange={(val) => handleCategoryChange(val)}
        />

        <SelectPicker
          label="Subcategory"
          selectedValue={subcategory}
          options={subcategoryOptions}
          onValueChange={(val) => setSubcategory(val)}
        />

        <Input
          label={isOther ? "Reason (Required) *" : "Description (Optional)"}
          placeholder={isOther ? "Specify a reason..." : "Notes or details..."}
          value={description}
          onChangeText={(t) => {
            setDescription(t);
            if (descriptionError) setDescriptionError("");
          }}
          error={descriptionError}
        />

        <Button
          title={isSubmitting ? "Logging Expense..." : "Log Expense"}
          onPress={handleAddCost}
          loading={isSubmitting}
          style={styles.submitBtn}
        />
      </Card>

      {/* Recent History Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Expenses</Text>
        <TouchableOpacity
          onPress={onViewHistory}
          style={styles.viewAllBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
          <ChevronRight size={14} color={theme.primary} />
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
                      {categoryLabels[item.category] || formatCategoryLabel(item.category)}
                    </Text>
                  </View>
                  <Text style={[styles.subText, { color: theme.textSecondary }]}>
                    {subcategoryLabels[item.subcategory] || formatSubcategoryLabel(item.subcategory)}
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
  container: { padding: 16, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 16 },
  formCard: { padding: 16, marginBottom: 24 },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  submitBtn: { marginTop: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAllText: { fontSize: 13, fontWeight: "600" },
  emptyText: { textAlign: "center", marginTop: 24, fontSize: 13 },
  historyCard: { padding: 14, marginBottom: 10 },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyLeft: { flex: 1, gap: 4 },
  historyDate: { fontSize: 11, fontWeight: "600" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: "700" },
  subText: { fontSize: 12, fontWeight: "600" },
  historyDesc: { fontSize: 12 },
  historyAmount: { fontSize: 15, fontWeight: "700" },
});
