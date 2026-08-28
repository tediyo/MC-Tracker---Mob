import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Calendar } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { AppModal } from "./Modal";
import { SelectPicker } from "./SelectPicker";
import { ETHIOPIAN_MONTHS, getEthiopianDate, toGregorianDate, getDaysInEthiopianMonth } from "../../shared-types";

interface EthiopianDatePickerProps {
  label?: string;
  value: string; // Gregorian ISO "YYYY-MM-DD" - the DB column is still Gregorian, this is just the input UI
  onChange: (isoDate: string) => void;
  required?: boolean;
}

const monthOptions = ETHIOPIAN_MONTHS.map((m) => ({ label: m.nameEn, value: m.number }));

/** Date field styled/behaved like the rest of the app's inputs+dropdowns (Input label,
 * SelectPicker-driven modal) but picks an Ethiopian year/month/day instead of typing a
 * raw Gregorian string - converts to/from Gregorian ISO under the hood for storage. */
export function EthiopianDatePicker({ label = "Date", value, onChange, required }: EthiopianDatePickerProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(1);
  const [draftMonth, setDraftMonth] = useState(1);
  const [draftDay, setDraftDay] = useState(1);

  const selectedEth = getEthiopianDate(value || new Date().toISOString().slice(0, 10));
  const monthName = ETHIOPIAN_MONTHS[selectedEth.month - 1]?.nameEn || selectedEth.month;

  const openPicker = () => {
    setDraftYear(selectedEth.year);
    setDraftMonth(selectedEth.month);
    setDraftDay(selectedEth.day);
    setIsOpen(true);
  };

  const handleMonthChange = (month: number) => {
    setDraftMonth(month);
    const maxDay = getDaysInEthiopianMonth(draftYear, month);
    if (draftDay > maxDay) setDraftDay(maxDay);
  };

  const handleConfirm = () => {
    const gregorian = toGregorianDate(draftYear, draftMonth, draftDay);
    onChange(gregorian.toISOString().slice(0, 10));
    setIsOpen(false);
  };

  const yearOptions = Array.from({ length: 11 }, (_, i) => selectedEth.year - 5 + i).map((y) => ({
    label: `${y} E.C.`,
    value: y,
  }));
  const dayOptions = Array.from({ length: getDaysInEthiopianMonth(draftYear, draftMonth) }, (_, i) => ({
    label: String(i + 1),
    value: i + 1,
  }));

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label} {required && <Text style={{ color: theme.danger }}>*</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
        onPress={openPicker}
        activeOpacity={0.75}
      >
        <Text style={[styles.triggerText, { color: theme.textPrimary }]}>
          {monthName} {selectedEth.day}, {selectedEth.year} E.C.
        </Text>
        <Calendar size={18} color={theme.primary} />
      </TouchableOpacity>

      <AppModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title="Select Date"
        onConfirm={handleConfirm}
        confirmLabel="Done"
      >
        <SelectPicker label="Year" options={yearOptions} selectedValue={draftYear} onValueChange={setDraftYear} />
        <SelectPicker
          label="Month"
          options={monthOptions}
          selectedValue={draftMonth}
          onValueChange={handleMonthChange}
        />
        <SelectPicker label="Day" options={dayOptions} selectedValue={draftDay} onValueChange={setDraftDay} />
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  trigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: { fontSize: 14, fontWeight: "500" },
});
