import type { Database } from "./database.types";

/** Friendly aliases over the generated `Database` type — import these, not `Database` directly. */
export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type IncomeRow = Database["public"]["Tables"]["incomes"]["Row"];
export type CostRow = Database["public"]["Tables"]["costs"]["Row"];
export type PlanRow = Database["public"]["Tables"]["plans"]["Row"];

export type IncomeInsert = Database["public"]["Tables"]["incomes"]["Insert"];
export type CostInsert = Database["public"]["Tables"]["costs"]["Insert"];
export type PlanInsert = Database["public"]["Tables"]["plans"]["Insert"];
export type PlanUpdate = Database["public"]["Tables"]["plans"]["Update"];

export type GetPeriodSummaryRow =
  Database["public"]["Functions"]["get_period_summary"]["Returns"][number];
export type GetUsersMissingCostRow =
  Database["public"]["Functions"]["get_users_missing_cost_for_date"]["Returns"][number];
