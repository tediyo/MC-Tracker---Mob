import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  FolderPlus,
  Plus,
  Trash2,
  Check,
  Tag,
  Layers,
  Package,
  X,
  Activity,
  GraduationCap,
  Laptop,
  Compass,
  HeartHandshake,
  TrendingUp,
  Car,
} from "lucide-react-native";
import { useCategories } from "../../context/CategoryContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppAlert } from "../../context/AlertContext";
import { INTEREST_PRESETS } from "../../shared-types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { SelectPicker } from "../ui/SelectPicker";

interface CategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_ICONS: Record<string, React.ElementType> = {
  Activity,
  GraduationCap,
  Laptop,
  Compass,
  HeartHandshake,
  TrendingUp,
  Car,
};

const COLOR_OPTIONS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#ef4444", // Red
  "#6366f1", // Indigo
];

export function CategoryManagerModal({ visible, onClose }: CategoryManagerModalProps) {
  const { theme } = useTheme();
  const { showAlert } = useAppAlert();
  const {
    customCategories,
    customSubcategories,
    categories,
    categoryLabels,
    categorySubcategoryMap,
    subcategoryLabels,
    activePresetIds,
    addCategory,
    deleteCategory,
    addSubcategory,
    deleteSubcategory,
    toggleInterestPreset,
  } = useCategories();

  // Create Category Form State
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_OPTIONS[0]);
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Create Subcategory Form State
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [selectedParentCat, setSelectedParentCat] = useState(categories[0] || "basic");
  const [newSubLabel, setNewSubLabel] = useState("");
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Tab State: "presets" | "custom" | "all"
  const [activeTab, setActiveTab] = useState<"presets" | "all">("presets");

  const handleSaveCategory = async () => {
    const trimmed = newCatLabel.trim();
    if (!trimmed) {
      showAlert("Validation", "Please enter a category title");
      return;
    }

    setIsSubmittingCat(true);
    try {
      const generatedKey = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await addCategory({
        key: generatedKey,
        label: trimmed,
        color: newCatColor,
        icon: "Tag",
      });
      setNewCatLabel("");
      setIsAddingCat(false);
      showAlert("Success", `Category "${trimmed}" created`);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to save category");
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleSaveSubcategory = async () => {
    const trimmed = newSubLabel.trim();
    if (!trimmed) {
      showAlert("Validation", "Please enter a subcategory name");
      return;
    }

    setIsSubmittingSub(true);
    try {
      const generatedKey = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await addSubcategory({
        categoryKey: selectedParentCat,
        key: generatedKey,
        label: trimmed,
      });
      setNewSubLabel("");
      setIsAddingSub(false);
      showAlert("Success", `Subcategory "${trimmed}" created`);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to save subcategory");
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const confirmDeleteCategory = (key: string, label: string) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete "${label}" and its custom subcategories?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory(key);
              showAlert("Success", "Category removed");
            } catch (err: any) {
              showAlert("Error", err.message || "Failed to delete");
            }
          },
        },
      ]
    );
  };

  const confirmDeleteSubcategory = (catKey: string, subKey: string, label: string) => {
    Alert.alert(
      "Delete Subcategory",
      `Remove subcategory "${label}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSubcategory(catKey, subKey);
              showAlert("Success", "Subcategory removed");
            } catch (err: any) {
              showAlert("Error", err.message || "Failed to delete");
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: theme.background }]}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <FolderPlus size={22} color={theme.primary} />
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              Category Management
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tab Controls - Seamless Floating Pill without borders */}
        <View style={[styles.tabsRow, { backgroundColor: theme.background }]}>
          <View style={[styles.segmentedTrack, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "presets" && [styles.activeTabBtn, { backgroundColor: theme.primary }],
              ]}
              onPress={() => setActiveTab("presets")}
              activeOpacity={0.7}
            >
              <Package size={14} color={activeTab === "presets" ? "#ffffff" : theme.textMuted} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "presets" ? "#ffffff" : theme.textMuted },
                ]}
              >
                Preconfigured Packs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "all" && [styles.activeTabBtn, { backgroundColor: theme.primary }],
              ]}
              onPress={() => setActiveTab("all")}
              activeOpacity={0.7}
            >
              <Layers size={14} color={activeTab === "all" ? "#ffffff" : theme.textMuted} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "all" ? "#ffffff" : theme.textMuted },
                ]}
              >
                Active Categories ({categories.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Action Row: Create Category & Add Subcategory buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                setIsAddingCat(true);
                setIsAddingSub(false);
              }}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.primaryActionBtnText}>New Category</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, { borderColor: theme.cardBorder, backgroundColor: theme.surface }]}
              onPress={() => {
                setIsAddingSub(true);
                setIsAddingCat(false);
              }}
              activeOpacity={0.8}
            >
              <Plus size={16} color={theme.textPrimary} />
              <Text style={[styles.secondaryActionBtnText, { color: theme.textPrimary }]}>
                New Subcategory
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form: Add Custom Category */}
          {isAddingCat && (
            <Card style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
              <View style={styles.formCardHeader}>
                <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>Create Category</Text>
                <TouchableOpacity onPress={() => setIsAddingCat(false)}>
                  <X size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <Input
                label="Category Title *"
                placeholder="e.g. Fitness & Health"
                value={newCatLabel}
                onChangeText={setNewCatLabel}
                autoFocus
              />

              <Text style={[styles.colorLabel, { color: theme.textMuted }]}>Accent Color</Text>
              <View style={styles.colorPalette}>
                {COLOR_OPTIONS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setNewCatColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      newCatColor === c && styles.colorDotSelected,
                    ]}
                  >
                    {newCatColor === c && <Check size={12} color="#ffffff" strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formBtnRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsAddingCat(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={isSubmittingCat ? "Saving..." : "Create Category"}
                  onPress={handleSaveCategory}
                  loading={isSubmittingCat}
                  style={{ flex: 1.5 }}
                />
              </View>
            </Card>
          )}

          {/* Form: Add Custom Subcategory */}
          {isAddingSub && (
            <Card style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
              <View style={styles.formCardHeader}>
                <Text style={[styles.formCardTitle, { color: theme.textPrimary }]}>Add Subcategory</Text>
                <TouchableOpacity onPress={() => setIsAddingSub(false)}>
                  <X size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <SelectPicker
                label="Parent Category"
                selectedValue={selectedParentCat}
                options={categories.map((c) => ({
                  label: categoryLabels[c] || c,
                  value: c,
                }))}
                onValueChange={setSelectedParentCat}
              />

              <Input
                label="Subcategory Name *"
                placeholder="e.g. Gym, Supplements, Courses"
                value={newSubLabel}
                onChangeText={setNewSubLabel}
                autoFocus
              />

              <View style={styles.formBtnRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsAddingSub(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={isSubmittingSub ? "Saving..." : "Add Subcategory"}
                  onPress={handleSaveSubcategory}
                  loading={isSubmittingSub}
                  style={{ flex: 1.5 }}
                />
              </View>
            </Card>
          )}

          {/* Tab 1: Preconfigured Packages */}
          {activeTab === "presets" && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                Preconfigured Packages
              </Text>
              <Text style={[styles.sectionSubtext, { color: theme.textMuted }]}>
                Curated classifications designed for your spending categories and lifestyle requirements.
              </Text>

              {INTEREST_PRESETS.map((preset) => {
                const isActive = activePresetIds.includes(preset.id);
                const IconComponent = PRESET_ICONS[preset.icon] || Tag;

                return (
                  <Card
                    key={preset.id}
                    style={[
                      styles.presetCard,
                      {
                        backgroundColor: theme.surface,
                        borderColor: isActive ? theme.primary : theme.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.presetTop}>
                      <View style={styles.presetTitleRow}>
                        <View
                          style={[
                            styles.presetIconWrap,
                            { backgroundColor: `${preset.color}25` },
                          ]}
                        >
                          <IconComponent size={18} color={preset.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.presetTitle, { color: theme.textPrimary }]}>
                            {preset.title}
                          </Text>
                          <Text style={[styles.presetDesc, { color: theme.textMuted }]}>
                            {preset.description}
                          </Text>
                        </View>
                      </View>

                      {isActive && (
                        <View style={[styles.activePill, { backgroundColor: theme.primaryLight }]}>
                          <Check size={12} color={theme.primary} />
                          <Text style={[styles.activePillText, { color: theme.primary }]}>Active</Text>
                        </View>
                      )}
                    </View>

                    {/* Subcategories tags */}
                    <View style={styles.tagsContainer}>
                      {preset.subcategories.map((sub) => (
                        <View
                          key={sub.key}
                          style={[styles.subTag, { backgroundColor: theme.cardBorder + "50" }]}
                        >
                          <Text style={[styles.subTagText, { color: theme.textSecondary }]}>
                            {sub.label}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <Button
                      title={isActive ? "Deactivate Pack" : "Activate Pack"}
                      variant={isActive ? "outline" : "primary"}
                      onPress={() => toggleInterestPreset(preset.id)}
                      style={{
                        ...styles.togglePresetBtn,
                        ...(isActive ? { borderColor: "#ef4444", borderWidth: 1 } : {}),
                      }}
                      textStyle={isActive ? { color: "#ef4444" } : undefined}
                    />
                  </Card>
                );
              })}
            </View>
          )}

          {/* Tab 2: All Active Categories & Subcategories */}
          {activeTab === "all" && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                Current Active Categories
              </Text>
              <Text style={[styles.sectionSubtext, { color: theme.textMuted }]}>
                All categories and subcategories available across the app. Custom additions can be removed at any time.
              </Text>

              {categories.map((catKey) => {
                const isCustom = customCategories.some((c) => c.key === catKey);
                const customCat = customCategories.find((c) => c.key === catKey);
                const subs = categorySubcategoryMap[catKey] || [];

                return (
                  <Card
                    key={catKey}
                    style={[styles.categoryCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                  >
                    <View style={styles.catHeader}>
                      <View style={styles.catTitleLeft}>
                        <View
                          style={[
                            styles.catDot,
                            { backgroundColor: customCat?.color || theme.primary },
                          ]}
                        />
                        <Text style={[styles.catName, { color: theme.textPrimary }]}>
                          {categoryLabels[catKey] || catKey}
                        </Text>
                        <View
                          style={[
                            styles.typeBadge,
                            {
                              backgroundColor: isCustom ? theme.primaryLight : theme.cardBorder,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeBadgeText,
                              { color: isCustom ? theme.primary : theme.textMuted },
                            ]}
                          >
                            {isCustom ? "Custom" : "Built-in"}
                          </Text>
                        </View>
                      </View>

                      {isCustom && (
                        <TouchableOpacity
                          onPress={() => confirmDeleteCategory(catKey, categoryLabels[catKey] || catKey)}
                          style={styles.deleteBtn}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Subcategories list */}
                    <View style={[styles.subsWrap, { borderTopColor: theme.cardBorder }]}>
                      {subs.map((subKey) => {
                        const isCustomSub = customSubcategories.some(
                          (s) => s.categoryKey === catKey && s.key === subKey
                        );
                        return (
                          <View
                            key={subKey}
                            style={[
                              styles.subChip,
                              {
                                backgroundColor: isCustomSub ? theme.primaryLight : theme.cardBorder + "60",
                                borderColor: isCustomSub ? theme.primary : "transparent",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.subChipText,
                                { color: isCustomSub ? theme.primary : theme.textSecondary },
                              ]}
                            >
                              {subcategoryLabels[subKey] || subKey}
                            </Text>
                            {isCustomSub && (
                              <TouchableOpacity
                                onPress={() =>
                                  confirmDeleteSubcategory(
                                    catKey,
                                    subKey,
                                    subcategoryLabels[subKey] || subKey
                                  )
                                }
                                style={{ marginLeft: 4 }}
                              >
                                <X size={12} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  segmentedTrack: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  activeTabBtn: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  formCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  formCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  colorPalette: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  formBtnRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  sectionContainer: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionSubtext: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  presetCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  presetTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  presetTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  presetIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  presetDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
    marginBottom: 12,
  },
  subTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subTagText: {
    fontSize: 11,
    fontWeight: "500",
  },
  togglePresetBtn: {
    marginTop: 2,
    height: 38,
  },
  categoryCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 14,
    fontWeight: "700",
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 4,
  },
  subsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  subChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
