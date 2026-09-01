import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { ChevronDown, ChevronUp, Check } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";

export interface OptionItem {
  label: string;
  value: string | number;
}

interface SelectPickerProps {
  label?: string;
  options: OptionItem[];
  selectedValue: string | number;
  onValueChange: (value: any) => void;
}

export function SelectPicker({ label, options, selectedValue, onValueChange }: SelectPickerProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === selectedValue) || options[0];

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}

      {/* Picker Trigger Field */}
      <TouchableOpacity
        style={[
          styles.pickerButton,
          {
            backgroundColor: theme.inputBg,
            borderColor: isOpen ? theme.primary : theme.cardBorder,
          },
        ]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.75}
      >
        <Text style={[styles.pickerText, { color: theme.textPrimary }]}>
          {selectedOption ? selectedOption.label : "Select..."}
        </Text>
        {isOpen ? (
          <ChevronUp size={18} color={theme.primary} />
        ) : (
          <ChevronDown size={18} color={theme.primary} />
        )}
      </TouchableOpacity>

      {/* Scrollable Dropdown List */}
      {isOpen && (
        <View
          style={[
            styles.dropdownContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <ScrollView
            style={styles.dropdownScrollView}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((item) => {
              const isSelected = item.value === selectedValue;
              return (
                <TouchableOpacity
                  key={String(item.value)}
                  style={[
                    styles.optionRow,
                    { borderBottomColor: theme.cardBorder },
                    isSelected && { backgroundColor: theme.primaryLight },
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setIsOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSelected ? theme.primary : theme.textPrimary },
                      isSelected && styles.selectedOptionText,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isSelected && <Check size={16} color={theme.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    position: "relative",
    zIndex: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownContainer: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 220,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdownScrollView: {
    maxHeight: 220,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 14,
  },
  selectedOptionText: {
    fontWeight: "700",
  },
});
