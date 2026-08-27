import { z } from "zod";
import { COST_CATEGORIES } from "../enums/cost-category.enum";
import { COST_SUBCATEGORIES } from "../enums/cost-subcategory.enum";
import { isValidSubcategoryForCategory } from "../constants/category-subcategory-map";
import type { CostCategory, CostSubcategory } from "../enums";

/**
 * One cost row within a batch submission. `superRefine` enforces the
 * category -> subcategory pairing rule (mirrors the SQL CHECK constraint),
 * so an invalid combination is caught client-side before it ever reaches
 * Supabase.
 */
export const costRowSchema = z
  .object({
    category: z.enum(COST_CATEGORIES),
    subcategory: z.enum(COST_SUBCATEGORIES),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    description: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((row, ctx) => {
    if (!isValidSubcategoryForCategory(row.category as CostCategory, row.subcategory as CostSubcategory)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subcategory"],
        message: `"${row.subcategory}" is not a valid subcategory for "${row.category}"`,
      });
    }
    if (row.subcategory === "other" && (!row.description || row.description.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "Please specify a reason when selecting 'Other'",
      });
    }
  });

/**
 * The whole "add costs" form: one date shared by every row in the batch,
 * plus one or more category/subcategory/amount rows, submitted as a single
 * batch insert.
 */
export const createCostBatchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  rows: z.array(costRowSchema).min(1, "Add at least one cost row"),
});

export type CostRowInput = z.infer<typeof costRowSchema>;
export type CreateCostBatchInput = z.infer<typeof createCostBatchSchema>;
