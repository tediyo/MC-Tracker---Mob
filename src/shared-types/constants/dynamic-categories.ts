import { COST_CATEGORIES, COST_CATEGORY_LABELS, type CostCategory } from "../enums/cost-category.enum";
import { COST_SUBCATEGORIES, COST_SUBCATEGORY_LABELS, type CostSubcategory } from "../enums/cost-subcategory.enum";
import { CATEGORY_SUBCATEGORY_MAP } from "./category-subcategory-map";

export interface CustomCategory {
  key: string;
  label: string;
  icon?: string;
  color?: string;
}

export interface CustomSubcategory {
  key: string;
  categoryKey: string;
  label: string;
}

export interface InterestPreset {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: CustomCategory;
  subcategories: { key: string; label: string }[];
}

/**
 * Curated starter packages based on user interests that users can activate with one click.
 */
export const INTEREST_PRESETS: readonly InterestPreset[] = [
  {
    id: "fitness",
    title: "Fitness & Health",
    description: "Gym, supplements, trainer sessions, sports activities, and recovery",
    icon: "Activity",
    color: "#10b981",
    category: {
      key: "fitness",
      label: "Fitness & Health",
      icon: "Activity",
      color: "#10b981",
    },
    subcategories: [
      { key: "gym", label: "Gym Membership" },
      { key: "supplements", label: "Supplements & Nutrition" },
      { key: "personal_trainer", label: "Personal Trainer" },
      { key: "sports_gear", label: "Sports & Gear" },
      { key: "spa_recovery", label: "Spa & Recovery" },
    ],
  },
  {
    id: "education",
    title: "Education & Growth",
    description: "Online courses, books, specialized certifications, and workshop tuition",
    icon: "GraduationCap",
    color: "#6366f1",
    category: {
      key: "education",
      label: "Education & Growth",
      icon: "GraduationCap",
      color: "#6366f1",
    },
    subcategories: [
      { key: "courses", label: "Online Courses & Degrees" },
      { key: "books", label: "Books & Audiobooks" },
      { key: "software_tools", label: "Learning Software & Tools" },
      { key: "certifications", label: "Certifications & Exams" },
    ],
  },
  {
    id: "tech_digital",
    title: "Tech & Subscriptions",
    description: "Cloud storage, SaaS subscriptions, streaming, hardware, and gadget accessories",
    icon: "Laptop",
    color: "#0ea5e9",
    category: {
      key: "tech",
      label: "Tech & Subscriptions",
      icon: "Laptop",
      color: "#0ea5e9",
    },
    subcategories: [
      { key: "cloud_hosting", label: "Cloud & Hosting" },
      { key: "software_subs", label: "Software & SaaS" },
      { key: "hardware", label: "Hardware & Devices" },
      { key: "gaming", label: "Gaming & Apps" },
    ],
  },
  {
    id: "travel",
    title: "Travel & Adventure",
    description: "Flight tickets, hotel accommodation, excursions, and travel gear",
    icon: "Compass",
    color: "#f59e0b",
    category: {
      key: "travel",
      label: "Travel & Adventure",
      icon: "Compass",
      color: "#f59e0b",
    },
    subcategories: [
      { key: "flights", label: "Flights & Transit" },
      { key: "hotels", label: "Hotels & Stays" },
      { key: "tours_activities", label: "Tours & Excursions" },
      { key: "travel_dining", label: "Vacation Dining" },
    ],
  },
  {
    id: "pets",
    title: "Pets & Companions",
    description: "Pet food, veterinary care, medication, grooming, and pet supplies",
    icon: "HeartHandshake",
    color: "#ec4899",
    category: {
      key: "pets",
      label: "Pets & Companions",
      icon: "HeartHandshake",
      color: "#ec4899",
    },
    subcategories: [
      { key: "pet_food", label: "Pet Food & Treats" },
      { key: "vet_medical", label: "Vet & Medical" },
      { key: "grooming", label: "Grooming & Hygiene" },
      { key: "pet_supplies", label: "Toys & Bedding" },
    ],
  },
  {
    id: "investments",
    title: "Investments & Wealth",
    description: "Stock market, crypto holdings, real estate, and emergency reserves",
    icon: "TrendingUp",
    color: "#14b8a6",
    category: {
      key: "investments",
      label: "Investments & Wealth",
      icon: "TrendingUp",
      color: "#14b8a6",
    },
    subcategories: [
      { key: "stocks_etfs", label: "Stocks & ETFs" },
      { key: "crypto", label: "Crypto Assets" },
      { key: "emergency_fund", label: "Emergency Reserve" },
      { key: "real_estate", label: "Real Estate" },
    ],
  },
  {
    id: "vehicle",
    title: "Vehicle & Transport",
    description: "Gas/fuel, servicing, auto insurance, and parking/toll expenses",
    icon: "Car",
    color: "#ef4444",
    category: {
      key: "vehicle",
      label: "Vehicle & Transport",
      icon: "Car",
      color: "#ef4444",
    },
    subcategories: [
      { key: "fuel", label: "Fuel & Gas" },
      { key: "maintenance", label: "Maintenance & Repairs" },
      { key: "insurance", label: "Auto Insurance" },
      { key: "parking_tolls", label: "Parking & Tolls" },
    ],
  },
];

