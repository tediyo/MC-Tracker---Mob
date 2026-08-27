/**
 * Mirrors the `income_source_type` Postgres enum
 * (supabase/migrations/..._create_enums.sql).
 */
export const INCOME_SOURCE_TYPES = ["monthly", "other"] as const;

export type IncomeSourceType = (typeof INCOME_SOURCE_TYPES)[number];

export const INCOME_SOURCE_TYPE_LABELS: Record<IncomeSourceType, string> = {
  monthly: "Monthly",
  other: "Other",
};
