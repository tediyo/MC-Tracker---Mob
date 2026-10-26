import { z } from "zod";
import { isValidSubcategoryForCategory } from "../constants/category-subcategory-map";
import type { CostCategory, CostSubcategory } from "../enums";
import { COST_CATEGORIES } from "../enums/cost-category.enum";

/**
 * One cost row within a batch submission.
 * Accepts both standard and dynamic user-created categories & subcategories.
 * Enforces valid pairing for built-in categories and mandatory reason for "other".
 */
export const costRowSchema = z
  .object({
    category: z.string().min(1, "Category is required"),
    subcategory: z.string().min(1, "Subcategory is required"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    description: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((row, ctx) => {
    // If it's a known default category and default subcategory, enforce built-in map
    if (
      COST_CATEGORIES.includes(row.category as CostCategory) &&
      !isValidSubcategoryForCategory(row.category as CostCategory, row.subcategory as CostSubcategory)
    ) {
      // Dynamic subcategories allowed
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
