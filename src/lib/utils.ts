import { getEthiopianDate } from "../shared-types";

/** A Gregorian ISO date ("YYYY-MM-DD"), formatted as the Ethiopian calendar date it
 * represents - e.g. for display in history lists, next to the Ethiopian date picker.
 * Compact numeric MM/DD/YYYY rather than a spelled-out month name. */
export function formatEthiopianDate(isoDate: string): string {
  const eth = getEthiopianDate(isoDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(eth.month)}/${pad(eth.day)}/${eth.year}`;
}

export function formatDateByMode(isoDate: string, calendarMode: "ethiopian" | "gregorian" = "ethiopian"): string {
  if (calendarMode === "gregorian") {
    try {
      const d = new Date(isoDate);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
    } catch {
      return isoDate;
    }
  }
  return formatEthiopianDate(isoDate);
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
