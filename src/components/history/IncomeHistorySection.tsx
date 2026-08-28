import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Edit2, Trash2 } from "lucide-react-native";
import { INCOME_SOURCE_TYPES, INCOME_SOURCE_TYPE_LABELS, type IncomeSourceType } from "../../shared-types";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppAlert } from "../../context/AlertContext";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { AppModal } from "../ui/Modal";
import { EthiopianDatePicker } from "../ui/EthiopianDatePicker";
import { SelectPicker } from "../ui/SelectPicker";
import { formatCurrency, formatEthiopianDate } from "../../lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

/** The full, filterable income history - lives on the History screen. Uses the same
 * ["mobile-incomes", userId] query as IncomeScreen's recent-transactions preview, so both
 * share one cache instead of double-fetching. */
export function IncomeHistorySection() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { theme } = useTheme();
  const { showAlert } = useAppAlert();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const hasActiveFilters = !!search.trim() || sourceFilter !== "all" || !!dateFrom || !!dateTo;
  const clearFilters = () => {
    setSearch("");
    setSourceFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const [editingItem, setEditingItem] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleDelete = (id: string) => {
    showAlert("Confirm Delete", "Are you sure you want to delete this income entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("incomes").delete().eq("id", id);
          queryClient.invalidateQueries({ queryKey: ["mobile-incomes"] });
          queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
        },
      },
    ]);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const numAmount = parseFloat(editingItem.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showAlert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("incomes")
        .update({
          amount: numAmount,
          date: editingItem.date,
          description: editingItem.description,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["mobile-incomes"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
    } catch (err: any) {
      showAlert("Update Error", err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredIncomes = incomes.filter((r) => {
    if (sourceFilter !== "all" && r.source_type !== sourceFilter) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.description?.toLowerCase().includes(term) ||
      INCOME_SOURCE_TYPE_LABELS[r.source_type as IncomeSourceType]?.toLowerCase().includes(term) ||
      formatEthiopianDate(r.date).toLowerCase().includes(term) ||
      r.amount.toString().includes(term)
    );
  });

  const sourceOptions = INCOME_SOURCE_TYPES.map((st) => ({ label: INCOME_SOURCE_TYPE_LABELS[st], value: st }));

  return (
    <View>
      <Card style={styles.filterCard}>
        <View style={styles.filterHeaderRow}>
          <Text style={[styles.filterTitle, { color: theme.textPrimary }]}>Filters</Text>
          {hasActiveFilters && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={[styles.clearFiltersText, { color: theme.primary }]}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>

        <Input placeholder="Search income history..." value={search} onChangeText={setSearch} />

        <SelectPicker
          label="Source Type"
          options={[{ label: "All Sources", value: "all" }, ...sourceOptions]}
          selectedValue={sourceFilter}
          onValueChange={setSourceFilter}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>Date Range</Text>
        <View style={styles.dateRangeRow}>
          <View style={styles.dateRangeField}>
            <EthiopianDatePicker label="" value={dateFrom} onChange={setDateFrom} placeholder="From" clearable />
          </View>
          <View style={styles.dateRangeField}>
            <EthiopianDatePicker label="" value={dateTo} onChange={setDateTo} placeholder="To" clearable />
          </View>
        </View>
      </Card>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
      ) : filteredIncomes.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No income entries match these filters.</Text>
      ) : (
        filteredIncomes.map((item) => (
          <Card key={item.id} style={styles.historyCard}>
            <View style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={[styles.historyDate, { color: theme.textMuted }]}>{formatEthiopianDate(item.date)}</Text>
                <View style={[styles.sourceBadge, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.sourceBadgeText, { color: theme.primary }]}>
                    {INCOME_SOURCE_TYPE_LABELS[item.source_type as IncomeSourceType]}
                  </Text>
                </View>
                {item.description ? (
                  <Text style={[styles.historyDesc, { color: theme.textSecondary }]}>{item.description}</Text>
                ) : null}
              </View>

              <View style={styles.historyRight}>
                <Text style={[styles.historyAmount, { color: theme.textPrimary }]}>
                  {formatCurrency(Number(item.amount))}
                </Text>

                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => setEditingItem(item)} style={styles.actionBtn}>
                    <Edit2 size={16} color={theme.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                    <Trash2 size={16} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Card>
        ))
      )}

      <AppModal
        visible={editingItem !== null}
        onClose={() => setEditingItem(null)}
        title="Edit Income Entry"
        onConfirm={handleUpdate}
        confirmLabel="Save Changes"
        confirmLoading={isUpdating}
      >
        {editingItem && (
          <>
            <Input
              label="Amount (USD)"
              value={String(editingItem.amount)}
              onChangeText={(val) => setEditingItem({ ...editingItem, amount: val })}
              keyboardType="numeric"
            />

            <EthiopianDatePicker
              label="Date"
              value={editingItem.date}
              onChange={(val) => setEditingItem({ ...editingItem, date: val })}
            />

            <Input
              label="Description"
              value={editingItem.description || ""}
              onChangeText={(val) => setEditingItem({ ...editingItem, description: val })}
            />
          </>
        )}
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  filterCard: { padding: 16, marginBottom: 16 },
  filterHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  filterTitle: { fontSize: 14, fontWeight: "700" },
  clearFiltersText: { fontSize: 12, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  dateRangeRow: { flexDirection: "row", gap: 10 },
  dateRangeField: { flex: 1 },
  emptyText: { textAlign: "center", fontSize: 13, marginVertical: 20 },
  historyCard: { padding: 14, marginBottom: 10 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyLeft: { flex: 1, paddingRight: 10 },
  historyDate: { fontSize: 11, fontWeight: "600" },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginVertical: 4 },
  sourceBadgeText: { fontSize: 11, fontWeight: "700" },
  historyDesc: { fontSize: 12, marginTop: 2 },
  historyRight: { alignItems: "flex-end" },
  historyAmount: { fontSize: 15, fontWeight: "800" },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionBtn: { padding: 4 },
});
