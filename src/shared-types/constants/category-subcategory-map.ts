import type { CostCategory } from "../enums/cost-category.enum";
import type { CostSubcategory } from "../enums/cost-subcategory.enum";

/**
 * Single TS source of truth for which subcategories are valid under each
 * category. This must stay in sync by hand with the `chk_category_subcategory`
 * CHECK constraint in
 * `supabase/migrations/..._create_costs_table.sql` — if you add/remove a
 * subcategory here, update that migration (as a new migration; Postgres
 * enum values are append-only) too.
 */
export const CATEGORY_SUBCATEGORY_MAP: Record<CostCategory, readonly CostSubcategory[]> = {
  basic: ["food", "asbeza", "taxi", "rent", "wifi", "other"],
  fancy: ["drunk", "coffee", "familia", "other"],
  extra: ["cks", "cloth", "shoe", "holiday", "other"],
};

export const COST_SUBCATEGORIES_BY_CATEGORY = CATEGORY_SUBCATEGORY_MAP;

export function isValidSubcategoryForCategory(
  category: CostCategory,
  subcategory: CostSubcategory,
): boolean {
  return CATEGORY_SUBCATEGORY_MAP[category].includes(subcategory);
}
