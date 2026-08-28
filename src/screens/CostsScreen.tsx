import React, { useState, useMemo } from "react";
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
import { Search, Edit2, Trash2 } from "lucide-react-native";
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
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { SelectPicker } from "../components/ui/SelectPicker";
import { formatCurrency } from "../lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function CostsScreen() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // Form state
  const [amount, setAmount] = useState("");
  const todayIso = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayIso);
  const [category, setCategory] = useState<CostCategory>("basic");
  const [subcategory, setSubcategory] = useState<CostSubcategory>("food");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any>(null);

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

  // Fetch Costs
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

  // Add Cost Handler with Mandatory Reason Validation
  const handleAddCost = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid cost amount");
      return;
    }

    // MANDATORY REASON VALIDATION FOR OTHER
    if (subcategory === "other" && !description.trim()) {
      Alert.alert("Reason Required", "Please specify a reason when selecting 'Other' subcategory.");
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

      Alert.alert("Success", "Expense entry logged successfully!");
      setAmount("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["mobile-costs"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to log cost");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Cost Handler
  const handleDelete = (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this cost entry?", [
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

  // Edit Update Handler
  const handleUpdate = async () => {
    if (!editingItem) return;
    const numAmount = parseFloat(editingItem.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (editingItem.subcategory === "other" && !editingItem.description?.trim()) {
      Alert.alert("Reason Required", "Please specify a reason when selecting 'Other'.");
      return;
    }

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
      Alert.alert("Update Error", err.message);
    }
  };

  const filteredCosts = costs.filter((r) => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.description?.toLowerCase().includes(term) ||
      COST_CATEGORY_LABELS[r.category as CostCategory]?.toLowerCase().includes(term) ||
      COST_SUBCATEGORY_LABELS[r.subcategory as CostSubcategory]?.toLowerCase().includes(term) ||
      r.date.includes(term) ||
      r.amount.toString().includes(term)
    );
  });

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

        <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} required />

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

      {/* History Header & Search/Filter */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Expense History</Text>

      <Input
        placeholder="Search expenses..."
        value={search}
        onChangeText={setSearch}
        containerStyle={{ marginBottom: 8 }}
      />

      <SelectPicker
        label="Filter Category"
        options={[
          { label: "All Categories", value: "all" },
          ...categoryOptions,
        ]}
        selectedValue={categoryFilter}
        onValueChange={setCategoryFilter}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
      ) : filteredCosts.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No expense entries logged yet.</Text>
      ) : (
        filteredCosts.map((item) => (
          <Card key={item.id} style={styles.historyCard}>
            <View style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={[styles.historyDate, { color: theme.textMuted }]}>{item.date}</Text>

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
                  <TouchableOpacity
                    onPress={() => setEditingItem(item)}
                    style={styles.actionBtn}
                  >
                    <Edit2 size={16} color={theme.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={styles.actionBtn}
                  >
                    <Trash2 size={16} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Edit Modal */}
      <Modal visible={editingItem !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Edit Expense Entry</Text>
            {editingItem && (
              <>
                <Input
                  label="Amount (USD)"
                  value={String(editingItem.amount)}
                  onChangeText={(val) => setEditingItem({ ...editingItem, amount: val })}
                  keyboardType="numeric"
                />

                <Input
                  label="Date"
                  value={editingItem.date}
                  onChangeText={(val) => setEditingItem({ ...editingItem, date: val })}
                />

                <Input
                  label={editingItem.subcategory === "other" ? "Reason (Required) *" : "Description"}
                  value={editingItem.description || ""}
                  onChangeText={(val) => setEditingItem({ ...editingItem, description: val })}
                />

                <View style={styles.modalBtnRow}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setEditingItem(null)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button title="Save Changes" onPress={handleUpdate} style={{ flex: 1 }} />
                </View>
              </>
            )}
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
  formCard: { padding: 16, marginBottom: 20 },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  modalContent: { borderRadius: 16, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  modalBtnRow: { flexDirection: "row", marginTop: 14 },
});
