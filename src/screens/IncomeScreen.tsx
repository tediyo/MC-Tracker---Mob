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
import { Search, Edit2, Trash2 } from "lucide-react-native";
import {
  INCOME_SOURCE_TYPES,
  INCOME_SOURCE_TYPE_LABELS,
  type IncomeSourceType,
} from "@mc-tracker/shared-types";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { SelectPicker } from "../components/ui/SelectPicker";
import { formatCurrency } from "../lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function IncomeScreen() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // Form State
  const [amount, setAmount] = useState("");
  const todayIso = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayIso);
  const [sourceType, setSourceType] = useState<IncomeSourceType>("monthly");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [search, setSearch] = useState("");

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch Incomes
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

  // Add Income Mutation
  const handleAddIncome = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid income amount");
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

      Alert.alert("Success", "Income entry logged successfully!");
      setAmount("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["mobile-incomes"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to log income");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Mutation
  const handleDelete = (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this income entry?", [
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

  // Edit Submit
  const handleUpdate = async () => {
    if (!editingItem) return;
    const numAmount = parseFloat(editingItem.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

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
      Alert.alert("Update Error", err.message);
    }
  };

  const filteredIncomes = incomes.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.description?.toLowerCase().includes(term) ||
      INCOME_SOURCE_TYPE_LABELS[r.source_type as IncomeSourceType]?.toLowerCase().includes(term) ||
      r.date.includes(term) ||
      r.amount.toString().includes(term)
    );
  });

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

        <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} required />

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

      {/* Income History Header */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Income History</Text>

      <Input
        placeholder="Search income history..."
        value={search}
        onChangeText={setSearch}
        containerStyle={{ marginBottom: 12 }}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
      ) : filteredIncomes.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No income entries logged yet.</Text>
      ) : (
        filteredIncomes.map((item) => (
          <Card key={item.id} style={styles.historyCard}>
            <View style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={[styles.historyDate, { color: theme.textMuted }]}>{item.date}</Text>
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
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Edit Income Entry</Text>
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
                  label="Description"
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
                  <Button
                    title="Save Changes"
                    onPress={handleUpdate}
                    style={{ flex: 1 }}
                  />
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
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginVertical: 4 },
  sourceBadgeText: { fontSize: 11, fontWeight: "700" },
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
