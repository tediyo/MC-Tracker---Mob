import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AppModal } from "./Modal";
import { Input } from "./Input";
import { SelectPicker } from "./SelectPicker";
import { EthiopianDatePicker } from "./EthiopianDatePicker";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppAlert } from "../../context/AlertContext";
import { useCategories } from "../../context/CategoryContext";
import { supabase } from "../../lib/supabase";
import {
  INCOME_SOURCE_TYPES,
  INCOME_SOURCE_TYPE_LABELS,
  encodeDynamicDescription,
  formatCategoryLabel,
  formatSubcategoryLabel,
  type IncomeSourceType,
} from "../../shared-types";
import { syncDailyNotificationState, getLocalDateString } from "../../services/notificationService";

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: "cost" | "income";
}

export function QuickAddModal({ visible, onClose, defaultType = "cost" }: QuickAddModalProps) {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { theme } = useTheme();
  const { showAlert } = useAppAlert();
  const { categories, categoryLabels, categorySubcategoryMap, subcategoryLabels } = useCategories();
  const queryClient = useQueryClient();

  const [type, setType] = useState<"cost" | "income">(defaultType);

  // Cost Form State
  const [costCategory, setCostCategory] = useState<string>("basic");
  const [costSubcategory, setCostSubcategory] = useState<string>("food");
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

  const handleCategoryChange = (cat: string) => {
    setCostCategory(cat);
    setCostDescError("");
    const validSubs = categorySubcategoryMap[cat] || ["other"];
    if (validSubs.length > 0) {
      setCostSubcategory(validSubs[0]!);
    } else {
      setCostSubcategory("other");
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
          category: costCategory as any,
          subcategory: costSubcategory as any,
          amount: numAmount,
          description: costDescription.trim() || null,
          date: costDate,
        });

        if (error) {
          const isConstraintError =
            error.code === "22P02" ||
            error.message?.includes("enum") ||
            error.message?.includes("chk_category_subcategory");

          if (isConstraintError) {
            const encodedDesc = encodeDynamicDescription(costCategory, costSubcategory, costDescription);
            const { error: fallbackError } = await supabase.from("costs").insert({
              user_id: userId,
              amount: numAmount,
              date: costDate,
              category: "basic",
              subcategory: "other",
              description: encodedDesc,
            });
            if (fallbackError) throw fallbackError;
          } else {
            throw error;
          }
        }

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
        showAlert("Success", "Expense logged successfully!");
      } catch (err: any) {
        showAlert("Error", err.message || "Failed to log expense");
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

  const categoryOptions = categories.map((c) => ({
    label: categoryLabels[c] || formatCategoryLabel(c),
    value: c,
  }));

  const subcategoryOptions = (categorySubcategoryMap[costCategory] || ["other"]).map((s) => ({
    label: subcategoryLabels[s] || formatSubcategoryLabel(s),
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
      confirmLabel={type === "cost" ? "Add Expense" : "Add Income"}
      confirmLoading={isSubmitting}
    >
      {/* Type Toggle Pills */}
      <View style={[styles.typePillContainer, { backgroundColor: theme.cardBorder + "30" }]}>
        <TouchableOpacity
          style={[
            styles.typePill,
            type === "cost" && [styles.typePillActive, { backgroundColor: "#ef4444" }],
          ]}
          onPress={() => setType("cost")}
        >
          <Text style={[styles.typePillText, { color: type === "cost" ? "#ffffff" : theme.textSecondary }]}>
            + Add Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typePill,
            type === "income" && [styles.typePillActive, { backgroundColor: theme.primary }],
          ]}
          onPress={() => setType("income")}
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
            onValueChange={(val) => handleCategoryChange(val)}
          />
          <SelectPicker
            label="Subcategory"
            options={subcategoryOptions}
            selectedValue={costSubcategory}
            onValueChange={(val) => setCostSubcategory(val)}
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
            placeholder="Source details or notes"
          />
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  typePillContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  typePillActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  formBlock: {
    gap: 2,
  },
});
