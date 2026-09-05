import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Plus, X } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useCalendar } from "../../context/CalendarContext";
import { useAppAlert } from "../../context/AlertContext";
import { AppModal } from "./Modal";
import { Input } from "./Input";
import { SelectPicker } from "./SelectPicker";
import { EthiopianDatePicker } from "./EthiopianDatePicker";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  CATEGORY_SUBCATEGORY_MAP,
  COST_SUBCATEGORY_LABELS,
  INCOME_SOURCE_TYPES,
  INCOME_SOURCE_TYPE_LABELS,
  type CostCategory,
  type CostSubcategory,
  type IncomeSourceType,
} from "../../shared-types";
import { supabase } from "../../lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { checkBudgetThresholds, syncDailyNotificationState, getLocalDateString } from "../../services/notificationService";

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
}

export function QuickAddModal({ visible, onClose }: QuickAddModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const userId = user?.id || "";
  const { showAlert } = useAppAlert();
  const queryClient = useQueryClient();

  const [type, setType] = useState<"cost" | "income">("cost");

  // Cost Form State
  const [costCategory, setCostCategory] = useState<CostCategory>("basic");
  const [costSubcategory, setCostSubcategory] = useState<CostSubcategory>("rent");
  const [costAmount, setCostAmount] = useState("");
  const [costDescription, setCostDescription] = useState("");
  const [costDate, setCostDate] = useState(getLocalDateString());

  // Income Form State
  const [incomeSource, setIncomeSource] = useState<IncomeSourceType>("monthly");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomeDate, setIncomeDate] = useState(getLocalDateString());

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation Error States
  const [costAmountError, setCostAmountError] = useState("");
  const [costDescError, setCostDescError] = useState("");
  const [incomeAmountError, setIncomeAmountError] = useState("");

  const handleCategoryChange = (cat: CostCategory) => {
    setCostCategory(cat);
    setCostDescError("");
    const validSubs = CATEGORY_SUBCATEGORY_MAP[cat] || [];
    if (validSubs.length > 0) {
      setCostSubcategory(validSubs[0]!);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    if (type === "cost") {
      setCostAmountError("");
      setCostDescError("");

      const numAmount = parseFloat(costAmount);
      let hasError = false;

      if (isNaN(numAmount) || numAmount <= 0) {
        setCostAmountError("Please enter a valid cost amount");
        hasError = true;
      }

      if (costSubcategory === "other" && !costDescription.trim()) {
        setCostDescError("Reason is required when selecting 'Other'");
        hasError = true;
      }

      if (hasError) return;

      setIsSubmitting(true);
      try {
        const { error } = await supabase.from("costs").insert({
          user_id: userId,
          category: costCategory,
          subcategory: costSubcategory,
          amount: numAmount,
          description: costDescription.trim() || null,
          date: costDate,
        });

        if (error) throw error;

        // Invalidate queries & check budget warnings & sync daily reminders
        queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["mobile-costs"] });

        syncDailyNotificationState(userId);

        // Reset & Close
        setCostAmount("");
        setCostDescription("");
        setCostAmountError("");
        setCostDescError("");
        onClose();
        showAlert("Success", "Expense entry added!");
      } catch (err: any) {
        showAlert("Error", err.message || "Failed to add expense entry");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIncomeAmountError("");

      const numAmount = parseFloat(incomeAmount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setIncomeAmountError("Please enter a valid income amount");
        return;
      }

      setIsSubmitting(true);
      try {
        const { error } = await supabase.from("incomes").insert({
          user_id: userId,
          source_type: incomeSource,
          amount: numAmount,
          description: incomeDescription.trim() || null,
          date: incomeDate,
        });

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["mobile-incomes"] });

        setIncomeAmount("");
        setIncomeDescription("");
        setIncomeAmountError("");
        onClose();
        showAlert("Success", "Income entry added!");
      } catch (err: any) {
        showAlert("Error", err.message || "Failed to add income entry");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const categoryOptions = COST_CATEGORIES.map((c) => ({
    label: COST_CATEGORY_LABELS[c],
    value: c,
  }));

  const subcategoryOptions = (CATEGORY_SUBCATEGORY_MAP[costCategory] || []).map((s) => ({
    label: COST_SUBCATEGORY_LABELS[s] || s,
    value: s,
  }));

  const incomeSourceOptions = INCOME_SOURCE_TYPES.map((s) => ({
    label: INCOME_SOURCE_TYPE_LABELS[s],
    value: s,
  }));

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={type === "cost" ? "Quick Add Expense" : "Quick Add Income"}
      onConfirm={handleSave}
      confirmLabel={type === "cost" ? "Save Expense" : "Save Income"}
      confirmLoading={isSubmitting}
    >
      {/* Type Toggle Pills */}
      <View style={[styles.typeToggleRow, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          style={[styles.typePill, type === "cost" && { backgroundColor: theme.primary }]}
          onPress={() => setType("cost")}
          activeOpacity={0.8}
        >
          <Text style={[styles.typePillText, { color: type === "cost" ? "#ffffff" : theme.textSecondary }]}>
            + Add Expense
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typePill, type === "income" && { backgroundColor: theme.primary }]}
          onPress={() => setType("income")}
          activeOpacity={0.8}
        >
          <Text style={[styles.typePillText, { color: type === "income" ? "#ffffff" : theme.textSecondary }]}>
            + Add Income
          </Text>
        </TouchableOpacity>
      </View>

      {type === "cost" ? (
        <View style={styles.formBlock}>
          <SelectPicker
            label="Category"
            options={categoryOptions}
            selectedValue={costCategory}
            onValueChange={(val) => handleCategoryChange(val as CostCategory)}
          />
          <SelectPicker
            label="Subcategory"
            options={subcategoryOptions}
            selectedValue={costSubcategory}
            onValueChange={(val) => setCostSubcategory(val as CostSubcategory)}
          />
          <Input
            label="Amount (ETB)"
            value={costAmount}
            onChangeText={(t) => {
              setCostAmount(t);
              if (costAmountError) setCostAmountError("");
            }}
            error={costAmountError}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <EthiopianDatePicker label="Date" value={costDate} onChange={setCostDate} required />
          <Input
            label={costSubcategory === "other" ? "Description / Reason" : "Description (Optional)"}
            value={costDescription}
            onChangeText={(t) => {
              setCostDescription(t);
              if (costDescError) setCostDescError("");
            }}
            error={costDescError}
            placeholder={costSubcategory === "other" ? "Specify reason for Other" : "Notes or tags"}
          />
        </View>
      ) : (
        <View style={styles.formBlock}>
          <SelectPicker
            label="Income Source"
            options={incomeSourceOptions}
            selectedValue={incomeSource}
            onValueChange={(val) => setIncomeSource(val as IncomeSourceType)}
          />
          <Input
            label="Amount (ETB)"
            value={incomeAmount}
            onChangeText={(t) => {
              setIncomeAmount(t);
              if (incomeAmountError) setIncomeAmountError("");
            }}
            error={incomeAmountError}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <EthiopianDatePicker label="Date" value={incomeDate} onChange={setIncomeDate} required />
          <Input
            label="Description (Optional)"
            value={incomeDescription}
            onChangeText={setIncomeDescription}
            placeholder="Source notes"
          />
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  typeToggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  formBlock: {
    gap: 4,
  },
});
