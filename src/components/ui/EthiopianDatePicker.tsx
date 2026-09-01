import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Calendar, X } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { useCalendar } from "../../context/CalendarContext";
import { AppModal } from "./Modal";
import { SelectPicker } from "./SelectPicker";
import { ETHIOPIAN_MONTHS, getEthiopianDate, toGregorianDate, getDaysInEthiopianMonth } from "../../shared-types";
import { formatEthiopianDate } from "../../lib/utils";

interface EthiopianDatePickerProps {
  label?: string;
  value: string; // Gregorian ISO "YYYY-MM-DD", or "" for unset
  onChange: (isoDate: string) => void;
  required?: boolean;
  placeholder?: string;
  clearable?: boolean;
}

const GREGORIAN_MONTHS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

const ethMonthOptions = ETHIOPIAN_MONTHS.map((m) => ({ label: `${m.nameEn} (${m.nameAm})`, value: m.number }));

function getDaysInGregorianMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function EthiopianDatePicker({
  label = "Date",
  value,
  onChange,
  required,
  placeholder = "Select date",
  clearable = false,
}: EthiopianDatePickerProps) {
  const { theme } = useTheme();
  const { calendarMode } = useCalendar();
  const [isOpen, setIsOpen] = useState(false);

  const [draftYear, setDraftYear] = useState(2026);
  const [draftMonth, setDraftMonth] = useState(8);
  const [draftDay, setDraftDay] = useState(15);

  const isGregorian = calendarMode === "gregorian";

  const selectedEth = value ? getEthiopianDate(value) : null;
  const selectedGreg = value ? new Date(value) : null;

  const openPicker = () => {
    if (isGregorian) {
      const d = value ? new Date(value) : new Date();
      setDraftYear(d.getFullYear());
      setDraftMonth(d.getMonth() + 1);
      setDraftDay(d.getDate());
    } else {
      const base = selectedEth || getEthiopianDate(new Date().toISOString().slice(0, 10));
      setDraftYear(base.year);
      setDraftMonth(base.month);
      setDraftDay(base.day);
    }
    setIsOpen(true);
  };

  const handleMonthChange = (month: number) => {
    setDraftMonth(month);
    const maxDay = isGregorian
      ? getDaysInGregorianMonth(draftYear, month)
      : getDaysInEthiopianMonth(draftYear, month);
    if (draftDay > maxDay) setDraftDay(maxDay);
  };

  const handleConfirm = () => {
    if (isGregorian) {
      const pad = (n: number) => String(n).padStart(2, "0");
      const iso = `${draftYear}-${pad(draftMonth)}-${pad(draftDay)}`;
      onChange(iso);
    } else {
      const gregorian = toGregorianDate(draftYear, draftMonth, draftDay);
      onChange(gregorian.toISOString().slice(0, 10));
    }
    setIsOpen(false);
  };

  // Options for Picker
  const yearOptions = Array.from({ length: 11 }, (_, i) => draftYear - 5 + i).map((y) => ({
    label: isGregorian ? `${y}` : `${y} E.C.`,
    value: y,
  }));

  const monthOptions = isGregorian ? GREGORIAN_MONTHS : ethMonthOptions;

  const maxDays = isGregorian
    ? getDaysInGregorianMonth(draftYear, draftMonth)
    : getDaysInEthiopianMonth(draftYear, draftMonth);

  const dayOptions = Array.from({ length: maxDays }, (_, i) => ({
    label: String(i + 1),
    value: i + 1,
  }));

  // Trigger Display Text
  const triggerText = React.useMemo(() => {
    if (!value) return placeholder;
    if (isGregorian) {
      try {
        const d = new Date(value);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
      } catch {
        return value;
      }
    }
    return formatEthiopianDate(value);
  }, [value, isGregorian, placeholder]);

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
              { color: value ? theme.textPrimary : theme.textMuted },
            ]}
          >
            {triggerText}
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
        title={isGregorian ? "Select Gregorian Date" : "Select Ethiopian Date"}
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
