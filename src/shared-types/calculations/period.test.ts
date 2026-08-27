import { describe, expect, it } from "vitest";
import { getPeriodRange } from "./period";

// Sunday, August 9, 2026 — a fixed reference date so every assertion below is deterministic.
const REFERENCE = new Date(2026, 7, 9);

describe("getPeriodRange", () => {
  it("daily: returns the single day and the day before", () => {
    const range = getPeriodRange("daily", REFERENCE);
    expect(range.start.toDateString()).toBe(new Date(2026, 7, 9).toDateString());
    expect(range.end.toDateString()).toBe(new Date(2026, 7, 9).toDateString());
    expect(range.previousStart.toDateString()).toBe(new Date(2026, 7, 8).toDateString());
  });

  it("weekly: uses an ISO (Monday-start) week", () => {
    const range = getPeriodRange("weekly", REFERENCE);
    // Aug 9, 2026 is a Sunday -> the ISO week containing it starts Mon Aug 3.
    expect(range.start.getDay()).toBe(1); // Monday
    expect(range.start.toDateString()).toBe(new Date(2026, 7, 3).toDateString());
    expect(range.end.toDateString()).toBe(new Date(2026, 7, 9).toDateString());
    expect(range.previousStart.toDateString()).toBe(new Date(2026, 6, 27).toDateString());
  });

  it("monthly: spans the full calendar month", () => {
    const range = getPeriodRange("monthly", REFERENCE);
    expect(range.start.toDateString()).toBe(new Date(2026, 7, 1).toDateString());
    expect(range.end.toDateString()).toBe(new Date(2026, 7, 31).toDateString());
    expect(range.previousStart.toDateString()).toBe(new Date(2026, 6, 1).toDateString());
    expect(range.previousEnd.toDateString()).toBe(new Date(2026, 6, 31).toDateString());
  });

  it("yearly: spans the full calendar year", () => {
    const range = getPeriodRange("yearly", REFERENCE);
    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getMonth()).toBe(0);
    expect(range.previousStart.getFullYear()).toBe(2025);
  });

  it("monthly: correctly rolls Jan back to the previous December", () => {
    const jan = new Date(2026, 0, 15);
    const range = getPeriodRange("monthly", jan);
    expect(range.previousStart.getFullYear()).toBe(2025);
    expect(range.previousStart.getMonth()).toBe(11); // December
  });
});