/**
 * Format any category string key to a readable human label.
 */
export function formatCategoryLabel(category: string, customLabels?: Record<string, string>): string {
  if (customLabels && customLabels[category]) {
    return customLabels[category];
  }
  if (category in COST_CATEGORY_LABELS) {
    return COST_CATEGORY_LABELS[category as CostCategory];
  }
  return category
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Format any subcategory string key to a readable human label.
 */
export function formatSubcategoryLabel(subcategory: string, customLabels?: Record<string, string>): string {
  if (customLabels && customLabels[subcategory]) {
    return customLabels[subcategory];
  }
  if (subcategory in COST_SUBCATEGORY_LABELS) {
    return COST_SUBCATEGORY_LABELS[subcategory as CostSubcategory];
  }
  return subcategory
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Combine built-in categories with user's custom categories.
 */
export function mergeCategories(customCategories: CustomCategory[] = []): string[] {
  const result: string[] = [...COST_CATEGORIES];
  for (const cc of customCategories) {
    if (!result.includes(cc.key)) {
      result.push(cc.key);
    }
  }
  return result;
}

/**
 * Combine built-in category labels with user's custom category labels.
 */
export function mergeCategoryLabels(customCategories: CustomCategory[] = []): Record<string, string> {
  const labels: Record<string, string> = { ...COST_CATEGORY_LABELS };
  for (const cc of customCategories) {
    labels[cc.key] = cc.label;
  }
  return labels;
}

/**
 * Combine built-in category-subcategory map with user's custom categories and subcategories.
 */
export function mergeCategorySubcategoryMap(
  customCategories: CustomCategory[] = [],
  customSubcategories: CustomSubcategory[] = [],
): Record<string, readonly string[]> {
  const map: Record<string, string[]> = {};

  for (const cat of COST_CATEGORIES) {
    map[cat] = [...CATEGORY_SUBCATEGORY_MAP[cat]];
  }

  for (const cc of customCategories) {
    if (!map[cc.key]) {
      map[cc.key] = ["other"];
    }
  }

  for (const cs of customSubcategories) {
    if (!map[cs.categoryKey]) {
      map[cs.categoryKey] = ["other"];
    }
    if (!map[cs.categoryKey].includes(cs.key)) {
      const otherIdx = map[cs.categoryKey].indexOf("other");
      if (otherIdx >= 0) {
        map[cs.categoryKey].splice(otherIdx, 0, cs.key);
      } else {
        map[cs.categoryKey].push(cs.key);
      }
    }
  }

  return map;
}

/**
 * Combine built-in subcategory labels with user's custom subcategory labels.
 */
export function mergeSubcategoryLabels(customSubcategories: CustomSubcategory[] = []): Record<string, string> {
  const labels: Record<string, string> = { ...COST_SUBCATEGORY_LABELS };
  for (const cs of customSubcategories) {
    labels[cs.key] = cs.label;
  }
  return labels;
}

const DYNAMIC_TAG_REGEX = /^\[Dynamic:\s*([^/\]]+)\s*\/\s*([^\]]+)\]\s*(.*)$/;

/**
 * Decode a cost row that may contain dynamic category/subcategory encoded in description
 * for backwards compatibility with legacy database constraints.
 */
export function decodeCostRow<T extends { category: string; subcategory: string; description?: string | null }>(
  row: T,
): T {
  if (!row.description) return row;
  const match = row.description.match(DYNAMIC_TAG_REGEX);
  if (match && match[1] && match[2]) {
    const dynamicCategory = match[1].trim();
    const dynamicSubcategory = match[2].trim();
    const remainingDescription = (match[3] || "").trim();
    return {
      ...row,
      category: dynamicCategory,
      subcategory: dynamicSubcategory,
      description: remainingDescription || null,
    };
  }
  return row;
}

/**
 * Format a description string with dynamic category and subcategory tags
 * when storing in a database that enforces static enums.
 */
export function encodeDynamicDescription(
  category: string,
  subcategory: string,
  originalDescription?: string | null,
): string {
  const trimmed = (originalDescription || "").trim();
  const tag = `[Dynamic: ${category} / ${subcategory}]`;
  return trimmed ? `${tag} ${trimmed}` : tag;
}
