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

export const TIME_FRAMES = ["daily", "weekly", "monthly", "yearly"] as const;
export type TimeFrame = (typeof TIME_FRAMES)[number];

/**
 * ISO week: Monday is day 1. This is a documented default (see plan) —
 * revisit if Sun-Sat weeks are wanted instead.
 */
export const WEEK_STARTS_ON = 1 as const;

export interface PeriodRange {
  timeframe: TimeFrame;
  /** Start of the full period containing `referenceDate`. */
  start: Date;
  /** End of the full period containing `referenceDate`. */
  end: Date;
  /** Start of the immediately preceding period of the same length. */
  previousStart: Date;
  /** End of the immediately preceding period of the same length. */
  previousEnd: Date;
  /** Human-readable label for the current period, e.g. "August 2026". */
  label: string;
}

/**
 * Pure function: given a timeframe and an explicit reference date (never
 * `new Date()` internally — the caller always supplies "now"), returns the
 * full period containing that date plus the equivalent previous period.
 * Used as the basis for both period-metric calculations and trend bucketing.
 */
export function getPeriodRange(timeframe: TimeFrame, referenceDate: Date): PeriodRange {
  switch (timeframe) {
    case "daily": {
      const previousRef = subDays(referenceDate, 1);
      return {
        timeframe,
        start: startOfDay(referenceDate),
        end: endOfDay(referenceDate),
        previousStart: startOfDay(previousRef),
        previousEnd: endOfDay(previousRef),
        label: format(referenceDate, "MMM d, yyyy"),
      };
    }
    case "weekly": {
      const start = startOfWeek(referenceDate, { weekStartsOn: WEEK_STARTS_ON });
      const end = endOfWeek(referenceDate, { weekStartsOn: WEEK_STARTS_ON });
      const previousRef = subWeeks(referenceDate, 1);
      return {
        timeframe,
        start,
        end,
        previousStart: startOfWeek(previousRef, { weekStartsOn: WEEK_STARTS_ON }),
        previousEnd: endOfWeek(previousRef, { weekStartsOn: WEEK_STARTS_ON }),
        label: `Week of ${format(start, "MMM d, yyyy")}`,
      };
    }
    case "monthly": {
      const previousRef = subMonths(referenceDate, 1);
      return {
        timeframe,
        start: startOfMonth(referenceDate),
        end: endOfMonth(referenceDate),
        previousStart: startOfMonth(previousRef),
        previousEnd: endOfMonth(previousRef),
        label: format(referenceDate, "MMMM yyyy"),
      };
    }
    case "yearly": {
      const previousRef = subYears(referenceDate, 1);
      return {
        timeframe,
        start: startOfYear(referenceDate),
        end: endOfYear(referenceDate),
        previousStart: startOfYear(previousRef),
        previousEnd: endOfYear(previousRef),
        label: format(referenceDate, "yyyy"),
      };
    }
  }
}
