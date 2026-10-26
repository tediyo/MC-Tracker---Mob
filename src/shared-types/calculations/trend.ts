import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
  format,
} from "date-fns";
import type { TimeFrame } from "./period";
import { WEEK_STARTS_ON } from "./period";
import { parseISOCached } from "./aggregate";
import type { IncomeRow, CostRow, PlanRow } from "../db";
import {
  getEthiopianDate,
  getDaysInEthiopianMonth,
  toGregorianDate,
  ETHIOPIAN_MONTHS,
} from "../ethiopian-calendar";

export interface TrendPoint {
  bucketLabel: string;
  bucketStart: Date;
  bucketEnd: Date;
  income: number;
  cost: number;
  /** Running total of `cost` across the buckets returned in this call (not reset at month/year boundaries — see module doc). */
  cumulativeCost: number;
  /** The owning month's plan target_cost_limit, unprorated, or `null` if no plan covers that bucket's month. */
  targetCostLimit: number | null;
}

/** Matches the plan's documented defaults: daily→30d, weekly→8wk, monthly→12mo (of the selected year), yearly→5yr. */
export const DEFAULT_BUCKET_COUNT: Record<TimeFrame, number> = {
  daily: 30,
  weekly: 8,
  monthly: 12,
  yearly: 5,
};

function bucketBounds(timeframe: TimeFrame, date: Date): { start: Date; end: Date } {
  switch (timeframe) {
    case "daily":
      return { start: startOfDay(date), end: endOfDay(date) };
    case "weekly":
      return {
        start: startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
        end: endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
      };
    case "monthly":
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case "yearly":
      return { start: startOfYear(date), end: endOfYear(date) };
  }
}

function stepBack(timeframe: TimeFrame, date: Date, n: number): Date {
  switch (timeframe) {
    case "daily":
      return subDays(date, n);
    case "weekly":
      return subWeeks(date, n);
    case "monthly":
      return subMonths(date, n);
    case "yearly":
      return subYears(date, n);
  }
}

function labelFor(timeframe: TimeFrame, start: Date): string {
  switch (timeframe) {
    case "daily":
      return format(start, "MMM d");
    case "weekly":
      return `Wk of ${format(start, "MMM d")}`;
    case "monthly":
      return format(start, "MMM");
    case "yearly":
      return format(start, "yyyy");
  }
}

/**
 * Builds the bucketed series behind the income/expense trend chart.
 */
