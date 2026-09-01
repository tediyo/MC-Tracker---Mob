import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Edit2, Trash2 } from "lucide-react-native";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  COST_SUBCATEGORY_LABELS,
  type CostCategory,
  type CostSubcategory,
} from "../../shared-types";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useCalendar } from "../../context/CalendarContext";
import { useAppAlert } from "../../context/AlertContext";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { AppModal } from "../ui/Modal";
import { EthiopianDatePicker } from "../ui/EthiopianDatePicker";
import { SelectPicker } from "../ui/SelectPicker";
import { formatCurrency, formatDateByMode } from "../../lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

/** The full, filterable expense history - lives on the History screen. Uses the same
 * ["mobile-costs", userId] query as CostsScreen's recent-transactions preview, so both
 * share one cache instead of double-fetching. */
export function CostHistorySection() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { theme } = useTheme();
  const { calendarMode } = useCalendar();
  const { showAlert } = useAppAlert();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const hasActiveFilters = !!search.trim() || categoryFilter !== "all" || !!dateFrom || !!dateTo;
  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const [editingItem, setEditingItem] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleDelete = (id: string) => {
    showAlert("Confirm Delete", "Are you sure you want to delete this cost entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("costs").delete().eq("id", id);
          queryClient.invalidateQueries({ queryKey: ["mobile-costs"] });
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

    if (editingItem.subcategory === "other" && !editingItem.description?.trim()) {
      showAlert("Reason Required", "Please specify a reason when selecting 'Other'.");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("costs")
        .update({
          amount: numAmount,
          date: editingItem.date,
          category: editingItem.category,
          subcategory: editingItem.subcategory,
          description: editingItem.description,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["mobile-costs"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
    } catch (err: any) {
      showAlert("Update Error", err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCosts = costs.filter((r) => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.description?.toLowerCase().includes(term) ||
      COST_CATEGORY_LABELS[r.category as CostCategory]?.toLowerCase().includes(term) ||
      COST_SUBCATEGORY_LABELS[r.subcategory as CostSubcategory]?.toLowerCase().includes(term) ||
      formatEthiopianDate(r.date).toLowerCase().includes(term) ||
      r.amount.toString().includes(term)
    );
  });

  const categoryOptions = COST_CATEGORIES.map((c) => ({ label: COST_CATEGORY_LABELS[c], value: c }));

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

        <Input placeholder="Search expenses..." value={search} onChangeText={setSearch} />

        <SelectPicker
          label="Category"
          options={[{ label: "All Categories", value: "all" }, ...categoryOptions]}
          selectedValue={categoryFilter}
          onValueChange={setCategoryFilter}
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
      ) : filteredCosts.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No expense entries match these filters.</Text>
      ) : (
        filteredCosts.map((item) => (
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
        title="Edit Expense Entry"
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
              label={editingItem.subcategory === "other" ? "Reason (Required) *" : "Description"}
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
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 4 },
  catBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontWeight: "700" },
  subText: { fontSize: 11, fontWeight: "600" },
  historyDesc: { fontSize: 12, marginTop: 2 },
  historyRight: { alignItems: "flex-end" },
  historyAmount: { fontSize: 15, fontWeight: "800" },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionBtn: { padding: 4 },
});
