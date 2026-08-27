import {
  toGregorianDate,
  getDaysInEthiopianMonth,
  ETHIOPIAN_MONTHS,
  type CostCategory,
} from "@mc-tracker/shared-types";

export type ComparisonMode = "monthly" | "weekly" | "yearly";

export interface ComparisonParams {
  mode: ComparisonMode;
  yearA?: number;
  monthA?: number;
  yearB?: number;
  monthB?: number;
  weekYear?: number;
  weekMonth?: number;
  weekA?: number;
  weekB?: number;
  yearOnlyA?: number;
  yearOnlyB?: number;
}

export async function getComparisonData(supabase: any, userId: string, params: ComparisonParams) {
  const { mode } = params;

  let startA: Date;
  let endA: Date;
  let startB: Date;
  let endB: Date;
  let labelA: string;
  let labelB: string;

  if (mode === "yearly") {
    const yA = params.yearOnlyA || 2017;
    const yB = params.yearOnlyB || 2018;
    startA = toGregorianDate(yA, 1, 1);
    endA = toGregorianDate(yA, 13, getDaysInEthiopianMonth(yA, 13));
    startB = toGregorianDate(yB, 1, 1);
    endB = toGregorianDate(yB, 13, getDaysInEthiopianMonth(yB, 13));
    labelA = `${yA} E.C.`;
    labelB = `${yB} E.C.`;
  } else if (mode === "weekly") {
    const wYear = params.weekYear || 2018;
    const wMonth = params.weekMonth || 12;
    const wA = params.weekA || 1;
    const wB = params.weekB || 2;

    const daysInMonth = getDaysInEthiopianMonth(wYear, wMonth);
    const getBounds = (wk: number) => {
      if (wk === 1) return { start: 1, end: 7 };
      if (wk === 2) return { start: 8, end: 14 };
      if (wk === 3) return { start: 15, end: 21 };
      return { start: 22, end: daysInMonth };
    };

    const bA = getBounds(wA);
    const bB = getBounds(wB);

    startA = toGregorianDate(wYear, wMonth, bA.start);
    endA = toGregorianDate(wYear, wMonth, bA.end);
    startB = toGregorianDate(wYear, wMonth, bB.start);
    endB = toGregorianDate(wYear, wMonth, bB.end);

    const mName = ETHIOPIAN_MONTHS[wMonth - 1]?.nameEn || `Month ${wMonth}`;
    labelA = `Wk ${wA} (${mName})`;
    labelB = `Wk ${wB} (${mName})`;
  } else {
    // Monthly
    const yA = params.yearA || 2018;
    const mA = params.monthA || 11;
    const yB = params.yearB || 2018;
    const mB = params.monthB || 12;

    startA = toGregorianDate(yA, mA, 1);
    endA = toGregorianDate(yA, mA, getDaysInEthiopianMonth(yA, mA));
    startB = toGregorianDate(yB, mB, 1);
    endB = toGregorianDate(yB, mB, getDaysInEthiopianMonth(yB, mB));

    labelA = `${ETHIOPIAN_MONTHS[mA - 1]?.nameEn || mA} ${yA}`;
    labelB = `${ETHIOPIAN_MONTHS[mB - 1]?.nameEn || mB} ${yB}`;
  }

  const formatIso = (d: Date) => d.toISOString().slice(0, 10);

  const { data: incA } = await supabase
    .from("incomes")
    .select("amount")
    .eq("user_id", userId)
    .gte("date", formatIso(startA))
    .lte("date", formatIso(endA));

  const { data: costA } = await supabase
    .from("costs")
    .select("amount")
    .eq("user_id", userId)
    .gte("date", formatIso(startA))
    .lte("date", formatIso(endA));

  const { data: incB } = await supabase
    .from("incomes")
    .select("amount")
    .eq("user_id", userId)
    .gte("date", formatIso(startB))
    .lte("date", formatIso(endB));

  const { data: costB } = await supabase
    .from("costs")
    .select("amount")
    .eq("user_id", userId)
    .gte("date", formatIso(startB))
    .lte("date", formatIso(endB));

  const totalIncA = (incA || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const totalCostA = (costA || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

  const totalIncB = (incB || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const totalCostB = (costB || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

  return {
    summaryA: {
      label: labelA,
      totalIncome: totalIncA,
      totalCosts: totalCostA,
      netProfitLoss: totalIncA - totalCostA,
    },
    summaryB: {
      label: labelB,
      totalIncome: totalIncB,
      totalCosts: totalCostB,
      netProfitLoss: totalIncB - totalCostB,
    },
    delta: {
      income: totalIncB - totalIncA,
      costs: totalCostB - totalCostA,
      net: totalIncB - totalCostB - (totalIncA - totalCostA),
    },
  };
}
