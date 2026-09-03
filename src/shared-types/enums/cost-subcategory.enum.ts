/**
 * Mirrors the unified `cost_subcategory` Postgres enum
 * (supabase/migrations/..._create_enums.sql). The *valid pairing* with a
 * CostCategory is not encoded in this enum itself — see
 * `constants/category-subcategory-map.ts`, which is the single source of
 * truth for that rule on the TS side (mirroring the SQL CHECK constraint on
 * `costs`).
 */
export const COST_SUBCATEGORIES = [
  "food",
  "house_hold",
  "taxi",
  "rent",
  "wifi",
  "drunk",
  "coffee",
  "familia",
  "cks",
  "cloth",
  "shoe",
  "holiday",
  "other",
] as const;

export type CostSubcategory = (typeof COST_SUBCATEGORIES)[number];

export const COST_SUBCATEGORY_LABELS: Record<CostSubcategory, string> = {
  food: "Food",
  house_hold: "House hold",
  taxi: "Taxi",
  rent: "Rent",
  wifi: "Wifi",
  drunk: "Drunk",
  coffee: "Coffee",
  familia: "Familia",
  cks: "CKS",
  cloth: "Cloth",
  shoe: "Shoe",
  holiday: "Holiday",
  other: "Other",
};
