import { describe, expect, it } from "vitest";
import { calculatePercentChange, calculatePeriodMetrics } from "./metrics";
import type { IncomeRow, CostRow, PlanRow } from "../db";

function income(date: string, amount: number): IncomeRow {
  return { id: `inc-${date}-${amount}`, user_id: "u1", amount, source_type: "monthly", description: null, date, created_at: date };
}
function cost(date: string, amount: number, category: CostRow["category"] = "basic", subcategory: CostRow["subcategory"] = "food"): CostRow {
  return { id: `c-${date}-${amount}`, user_id: "u1", amount, category, subcategory, date, description: null, created_at: date };
}
function plan(year: number, month: number, targetCostLimit: number, targetSavingsGoal: number): PlanRow {
  return {
    id: `plan-${year}-${month}`,
    user_id: "u1",
    year,
    month,
    target_cost_limit: targetCostLimit,
    target_savings_goal: targetSavingsGoal,
    over_budget_alert_sent_at: null,
    created_at: `${year}-${String(month).padStart(2, "0")}-01`,
  };
}

describe("calculatePercentChange", () => {
  it("computes a positive percent increase", () => {
    expect(calculatePercentChange(150, 100)).toBe(50);
  });

  it("computes a negative percent decrease", () => {
    expect(calculatePercentChange(50, 100)).toBe(-50);
  });

  it("returns null instead of Infinity/NaN when the previous value is 0", () => {
    expect(calculatePercentChange(100, 0)).toBeNull();
    expect(calculatePercentChange(0, 0)).toBeNull();
  });
});

describe("calculatePeriodMetrics", () => {
  const referenceDate = new Date(2026, 7, 9); // Aug 9, 2026 — partial month "to date"

  it("caps the current period at referenceDate but uses the FULL previous period", () => {
    const incomes = [income("2026-08-05", 1000), income("2026-08-20", 500) /* after referenceDate: excluded */];
    const costs = [cost("2026-08-02", 100), cost("2026-08-25", 200) /* after referenceDate: excluded */];
    const metrics = calculatePeriodMetrics(incomes, costs, [], "monthly", referenceDate);

    expect(metrics.totalIncome).toBe(1000);
    expect(metrics.totalCosts).toBe(100);
    expect(metrics.netProfitLoss).toBe(900);
  });

  it("resolves the monthly target directly from the Ethiopian plan for that (year, month)", () => {
    // 2026-08-09 Gregorian is Ethiopian Year 2018, Month 12 (Nehase)
    const plans = [plan(2018, 12, 2000, 500)];
    const metrics = calculatePeriodMetrics([], [cost("2026-08-02", 2500)], plans, "monthly", referenceDate);

    expect(metrics.targetCostLimit).toBe(2000);
    expect(metrics.targetSavingsGoal).toBe(500);
    expect(metrics.costVariance).toBe(2000 - 2500); // over budget -> negative
  });

  it("returns null targets when no plan covers the period", () => {
    const metrics = calculatePeriodMetrics([], [], [], "monthly", referenceDate);
    expect(metrics.targetCostLimit).toBeNull();
    expect(metrics.costVariance).toBeNull();
  });

  it("pro-rates the monthly plan for a daily view", () => {
    // 2026-08-09 Gregorian -> Ethiopian Year 2018, Month 12 (Nehase: 30 days)
    const plans = [plan(2018, 12, 3000, 300)]; // 3000/30 = 100/day, 300/30 = 10/day
    const metrics = calculatePeriodMetrics([], [], plans, "daily", referenceDate);
    expect(metrics.targetCostLimit).toBeCloseTo(100);
    expect(metrics.targetSavingsGoal).toBeCloseTo(10);
  });

  it("pro-rates the monthly plan for a weekly view (daily rate * 7)", () => {
    // Week start for 2026-08-09 is 2026-08-03 (Monday), which falls in Ethiopian Month 11 (Hamle)
    const plans = [plan(2018, 11, 3000, 300)];
    const metrics = calculatePeriodMetrics([], [], plans, "weekly", referenceDate);
    expect(metrics.targetCostLimit).toBeCloseTo(100 * 7);
  });

  it("sums every plan in the Ethiopian year for a yearly view", () => {
    const plans = [plan(2018, 1, 1000, 100), plan(2018, 2, 2000, 200), plan(2017, 12, 999, 99)];
    const metrics = calculatePeriodMetrics([], [], plans, "yearly", referenceDate);
    expect(metrics.targetCostLimit).toBe(3000);
    expect(metrics.targetSavingsGoal).toBe(300);
  });
});
