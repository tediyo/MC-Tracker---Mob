import { describe, expect, it } from "vitest";
import { sumIncome, sumCosts, groupCostsByCategory, groupCostsBySubcategory } from "./aggregate";
import type { IncomeRow, CostRow } from "../db";

function income(date: string, amount: number): IncomeRow {
  return {
    id: `inc-${date}-${amount}`,
    user_id: "user-1",
    amount,
    source_type: "monthly",
    description: null,
    date,
    created_at: `${date}T00:00:00Z`,
  };
}

function cost(
  date: string,
  amount: number,
  category: CostRow["category"],
  subcategory: CostRow["subcategory"],
): CostRow {
  return {
    id: `cost-${date}-${amount}-${subcategory}`,
    user_id: "user-1",
    amount,
    category,
    subcategory,
    date,
    description: null,
    created_at: `${date}T00:00:00Z`,
  };
}

const RANGE = { start: new Date(2026, 7, 1), end: new Date(2026, 7, 31) };

describe("sumIncome / sumCosts", () => {
  it("only sums rows whose date falls within the range", () => {
    const incomes = [income("2026-08-05", 100), income("2026-07-31", 50), income("2026-08-31", 25)];
    expect(sumIncome(incomes, RANGE)).toBe(125);
  });

  it("returns 0 for an empty row set", () => {
    expect(sumCosts([], RANGE)).toBe(0);
  });
});

describe("groupCostsByCategory", () => {
  it("zero-fills every category and sums matching rows", () => {
    const costs = [
      cost("2026-08-02", 20, "basic", "food"),
      cost("2026-08-03", 15, "basic", "taxi"),
      cost("2026-08-04", 30, "fancy", "coffee"),
    ];
    expect(groupCostsByCategory(costs, RANGE)).toEqual({ basic: 35, fancy: 30, extra: 0 });
  });
});

describe("groupCostsBySubcategory", () => {
  it("zero-fills every subcategory valid for the category and ignores other categories", () => {
    const costs = [
      cost("2026-08-02", 20, "basic", "food"),
      cost("2026-08-03", 15, "basic", "taxi"),
      cost("2026-08-04", 999, "fancy", "coffee"),
    ];
    expect(groupCostsBySubcategory(costs, RANGE, "basic")).toEqual({
      food: 20,
      house_hold: 0,
      taxi: 15,
      rent: 0,
      wifi: 0,
      other: 0,
    });
  });
});
