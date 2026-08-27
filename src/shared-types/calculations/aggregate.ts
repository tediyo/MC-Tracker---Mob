import { parseISO, isWithinInterval } from "date-fns";
import type { IncomeRow, CostRow } from "../db";
import type { CostCategory } from "../enums/cost-category.enum";
import { CATEGORY_SUBCATEGORY_MAP } from "../constants/category-subcategory-map";

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Module-level cache: ISO date strings (YYYY-MM-DD) repeat heavily across
 * multiple calls per render — the same rows are scanned for the current
 * range, the previous range, and (in buildTrendSeries) once per bucket.
 * Parsing each unique string just once and reusing the Date object avoids
 * re-running the full string parser on every row × every call.
 *
 * The key space is bounded (YYYY-MM-DD strings for a personal tracker's
 * data range) so the Map never grows unboundedly.
 */
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

/** Cost total per top-level category (basic/fancy/extra), zero-filled so callers never see `undefined`. */
export function groupCostsByCategory(
  rows: readonly CostRow[],
  range: DateRange,
): Record<CostCategory, number> {
  const totals: Record<CostCategory, number> = { basic: 0, fancy: 0, extra: 0 };
  for (const row of filterCostsInRange(rows, range)) {
    totals[row.category] += Number(row.amount);
  }
  return totals;
}

/**
 * Cost total per subcategory *within one category*, zero-filled for every
 * subcategory valid under that category (per `CATEGORY_SUBCATEGORY_MAP`) so
 * a pie chart can render every slice even when a subcategory has no rows yet.
 */
export function groupCostsBySubcategory(
  rows: readonly CostRow[],
  range: DateRange,
  category: CostCategory,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const subcategory of CATEGORY_SUBCATEGORY_MAP[category]) {
    totals[subcategory] = 0;
  }
  for (const row of filterCostsInRange(rows, range)) {
    if (row.category !== category) continue;
    totals[row.subcategory] = (totals[row.subcategory] ?? 0) + Number(row.amount);
  }
  return totals;
}
