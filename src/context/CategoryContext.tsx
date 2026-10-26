import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import {
  type CustomCategory,
  type CustomSubcategory,
  INTEREST_PRESETS,
  mergeCategories,
  mergeCategoryLabels,
  mergeCategorySubcategoryMap,
  mergeSubcategoryLabels,
  formatCategoryLabel,
  formatSubcategoryLabel,
} from "../shared-types";

const CATEGORIES_STORAGE_KEY = "@mc-tracker/custom-categories";
const SUBCATEGORIES_STORAGE_KEY = "@mc-tracker/custom-subcategories";

interface CategoryContextType {
  customCategories: CustomCategory[];
  customSubcategories: CustomSubcategory[];
  categories: string[];
  categoryLabels: Record<string, string>;
  categorySubcategoryMap: Record<string, readonly string[]>;
  subcategoryLabels: Record<string, string>;
  activePresetIds: string[];
  addCategory: (category: { key: string; label: string; icon?: string; color?: string }) => Promise<void>;
  deleteCategory: (categoryKey: string) => Promise<void>;
  addSubcategory: (subcategory: { categoryKey: string; key: string; label: string }) => Promise<void>;
  deleteSubcategory: (categoryKey: string, subcategoryKey: string) => Promise<void>;
  toggleInterestPreset: (presetId: string) => Promise<void>;
  isLoading: boolean;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType>({
  customCategories: [],
  customSubcategories: [],
  categories: ["basic", "fancy", "extra"],
  categoryLabels: { basic: "Basic", fancy: "Fancy", extra: "Extra" },
  categorySubcategoryMap: {
    basic: ["food", "house_hold", "taxi", "rent", "wifi", "other"],
    fancy: ["drunk", "coffee", "familia", "other"],
    extra: ["cks", "cloth", "shoe", "holiday", "other"],
  },
  subcategoryLabels: {},
  activePresetIds: [],
  addCategory: async () => {},
  deleteCategory: async () => {},
  addSubcategory: async () => {},
  deleteSubcategory: async () => {},
  toggleInterestPreset: async () => {},
  isLoading: false,
  refreshCategories: async () => {},
});

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [customSubcategories, setCustomSubcategories] = useState<CustomSubcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from local storage initially, then fetch remote metadata from Supabase
  const refreshCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const [savedCats, savedSubs] = await Promise.all([
        AsyncStorage.getItem(CATEGORIES_STORAGE_KEY),
        AsyncStorage.getItem(SUBCATEGORIES_STORAGE_KEY),
      ]);

      if (savedCats) {
        try {
          setCustomCategories(JSON.parse(savedCats));
        } catch {}
      }
      if (savedSubs) {
        try {
          setCustomSubcategories(JSON.parse(savedSubs));
        } catch {}
      }

      // Check remote user metadata from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metadata = user.user_metadata || {};
        const remoteCats: CustomCategory[] = Array.isArray(metadata.custom_categories)
          ? metadata.custom_categories
          : [];
        const remoteSubs: CustomSubcategory[] = Array.isArray(metadata.custom_subcategories)
          ? metadata.custom_subcategories
          : [];

