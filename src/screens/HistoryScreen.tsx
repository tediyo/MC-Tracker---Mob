import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { IncomeHistorySection } from "../components/history/IncomeHistorySection";
import { CostHistorySection } from "../components/history/CostHistorySection";

export type HistoryTab = "income" | "costs";

interface HistoryScreenProps {
  initialTab: HistoryTab;
  onBack: () => void;
}

export function HistoryScreen({ initialTab, onBack }: HistoryScreenProps) {
  const { theme } = useTheme();
  const [tab, setTab] = useState<HistoryTab>(initialTab);

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>History</Text>
      </View>

      <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        {(["income", "costs"] as HistoryTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.togglePill, tab === t && { backgroundColor: theme.primary }]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, { color: tab === t ? "#ffffff" : theme.textSecondary }]}>
              {t === "income" ? "Income" : "Costs"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "income" ? <IncomeHistorySection /> : <CostHistorySection />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 125 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  backBtn: { padding: 2 },
  title: { fontSize: 20, fontWeight: "800" },
  toggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  toggleText: { fontSize: 13, fontWeight: "700" },
});