export function buildTrendSeries(
  incomes: readonly IncomeRow[],
  costs: readonly CostRow[],
  plans: readonly PlanRow[],
  timeframe: TimeFrame,
  referenceDate: Date,
  bucketCount: number = DEFAULT_BUCKET_COUNT[timeframe],
  calendarMode: "ethiopian" | "gregorian" = "gregorian",
): TrendPoint[] {
  interface BucketDef {
    start: Date;
    end: Date;
    label: string;
    targetPlan?: PlanRow;
  }

  let buckets: BucketDef[];

  if (calendarMode === "ethiopian") {
    if (timeframe === "monthly") {
      const eth = getEthiopianDate(referenceDate);
      const ethYear = eth.year;
      buckets = Array.from({ length: 13 }, (_, idx) => {
        const monthNum = idx + 1;
        const daysInMonth = getDaysInEthiopianMonth(ethYear, monthNum);
        const start = startOfDay(toGregorianDate(ethYear, monthNum, 1));
        const end = endOfDay(toGregorianDate(ethYear, monthNum, daysInMonth));
        const monthInfo = ETHIOPIAN_MONTHS[idx];
        const plan = plans.find((p) => p.year === ethYear && p.month === monthNum);
        return {
          start,
          end,
          label: monthInfo.nameEn,
          targetPlan: plan,
        };
      });
    } else if (timeframe === "yearly") {
      const eth = getEthiopianDate(referenceDate);
      buckets = Array.from({ length: bucketCount }, (_, idx) => {
        const yr = eth.year - (bucketCount - 1 - idx);
        const start = startOfDay(toGregorianDate(yr, 1, 1));
        const daysInPagume = getDaysInEthiopianMonth(yr, 13);
        const end = endOfDay(toGregorianDate(yr, 13, daysInPagume));
        const plansThisYr = plans.filter((p) => p.year === yr);
        const totalPlan =
          plansThisYr.length > 0
            ? plansThisYr.reduce((sum, p) => sum + Number(p.target_cost_limit), 0)
            : null;
        return {
          start,
          end,
          label: `${yr} E.C.`,
          targetPlan: totalPlan !== null ? ({ target_cost_limit: totalPlan } as PlanRow) : undefined,
        };
      });
    } else if (timeframe === "daily") {
      buckets = Array.from({ length: bucketCount }, (_, idx) => {
        const d = subDays(referenceDate, bucketCount - 1 - idx);
        const start = startOfDay(d);
        const end = endOfDay(d);
        const ethDate = getEthiopianDate(d);
        const mInfo = ETHIOPIAN_MONTHS.find((m) => m.number === ethDate.month);
        const plan = plans.find((p) => p.year === ethDate.year && p.month === ethDate.month);
        return {
          start,
          end,
          label: `${mInfo?.nameEn || ""} ${ethDate.day}`,
          targetPlan: plan,
        };
      });
    } else {
      // weekly
      buckets = Array.from({ length: bucketCount }, (_, idx) => {
        const anchor = subWeeks(referenceDate, bucketCount - 1 - idx);
        const start = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
        const end = endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
        const ethDate = getEthiopianDate(start);
        const mInfo = ETHIOPIAN_MONTHS.find((m) => m.number === ethDate.month);
        const plan = plans.find((p) => p.year === ethDate.year && p.month === ethDate.month);
        return {
          start,
          end,
          label: `Wk of ${mInfo?.nameEn || ""} ${ethDate.day}`,
          targetPlan: plan,
        };
      });
    }
  } else {
    // Gregorian calendar mode
    const anchors: Date[] =
      timeframe === "monthly"
        ? Array.from({ length: 12 }, (_, i) => new Date(referenceDate.getFullYear(), i, 1))
        : Array.from({ length: bucketCount }, (_, i) => stepBack(timeframe, referenceDate, bucketCount - 1 - i));

    buckets = anchors.map((anchorDate) => {
      const { start, end } = bucketBounds(timeframe, anchorDate);
      const planForMonth = (s: Date): PlanRow | undefined => {
        const pGreg = plans.find((p) => p.year === s.getFullYear() && p.month === s.getMonth() + 1);
        if (pGreg) return pGreg;
        const eth = getEthiopianDate(s);
        return plans.find((p) => p.year === eth.year && p.month === eth.month);
      };
      return {
        start,
        end,
        label: labelFor(timeframe, start),
        targetPlan: planForMonth(start),
      };
    });
  }

  // Pre-compute bucket boundaries once as epoch-ms integers so the hot
  // inner loop only does cheap numeric comparisons.
  const bucketSums = buckets.map((b) => ({
    start: b.start,
    end: b.end,
    startMs: b.start.getTime(),
    endMs: b.end.getTime(),
    label: b.label,
    targetPlan: b.targetPlan,
    income: 0,
    cost: 0,
  }));

  // Single forward pass over income rows.
  for (const row of incomes) {
    const t = parseISOCached(row.date).getTime();
    for (const bucket of bucketSums) {
      if (t >= bucket.startMs && t <= bucket.endMs) {
        bucket.income += Number(row.amount);
        break; // buckets are non-overlapping
      }
    }
  }

  // Single forward pass over cost rows.
  for (const row of costs) {
    const t = parseISOCached(row.date).getTime();
    for (const bucket of bucketSums) {
      if (t >= bucket.startMs && t <= bucket.endMs) {
        bucket.cost += Number(row.amount);
        break;
      }
    }
  }

  let cumulativeCost = 0;
  return bucketSums.map((bucket) => {
    cumulativeCost += bucket.cost;
    return {
      bucketLabel: bucket.label,
      bucketStart: bucket.start,
      bucketEnd: bucket.end,
      income: bucket.income,
      cost: bucket.cost,
      cumulativeCost,
      targetCostLimit: bucket.targetPlan ? Number(bucket.targetPlan.target_cost_limit) : null,
    };
  });
}
