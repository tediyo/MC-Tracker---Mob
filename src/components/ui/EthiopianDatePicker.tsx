import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { Calendar, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { useCalendar } from "../../context/CalendarContext";
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

const GREGORIAN_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function getDaysInGregorianMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

  const isGregorian = calendarMode === "gregorian";

  // Viewing month/year in the calendar view
  const [viewYear, setViewYear] = useState(2018);
  const [viewMonth, setViewMonth] = useState(12);

  // Currently selected day/month/year (draft)
  const [selectedYear, setSelectedYear] = useState(2018);
  const [selectedMonth, setSelectedMonth] = useState(12);
  const [selectedDay, setSelectedDay] = useState(28);

  // Toggle year picker dropdown mode
  const [showYearPicker, setShowYearPicker] = useState(false);

  const openPicker = () => {
    setShowYearPicker(false);
    if (isGregorian) {
      const d = value ? new Date(value) : new Date();
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      setViewYear(y);
      setViewMonth(m);
      setSelectedYear(y);
      setSelectedMonth(m);
      setSelectedDay(day);
    } else {
      const eth = value ? getEthiopianDate(value) : getEthiopianDate(formatLocalDate(new Date()));
      setViewYear(eth.year);
      setViewMonth(eth.month);
      setSelectedYear(eth.year);
      setSelectedMonth(eth.month);
      setSelectedDay(eth.day);
    }
    setIsOpen(true);
  };

  const handlePrevMonth = () => {
    if (isGregorian) {
      if (viewMonth === 1) {
        setViewMonth(12);
        setViewYear((y) => y - 1);
      } else {
        setViewMonth((m) => m - 1);
      }
    } else {
      if (viewMonth === 1) {
        setViewMonth(13);
        setViewYear((y) => y - 1);
      } else {
        setViewMonth((m) => m - 1);
      }
    }
  };

  const handleNextMonth = () => {
    if (isGregorian) {
      if (viewMonth === 12) {
        setViewMonth(1);
        setViewYear((y) => y + 1);
      } else {
        setViewMonth((m) => m + 1);
      }
    } else {
      if (viewMonth === 13) {
        setViewMonth(1);
        setViewYear((y) => y + 1);
      } else {
        setViewMonth((m) => m + 1);
      }
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedYear(viewYear);
    setSelectedMonth(viewMonth);
    setSelectedDay(day);
  };

  const handleConfirm = () => {
    if (isGregorian) {
      const pad = (n: number) => String(n).padStart(2, "0");
      onChange(`${selectedYear}-${pad(selectedMonth)}-${pad(selectedDay)}`);
    } else {
      const greg = toGregorianDate(selectedYear, selectedMonth, selectedDay);
      onChange(formatLocalDate(greg));
    }
    setIsOpen(false);
  };

  // Calendar calculations for day grid
  const daysInMonth = useMemo(() => {
    return isGregorian
      ? getDaysInGregorianMonth(viewYear, viewMonth)
      : getDaysInEthiopianMonth(viewYear, viewMonth);
  }, [isGregorian, viewYear, viewMonth]);

  const firstDayWeekday = useMemo(() => {
    try {
      if (isGregorian) {
        return new Date(viewYear, viewMonth - 1, 1).getDay();
      }
      return toGregorianDate(viewYear, viewMonth, 1).getDay();
    } catch {
      return 0;
    }
  }, [isGregorian, viewYear, viewMonth]);

  // Selected date title display text
  const selectedDateHeader = useMemo(() => {
    if (isGregorian) {
      const mName = GREGORIAN_MONTH_NAMES[selectedMonth - 1] || "";
      return `${mName} ${selectedDay}, ${selectedYear}`;
    }
    const mName = ETHIOPIAN_MONTHS[selectedMonth - 1]?.nameEn || `Month ${selectedMonth}`;
    return `${mName} ${selectedDay}, ${selectedYear}`;
  }, [isGregorian, selectedYear, selectedMonth, selectedDay]);

  // View month display text
  const viewMonthName = useMemo(() => {
    if (isGregorian) {
      return GREGORIAN_MONTH_NAMES[viewMonth - 1] || "";
    }
    return ETHIOPIAN_MONTHS[viewMonth - 1]?.nameEn || `Month ${viewMonth}`;
  }, [isGregorian, viewMonth]);

  // Year choices for dropdown
  const yearOptions = useMemo(() => {
    const current = viewYear;
    return Array.from({ length: 15 }, (_, i) => current - 7 + i);
  }, [viewYear]);

  // Trigger input display text
  const triggerText = useMemo(() => {
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

      {/* Modern Calendar Grid Modal */}
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            {/* Header / Selected Date Title */}
            <View style={styles.headerBlock}>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Select date</Text>
              <Text style={[styles.headerDateTitle, { color: theme.textPrimary }]}>{selectedDateHeader}</Text>
              <View style={[styles.headerDivider, { backgroundColor: theme.cardBorder }]} />
            </View>

            {/* Month & Year Navigation Row */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.monthYearBtn}
                onPress={() => setShowYearPicker((p) => !p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.monthYearText, { color: theme.textPrimary }]}>
                  {viewMonthName} {viewYear}
                </Text>
                <ChevronDown size={18} color={theme.textPrimary} />
              </TouchableOpacity>

              <View style={styles.arrowGroup}>
                <TouchableOpacity
                  style={[styles.arrowBtn, { backgroundColor: theme.inputBg }]}
                  onPress={handlePrevMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronLeft size={20} color={theme.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.arrowBtn, { backgroundColor: theme.inputBg }]}
                  onPress={handleNextMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronRight size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {showYearPicker ? (
              /* Fast Year Selector */
              <ScrollView style={styles.yearListContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.yearGrid}>
                  {yearOptions.map((y) => {
                    const isSelected = y === viewYear;
                    return (
                      <TouchableOpacity
                        key={y}
                        style={[
                          styles.yearItem,
                          isSelected && { backgroundColor: theme.primary },
                        ]}
                        onPress={() => {
                          setViewYear(y);
                          setShowYearPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.yearItemText,
                            { color: isSelected ? "#ffffff" : theme.textPrimary },
                            isSelected && { fontWeight: "800" },
                          ]}
                        >
                          {y}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              /* Calendar Day Grid */
              <View style={styles.calendarContainer}>
                {/* Weekdays Row */}
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map((w, idx) => (
                    <View key={idx} style={styles.weekdayCell}>
                      <Text style={[styles.weekdayText, { color: theme.textPrimary }]}>{w}</Text>
                    </View>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {/* Leading blank offset cells */}
                  {Array.from({ length: firstDayWeekday }, (_, i) => (
                    <View key={`empty-${i}`} style={styles.dayCell} />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const isSelected =
                      day === selectedDay &&
                      viewMonth === selectedMonth &&
                      viewYear === selectedYear;

                    return (
                      <View key={`day-${day}`} style={styles.dayCell}>
                        <TouchableOpacity
                          style={[
                            styles.dayBtn,
                            isSelected && { backgroundColor: theme.primary },
                          ]}
                          onPress={() => handleSelectDay(day)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              { color: isSelected ? "#ffffff" : theme.textPrimary },
                              isSelected && styles.dayTextSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Bottom Modal Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.cancelActionBtn}
                onPress={() => setIsOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: theme.primary }]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  headerBlock: {
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  headerDateTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  headerDivider: {
    height: 1,
    width: "100%",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthYearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: "800",
  },
  arrowGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarContainer: {
    width: "100%",
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayCell: {
    width: "14.285%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: "800",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  dayCell: {
    width: "14.285%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  dayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dayTextSelected: {
    fontWeight: "800",
  },
  yearListContainer: {
    maxHeight: 240,
    marginVertical: 8,
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 8,
  },
  yearItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  yearItemText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
    paddingTop: 12,
  },
  cancelActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  confirmActionBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
});
