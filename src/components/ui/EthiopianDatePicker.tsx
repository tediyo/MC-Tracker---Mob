import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Calendar, X } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { AppModal } from "./Modal";
import { SelectPicker } from "./SelectPicker";
import { ETHIOPIAN_MONTHS, getEthiopianDate, toGregorianDate, getDaysInEthiopianMonth } from "../../shared-types";
import { formatEthiopianDate } from "../../lib/utils";

interface EthiopianDatePickerProps {
  label?: string;
  value: string; // Gregorian ISO "YYYY-MM-DD", or "" for unset (e.g. an unapplied filter)
  onChange: (isoDate: string) => void;
  required?: boolean;
  /** Shown in the trigger when value is "" - e.g. "Any date" for an optional filter. */
  placeholder?: string;
  /** Shows a small clear (x) button next to the trigger when a value is set - for
   * optional fields like filters, not the required date on an entry form. */
  clearable?: boolean;
}

const monthOptions = ETHIOPIAN_MONTHS.map((m) => ({ label: m.nameEn, value: m.number }));

/** Date field styled/behaved like the rest of the app's inputs+dropdowns (Input label,
 * SelectPicker-driven modal) but picks an Ethiopian year/month/day instead of typing a
 * raw Gregorian string - converts to/from Gregorian ISO under the hood for storage. */
export function EthiopianDatePicker({
  label = "Date",
  value,
  onChange,
  required,
  placeholder = "Select date",
  clearable = false,
}: EthiopianDatePickerProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(1);
  const [draftMonth, setDraftMonth] = useState(1);
  const [draftDay, setDraftDay] = useState(1);

  const selectedEth = value ? getEthiopianDate(value) : null;

  const openPicker = () => {
    const base = selectedEth || getEthiopianDate(new Date().toISOString().slice(0, 10));
    setDraftYear(base.year);
    setDraftMonth(base.month);
    setDraftDay(base.day);
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

  const yearOptions = Array.from({ length: 11 }, (_, i) => draftYear - 5 + i).map((y) => ({
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

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.trigger, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
          onPress={openPicker}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.triggerText,
              { color: selectedEth ? theme.textPrimary : theme.textMuted },
            ]}
          >
            {selectedEth ? formatEthiopianDate(value) : placeholder}
          </Text>
          <Calendar size={18} color={theme.primary} />
        </TouchableOpacity>

        {clearable && value ? (
          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
            onPress={() => onChange("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Clear date"
          >
            <X size={16} color={theme.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

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
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  trigger: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: { fontSize: 14, fontWeight: "500" },
  clearBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
  },
});
