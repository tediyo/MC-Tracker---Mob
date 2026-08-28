import { ETHIOPIAN_MONTHS, getEthiopianDate } from "../shared-types";

/** A Gregorian ISO date ("YYYY-MM-DD"), formatted as the Ethiopian calendar date it
 * represents - e.g. for display in history lists, next to the Ethiopian date picker. */
export function formatEthiopianDate(isoDate: string): string {
  const eth = getEthiopianDate(isoDate);
  const monthName = ETHIOPIAN_MONTHS[eth.month - 1]?.nameEn || eth.month;
  return `${monthName} ${eth.day}, ${eth.year} E.C.`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number | null): string {
  if (value === null) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
