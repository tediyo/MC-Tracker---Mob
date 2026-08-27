import { describe, expect, it } from "vitest";
import { buildTrendSeries } from "./trend";
import type { IncomeRow, CostRow, PlanRow } from "../db";

function cost(date: string, amount: number): CostRow {
  return { id: `c-${date}-${amount}`, user_id: "u1", amount, category: "basic", subcategory: "food", date, description: null, created_at: date };
}
function plan(year: number, month: number, targetCostLimit: number): PlanRow {
  return {
    id: `plan-${year}-${month}`,
    user_id: "u1",
    year,
    month,
    target_cost_limit: targetCostLimit,
    target_savings_goal: 0,
    over_budget_alert_sent_at: null,
    created_at: `${year}-${String(month).padStart(2, "0")}-01`,
  };
}

const incomes: IncomeRow[] = [];
const referenceDate = new Date(2026, 7, 9);

describe("buildTrendSeries", () => {
  it("monthly: always returns Jan-Dec of the referenceDate's year, regardless of bucketCount", () => {
    const series = buildTrendSeries(incomes, [], [], "monthly", referenceDate);
    expect(series).toHaveLength(12);
    expect(series.at(0)?.bucketStart.getMonth()).toBe(0);
    expect(series.at(11)?.bucketStart.getMonth()).toBe(11);
    expect(series.every((p) => p.bucketStart.getFullYear() === 2026)).toBe(true);
  });

  it("daily: defaults to a trailing 30-day window ending at referenceDate", () => {
    const series = buildTrendSeries(incomes, [], [], "daily", referenceDate);
    expect(series).toHaveLength(30);
    expect(series.at(-1)?.bucketStart.toDateString()).toBe(referenceDate.toDateString());
  });

  it("accumulates cumulativeCost across buckets", () => {
    const costs = [cost("2026-08-01", 10), cost("2026-08-02", 5)];
    const series = buildTrendSeries(incomes, costs, [], "daily", referenceDate, 3);
    // buckets are the 3 trailing days ending at referenceDate (Aug 7, 8, 9) - our cost rows fall outside that window
    const totalCost = series.reduce((sum, p) => sum + p.cost, 0);
    expect(series.at(-1)?.cumulativeCost).toBe(totalCost);
  });

  it("attaches the owning month's plan target_cost_limit to each bucket, unprorated", () => {
    // August 1, 2026 (monthly bucket index 7) corresponds to Ethiopian Year 2018, Month 11 (Hamle)
    const plans = [plan(2018, 11, 3000)];
    const series = buildTrendSeries(incomes, [], plans, "monthly", referenceDate);
    expect(series.at(7)?.targetCostLimit).toBe(3000); // index 7 = August (Hamle 2018)
    expect(series.at(0)?.targetCostLimit).toBeNull(); // January has no plan
  });
});
