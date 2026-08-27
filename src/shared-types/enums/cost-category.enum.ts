/**
 * Mirrors the `cost_category` Postgres enum
 * (supabase/migrations/..._create_enums.sql).
 */
export const COST_CATEGORIES = ["basic", "fancy", "extra"] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  basic: "Basic",
  fancy: "Fancy",
  extra: "Extra",
};
