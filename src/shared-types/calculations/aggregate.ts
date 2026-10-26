import { parseISO, isWithinInterval } from "date-fns";
import type { IncomeRow, CostRow } from "../db";
import type { CostCategory } from "../enums/cost-category.enum";
import { CATEGORY_SUBCATEGORY_MAP } from "../constants/category-subcategory-map";

export interface DateRange {
  start: Date;
  end: Date;
}

const _parsedDateCache = new Map<string, Date>();

export function parseISOCached(dateStr: string): Date {
  let d = _parsedDateCache.get(dateStr);
  if (!d) {
    d = parseISO(dateStr);
    _parsedDateCache.set(dateStr, d);
  }
  return d;
}

function isDateInRange(dateStr: string, range: DateRange): boolean {
  return isWithinInterval(parseISOCached(dateStr), { start: range.start, end: range.end });
}

export function filterIncomesInRange(rows: readonly IncomeRow[], range: DateRange): IncomeRow[] {
  return rows.filter((row) => isDateInRange(row.date, range));
}

export function filterCostsInRange(rows: readonly CostRow[], range: DateRange): CostRow[] {
  return rows.filter((row) => isDateInRange(row.date, range));
}

export function sumIncome(rows: readonly IncomeRow[], range: DateRange): number {
  return filterIncomesInRange(rows, range).reduce((total, row) => total + Number(row.amount), 0);
}

export function sumCosts(rows: readonly CostRow[], range: DateRange): number {
  return filterCostsInRange(rows, range).reduce((total, row) => total + Number(row.amount), 0);
}

/** Cost total per top-level category (supports standard and dynamic custom categories). */
export function groupCostsByCategory(
  rows: readonly CostRow[],
  range: DateRange,
): Record<string, number> {
  const totals: Record<string, number> = { basic: 0, fancy: 0, extra: 0 };
  for (const row of filterCostsInRange(rows, range)) {
    totals[row.category] = (totals[row.category] ?? 0) + Number(row.amount);
  }
  return totals;
}

/**
 * Cost total per subcategory within one category.
 * Supports custom categories and dynamic subcategories gracefully.
 */
export function groupCostsBySubcategory(
  rows: readonly CostRow[],
  range: DateRange,
  category: string,
  validSubcategories?: readonly string[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  const subcategories =
    validSubcategories ??
    (CATEGORY_SUBCATEGORY_MAP as Record<string, readonly string[]>)[category] ??
    [];
  for (const subcategory of subcategories) {
    totals[subcategory] = 0;
  }
  for (const row of filterCostsInRange(rows, range)) {
    if (row.category !== category) continue;
    totals[row.subcategory] = (totals[row.subcategory] ?? 0) + Number(row.amount);
  }
  return totals;
}
