import type { IncomeRowInput, CostRowInput } from "./schemas";
import type { CreatePlanInput, UpdatePlanInput } from "./schemas";

/** Payload shape for a batch income insert (one Supabase `.insert([...])` call). */
export type NewIncomeInput = IncomeRowInput & { user_id: string };

/** Payload shape for a batch cost insert — `date` is hoisted from the shared batch-level field. */
export type NewCostInput = CostRowInput & { user_id: string; date: string };

export type { CreatePlanInput as NewPlanInput, UpdatePlanInput };
