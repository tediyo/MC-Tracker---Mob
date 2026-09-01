import { getDaysInMonth, endOfDay } from "date-fns";
import { getPeriodRange, type TimeFrame, type PeriodRange } from "./period";
import { sumIncome, sumCosts, type DateRange } from "./aggregate";
import type { IncomeRow, CostRow, PlanRow } from "../db";
import { getEthiopianDate, getDaysInEthiopianMonth } from "../ethiopian-calendar";

export interface PeriodMetrics {
  timeframe: TimeFrame;
  range: PeriodRange;
  /** Income for the period so far (capped at `referenceDate` — see module doc). */
  totalIncome: number;
  /** Costs for the period so far (capped at `referenceDate`). */
  totalCosts: number;
  netProfitLoss: number;
  /** `null` when no plan covers this period. */
  targetCostLimit: number | null;
  targetSavingsGoal: number | null;
  /** `targetCostLimit - totalCosts`; positive = under budget, negative = over. `null` if no plan. */
  costVariance: number | null;
  /** `netProfitLoss - targetSavingsGoal`; positive = ahead of savings goal. `null` if no plan. */
  savingsVariance: number | null;
  /** vs. the full previous period; `null` when the previous period's value was 0 (avoids Infinity/NaN). */
  percentChangeIncome: number | null;
  percentChangeCosts: number | null;
  percentChangeNet: number | null;
}

/**
 * `null` (rather than `Infinity`/`NaN`) when there is nothing to compare
 * against — the UI is expected to render that as "—" / "n/a", not "0%".
 */
export function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function capEnd(range: DateRange, _referenceDate?: Date): DateRange {
  const now = new Date();
  // If the period has already ended in the past, return the full period range
  if (range.end.getTime() <= now.getTime()) {
    return range;
  }
  // If we are currently inside this period, cap at endOfDay(now) or range.end
  const cappedEnd = endOfDay(now).getTime() < range.end.getTime() ? endOfDay(now) : range.end;
  return { start: range.start, end: cappedEnd };
}

function findPlanForMonth(plans: readonly PlanRow[], year: number, month: number): PlanRow | undefined {
  return plans.find((p) => p.year === year && p.month === month);
}

interface ResolvedTarget {
  targetCostLimit: number | null;
  targetSavingsGoal: number | null;
}

/**
 * Plans are monthly-only based on the Ethiopian calendar (13 months).
 *  - monthly: the Ethiopian plan for that exact (ethYear, ethMonth), if one exists.
 *  - daily/weekly: the Ethiopian monthly plan covering period's start date,
 *    pro-rated by (limit / daysInEthiopianMonth) * (1 for daily, 7 for weekly).
 *  - yearly: the sum of every Ethiopian monthly plan that falls within that Ethiopian year.
 */
function resolveTarget(
  plans: readonly PlanRow[],
  timeframe: TimeFrame,
  range: PeriodRange,
  referenceDate: Date,
): ResolvedTarget {
  if (timeframe === "monthly") {
    const eth = getEthiopianDate(referenceDate);
    const plan = findPlanForMonth(plans, eth.year, eth.month);
    return plan
      ? { targetCostLimit: Number(plan.target_cost_limit), targetSavingsGoal: Number(plan.target_savings_goal) }
      : { targetCostLimit: null, targetSavingsGoal: null };
  }

  if (timeframe === "daily" || timeframe === "weekly") {
    const anchor = range.start;
    const eth = getEthiopianDate(anchor);
    const plan = findPlanForMonth(plans, eth.year, eth.month);
    if (!plan) return { targetCostLimit: null, targetSavingsGoal: null };
    const daysInMonth = getDaysInEthiopianMonth(eth.year, eth.month);
    const multiplier = timeframe === "daily" ? 1 : 7;
    return {
      targetCostLimit: (Number(plan.target_cost_limit) / daysInMonth) * multiplier,
      targetSavingsGoal: (Number(plan.target_savings_goal) / daysInMonth) * multiplier,
    };
  }

  // yearly
  const ethRef = getEthiopianDate(referenceDate);
  const plansThisYear = plans.filter((p) => p.year === ethRef.year);
  if (plansThisYear.length === 0) return { targetCostLimit: null, targetSavingsGoal: null };
  return {
    targetCostLimit: plansThisYear.reduce((sum, p) => sum + Number(p.target_cost_limit), 0),
    targetSavingsGoal: plansThisYear.reduce((sum, p) => sum + Number(p.target_savings_goal), 0),
  };
}

/**
 * Pure function combining raw rows + the active plan(s) into every derived
 * dashboard metric for one timeframe/reference-date pair. Called identically
 * from the Next.js dashboard (client-side charts) and the NestJS weekly/
 * monthly summary emails (server-side), so this is the ONE place "net
 * profit", "variance vs plan", and "% change" are computed.
 */
export function calculatePeriodMetrics(
  incomes: readonly IncomeRow[],
  costs: readonly CostRow[],
  plans: readonly PlanRow[],
  timeframe: TimeFrame,
  referenceDate: Date,
): PeriodMetrics {
  const range = getPeriodRange(timeframe, referenceDate);
  const currentRange = capEnd(range, referenceDate);
  const previousRange: DateRange = { start: range.previousStart, end: range.previousEnd };

  const totalIncome = sumIncome(incomes, currentRange);
  const totalCosts = sumCosts(costs, currentRange);
  const netProfitLoss = totalIncome - totalCosts;

  const previousIncome = sumIncome(incomes, previousRange);
  const previousCosts = sumCosts(costs, previousRange);
  const previousNet = previousIncome - previousCosts;

  const { targetCostLimit, targetSavingsGoal } = resolveTarget(plans, timeframe, range, referenceDate);

  return {
    timeframe,
    range,
    totalIncome,
    totalCosts,
    netProfitLoss,
    targetCostLimit,
    targetSavingsGoal,
    costVariance: targetCostLimit === null ? null : targetCostLimit - totalCosts,
    savingsVariance: targetSavingsGoal === null ? null : netProfitLoss - targetSavingsGoal,
    percentChangeIncome: calculatePercentChange(totalIncome, previousIncome),
    percentChangeCosts: calculatePercentChange(totalCosts, previousCosts),
    percentChangeNet: calculatePercentChange(netProfitLoss, previousNet),
  };
}
