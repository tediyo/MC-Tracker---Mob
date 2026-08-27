import { describe, it, expect } from "vitest";
import {
  getEthiopianDate,
  toGregorianDate,
  getDaysInEthiopianMonth,
  isEthiopianLeapYear,
  ETHIOPIAN_MONTHS,
} from "./ethiopian-calendar";

describe("ethiopian-calendar", () => {
  it("defines 13 Ethiopian months", () => {
    expect(ETHIOPIAN_MONTHS).toHaveLength(13);
    expect(ETHIOPIAN_MONTHS[0].nameEn).toBe("Meskerem");
    expect(ETHIOPIAN_MONTHS[12].nameEn).toBe("Pagume");
  });

  it("calculates leap years correctly", () => {
    expect(isEthiopianLeapYear(2015)).toBe(true);
    expect(isEthiopianLeapYear(2016)).toBe(false);
    expect(isEthiopianLeapYear(2017)).toBe(false);
    expect(isEthiopianLeapYear(2018)).toBe(false);
    expect(isEthiopianLeapYear(2019)).toBe(true);
  });

  it("calculates days in Ethiopian month", () => {
    expect(getDaysInEthiopianMonth(2018, 1)).toBe(30);
    expect(getDaysInEthiopianMonth(2018, 13)).toBe(5);
    expect(getDaysInEthiopianMonth(2015, 13)).toBe(6);
  });

  it("converts Gregorian to Ethiopian date correctly", () => {
    // 2024-09-11 Gregorian -> 2017 Meskerem 1 Ethiopian
    const ed1 = getEthiopianDate("2024-09-11");
    expect(ed1).toEqual({ year: 2017, month: 1, day: 1 });

    // 2026-08-27 Gregorian -> 2018 Nehase 21 Ethiopian
    const ed2 = getEthiopianDate("2026-08-27");
    expect(ed2).toEqual({ year: 2018, month: 12, day: 21 });
  });

  it("converts Ethiopian to Gregorian date correctly", () => {
    const gd1 = toGregorianDate(2017, 1, 1);
    expect(gd1.getFullYear()).toBe(2024);
    expect(gd1.getMonth() + 1).toBe(9);
    expect(gd1.getDate()).toBe(11);
  });
});
