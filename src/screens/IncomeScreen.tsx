import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { INCOME_SOURCE_TYPES, INCOME_SOURCE_TYPE_LABELS, type IncomeSourceType } from "../shared-types";
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

interface IncomeScreenProps {
  onViewHistory: () => void;
}

export function IncomeScreen({ onViewHistory }: IncomeScreenProps) {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { theme } = useTheme();
  const { calendarMode } = useCalendar();
  const { showAlert } = useAppAlert();
  const queryClient = useQueryClient();

  // Form State
  const [amount, setAmount] = useState("");
  const todayIso = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayIso);
  const [sourceType, setSourceType] = useState<IncomeSourceType>("monthly");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Same query/cache the full History screen uses - here we only show the first few.
  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ["mobile-incomes", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incomes")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
  const recentIncomes = incomes.slice(0, RECENT_COUNT);

  // Add Income Mutation
  const handleAddIncome = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showAlert("Invalid Amount", "Please enter a valid income amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("incomes").insert({
        user_id: userId,
        amount: numAmount,
        date,
        source_type: sourceType,
        description,
      });

      if (error) throw error;

      showAlert("Success", "Income entry logged successfully!");
      setAmount("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["mobile-incomes"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to log income");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceOptions = INCOME_SOURCE_TYPES.map((st) => ({
    label: INCOME_SOURCE_TYPE_LABELS[st],
    value: st,
  }));

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: theme.textPrimary }]}>Income Tracker</Text>

      {/* Entry Form */}
      <Card style={styles.formCard}>
        <Text style={[styles.formTitle, { color: theme.textPrimary }]}>Log Income</Text>

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
          label="Source Type"
          options={sourceOptions}
          selectedValue={sourceType}
          onValueChange={setSourceType}
        />

        <Input
          label="Description / Notes"
          placeholder="Add details..."
          value={description}
          onChangeText={setDescription}
        />

        <Button
          title="Log Income Entry"
          onPress={handleAddIncome}
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
      ) : recentIncomes.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No income entries logged yet.</Text>
      ) : (
        recentIncomes.map((item) => (
          <Card key={item.id} style={styles.historyCard}>
            <View style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={[styles.historyDate, { color: theme.textMuted }]}>{formatDateByMode(item.date, calendarMode)}</Text>
                <View style={[styles.sourceBadge, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.sourceBadgeText, { color: theme.primary }]}>
                    {INCOME_SOURCE_TYPE_LABELS[item.source_type as IncomeSourceType]}
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
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginVertical: 4 },
  sourceBadgeText: { fontSize: 11, fontWeight: "700" },
  historyDesc: { fontSize: 12, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: "800" },
});