        // Also check DB table if present
        try {
          const { data: dbCats } = await (supabase as any)
            .from("custom_categories")
            .select("key, label, icon, color")
            .eq("user_id", user.id);

          const { data: dbSubs } = await (supabase as any)
            .from("custom_subcategories")
            .select("key, category_key, label")
            .eq("user_id", user.id);

          if (dbCats && dbCats.length > 0) {
            const mergedCats = new Map<string, CustomCategory>();
            remoteCats.forEach((c) => mergedCats.set(c.key, c));
            dbCats.forEach((c: any) => mergedCats.set(c.key, c));

            const mergedSubs = new Map<string, CustomSubcategory>();
            remoteSubs.forEach((s) => mergedSubs.set(`${s.categoryKey}:::${s.key}`, s));
            if (dbSubs) {
              dbSubs.forEach((s: any) =>
                mergedSubs.set(`${s.category_key}:::${s.key}`, {
                  key: s.key,
                  categoryKey: s.category_key,
                  label: s.label,
                }),
              );
            }

            const finalCats = Array.from(mergedCats.values());
            const finalSubs = Array.from(mergedSubs.values());
            setCustomCategories(finalCats);
            setCustomSubcategories(finalSubs);
            await Promise.all([
              AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(finalCats)),
              AsyncStorage.setItem(SUBCATEGORIES_STORAGE_KEY, JSON.stringify(finalSubs)),
            ]);
            return;
          }
        } catch {
          // Table check ignored if not yet migrated
        }

        if (remoteCats.length > 0 || remoteSubs.length > 0) {
          setCustomCategories(remoteCats);
          setCustomSubcategories(remoteSubs);
          await Promise.all([
            AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(remoteCats)),
            AsyncStorage.setItem(SUBCATEGORIES_STORAGE_KEY, JSON.stringify(remoteSubs)),
          ]);
        }
      }
    } catch (err) {
      console.warn("[CategoryContext] Failed to load custom categories:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  // Sync updates to AsyncStorage and Supabase
  const persistCategories = async (cats: CustomCategory[], subs: CustomSubcategory[]) => {
    await Promise.all([
      AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats)),
      AsyncStorage.setItem(SUBCATEGORIES_STORAGE_KEY, JSON.stringify(subs)),
    ]);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 1. Supabase Auth user_metadata
      await supabase.auth.updateUser({
        data: {
          custom_categories: cats,
          custom_subcategories: subs,
        },
      });

      // 2. Supabase DB tables (if table exists)
      try {
        await (supabase as any).from("custom_categories").delete().eq("user_id", user.id);
        if (cats.length > 0) {
          await (supabase as any).from("custom_categories").insert(
            cats.map((c) => ({
              user_id: user.id,
              key: c.key,
              label: c.label,
              icon: c.icon || null,
              color: c.color || null,
            })),
          );
        }

        await (supabase as any).from("custom_subcategories").delete().eq("user_id", user.id);
        if (subs.length > 0) {
          await (supabase as any).from("custom_subcategories").insert(
            subs.map((s) => ({
              user_id: user.id,
              category_key: s.categoryKey,
              key: s.key,
              label: s.label,
            })),
          );
        }
      } catch {
        // Fallback: user_metadata already persisted safely!
      }
    }
  };

  // Derived collections
  const categories = useMemo(() => mergeCategories(customCategories), [customCategories]);
  const categoryLabels = useMemo(() => mergeCategoryLabels(customCategories), [customCategories]);
  const categorySubcategoryMap = useMemo(
    () => mergeCategorySubcategoryMap(customCategories, customSubcategories),
    [customCategories, customSubcategories],
  );
  const subcategoryLabels = useMemo(
    () => mergeSubcategoryLabels(customSubcategories),
    [customSubcategories],
  );

  const activePresetIds = useMemo(() => {
    const activeKeys = new Set(customCategories.map((c) => c.key));
    return INTEREST_PRESETS.filter((p) => activeKeys.has(p.category.key)).map((p) => p.id);
  }, [customCategories]);

  const addCategory = async (cat: { key: string; label: string; icon?: string; color?: string }) => {
    const normalizedKey = cat.key.trim().toLowerCase().replace(/\s+/g, "_");
    if (!normalizedKey) throw new Error("Category key is required");

    if (categories.includes(normalizedKey)) {
      throw new Error(`Category "${cat.label}" already exists`);
    }

    const newCategory: CustomCategory = {
      key: normalizedKey,
      label: cat.label.trim(),
      icon: cat.icon || "Tag",
      color: cat.color || "#10b981",
    };

    const nextCats = [...customCategories, newCategory];
    setCustomCategories(nextCats);
    await persistCategories(nextCats, customSubcategories);
  };

  const deleteCategory = async (categoryKey: string) => {
    const nextCats = customCategories.filter((c) => c.key !== categoryKey);
    const nextSubs = customSubcategories.filter((s) => s.categoryKey !== categoryKey);
    setCustomCategories(nextCats);
    setCustomSubcategories(nextSubs);
    await persistCategories(nextCats, nextSubs);
  };

  const addSubcategory = async (sub: { categoryKey: string; key: string; label: string }) => {
    const normalizedKey = sub.key.trim().toLowerCase().replace(/\s+/g, "_");
    if (!normalizedKey) throw new Error("Subcategory key is required");

    const currentSubs = categorySubcategoryMap[sub.categoryKey] || [];
    if (currentSubs.includes(normalizedKey)) {
      throw new Error(`Subcategory "${sub.label}" already exists in this category`);
    }

    const newSubcategory: CustomSubcategory = {
      categoryKey: sub.categoryKey,
      key: normalizedKey,
      label: sub.label.trim(),
    };

    const nextSubs = [...customSubcategories, newSubcategory];
    setCustomSubcategories(nextSubs);
    await persistCategories(customCategories, nextSubs);
  };

  const deleteSubcategory = async (categoryKey: string, subcategoryKey: string) => {
    const nextSubs = customSubcategories.filter(
      (s) => !(s.categoryKey === categoryKey && s.key === subcategoryKey),
    );
    setCustomSubcategories(nextSubs);
    await persistCategories(customCategories, nextSubs);
  };

  const toggleInterestPreset = async (presetId: string) => {
    const preset = INTEREST_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const isActive = customCategories.some((c) => c.key === preset.category.key);

    if (isActive) {
      const nextCats = customCategories.filter((c) => c.key !== preset.category.key);
      const nextSubs = customSubcategories.filter((s) => s.categoryKey !== preset.category.key);
      setCustomCategories(nextCats);
      setCustomSubcategories(nextSubs);
      await persistCategories(nextCats, nextSubs);
    } else {
      const nextCats = [...customCategories, preset.category];
      const newSubs: CustomSubcategory[] = preset.subcategories.map((sub) => ({
        categoryKey: preset.category.key,
        key: sub.key,
        label: sub.label,
      }));

      const existingKeys = new Set(customSubcategories.map((s) => `${s.categoryKey}:::${s.key}`));
      const filteredNewSubs = newSubs.filter((s) => !existingKeys.has(`${s.categoryKey}:::${s.key}`));
      const nextSubs = [...customSubcategories, ...filteredNewSubs];

      setCustomCategories(nextCats);
      setCustomSubcategories(nextSubs);
      await persistCategories(nextCats, nextSubs);
    }
  };

  return (
    <CategoryContext.Provider
      value={{
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
        isLoading,
        refreshCategories,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export const useCategories = () => useContext(CategoryContext);
