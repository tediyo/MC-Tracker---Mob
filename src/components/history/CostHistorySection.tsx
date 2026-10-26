import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Edit2, Trash2, Eye } from "lucide-react-native";
import {
  decodeCostRow,
  formatCategoryLabel,
  formatSubcategoryLabel,
  type CostCategory,
  type CostSubcategory,
} from "../../shared-types";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useCalendar } from "../../context/CalendarContext";
import { useAppAlert } from "../../context/AlertContext";
import { useCategories } from "../../context/CategoryContext";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { AppModal } from "../ui/Modal";
import { EthiopianDatePicker } from "../ui/EthiopianDatePicker";
import { SelectPicker } from "../ui/SelectPicker";
import { ListFeedSkeleton } from "../ui/Skeleton";
import { formatCurrency, formatDateByMode } from "../../lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export function CostHistorySection() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { theme } = useTheme();
  const { calendarMode } = useCalendar();
  const { showAlert } = useAppAlert();
  const { categories, categoryLabels, categorySubcategoryMap, subcategoryLabels } = useCategories();
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
  const [viewingDetail, setViewingDetail] = useState<any>(null);
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
      return (data || []).map((row: any) => decodeCostRow(row));
    },
    enabled: !!userId,
  });

  const handleDelete = async (id: string) => {
    showAlert("Confirm Delete", "Are you sure you want to remove this cost record?", [
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
      showAlert("Validation Error", "Amount must be greater than zero");
      return;
    }

    if (editingItem.subcategory === "other" && (!editingItem.description || !editingItem.description.trim())) {
      showAlert("Validation Error", "Reason is required when selecting 'Other'");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("costs")
        .update({
          amount: numAmount,
          date: editingItem.date,
          description: editingItem.description || null,
        })
        .eq("id", editingItem.id);
      if (error) throw error;

      showAlert("Success", "Expense updated successfully");
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["mobile-costs"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to update cost");
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
    const catLabel = categoryLabels[r.category] || formatCategoryLabel(r.category);
    const subLabel = subcategoryLabels[r.subcategory] || formatSubcategoryLabel(r.subcategory);

    return (
      r.description?.toLowerCase().includes(term) ||
      catLabel.toLowerCase().includes(term) ||
      subLabel.toLowerCase().includes(term) ||
      formatDateByMode(r.date, calendarMode).toLowerCase().includes(term) ||
      r.amount.toString().includes(term)
    );
  });

  const categoryOptions = categories.map((c) => ({
    label: categoryLabels[c] || formatCategoryLabel(c),
    value: c,
  }));

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
        <ListFeedSkeleton count={4} />
      ) : filteredCosts.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No expense entries match these filters.</Text>
      ) : (
        filteredCosts.map((item) => {
          const catLabel = categoryLabels[item.category] || formatCategoryLabel(item.category);
          const subLabel = subcategoryLabels[item.subcategory] || formatSubcategoryLabel(item.subcategory);

          return (
            <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => setViewingDetail(item)}>
              <Card style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={[styles.historyDate, { color: theme.textMuted }]}>{formatDateByMode(item.date, calendarMode)}</Text>

                    <View style={styles.badgeRow}>
                      <View style={[styles.catBadge, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.catBadgeText, { color: theme.primary }]}>
                          {catLabel}
                        </Text>
                      </View>
                      <Text style={[styles.subText, { color: theme.textSecondary }]}>
                        {subLabel}
                      </Text>
                    </View>

                    {item.description ? (
                      <Text style={[styles.historyDesc, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                  </View>

                  <View style={styles.historyRight}>
                    <Text style={[styles.historyAmount, { color: theme.textPrimary }]}>
                      {formatCurrency(Number(item.amount))}
                    </Text>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        onPress={() => setEditingItem(item)}
                        style={[styles.iconButton, { backgroundColor: theme.primaryLight }]}
                      >
                        <Edit2 size={14} color={theme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        style={[styles.iconButton, { backgroundColor: "#fee2e2" }]}
                      >
                        <Trash2 size={14} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })
      )}

      {/* Detail Modal */}
      <AppModal
        visible={viewingDetail !== null}
        onClose={() => setViewingDetail(null)}
        title="Expense Details"
        confirmLabel="Close"
        onConfirm={() => setViewingDetail(null)}
      >
        {viewingDetail && (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>Amount</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: theme.textPrimary }}>
                {formatCurrency(Number(viewingDetail.amount))}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>Date</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.textPrimary }}>
                {formatDateByMode(viewingDetail.date, calendarMode)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>Category</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.textPrimary }}>
                {categoryLabels[viewingDetail.category] || formatCategoryLabel(viewingDetail.category)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>Subcategory</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.textPrimary }}>
                {subcategoryLabels[viewingDetail.subcategory] || formatSubcategoryLabel(viewingDetail.subcategory)}
              </Text>
            </View>

            {viewingDetail.description ? (
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>Description / Reason</Text>
                <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>
                  {viewingDetail.description}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.cardBorder, alignItems: "center" }}
                onPress={() => {
                  const item = viewingDetail;
                  setViewingDetail(null);
                  setEditingItem(item);
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.textPrimary }}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.cardBorder, alignItems: "center" }}
                onPress={() => {
                  const item = viewingDetail;
                  setViewingDetail(null);
                  handleDelete(item.id);
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.danger }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </AppModal>

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
              label="Amount (ETB / USD)"
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
  filterCard: { padding: 14, marginBottom: 14 },
  filterHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  filterTitle: { fontSize: 14, fontWeight: "700" },
  clearFiltersText: { fontSize: 12, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "600", marginTop: 8, marginBottom: 4 },
  dateRangeRow: { flexDirection: "row", gap: 10 },
  dateRangeField: { flex: 1 },
  emptyText: { textAlign: "center", marginTop: 32, fontSize: 13 },
  historyCard: { padding: 14, marginBottom: 10 },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyLeft: { flex: 1, gap: 4 },
  historyDate: { fontSize: 11, fontWeight: "600" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: "700" },
  subText: { fontSize: 12, fontWeight: "600" },
  historyDesc: { fontSize: 12 },
  historyRight: { alignItems: "flex-end", gap: 8 },
  historyAmount: { fontSize: 15, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 6 },
  iconButton: { padding: 6, borderRadius: 8 },
});
