import { z } from "zod";
import { INCOME_SOURCE_TYPES } from "../enums/income-source-type.enum";

/** One income row within a batch submission. */
export const incomeRowSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  source_type: z.enum(INCOME_SOURCE_TYPES),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

/** The whole "add income" form: one or more rows, submitted as a single batch insert. */
export const createIncomeBatchSchema = z.object({
  rows: z.array(incomeRowSchema).min(1, "Add at least one income row"),
});

export type IncomeRowInput = z.infer<typeof incomeRowSchema>;
export type CreateIncomeBatchInput = z.infer<typeof createIncomeBatchSchema>;
