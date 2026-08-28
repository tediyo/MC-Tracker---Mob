import { formatCurrency } from "./utils";
import { BRAND_COLOR } from "../theme/colors";

export interface OverviewReportData {
  periodLabel: string;
  totalIncome: number;
  totalCosts: number;
  netProfitLoss: number;
  costLimit: number | null;
  costVariance: number | null;
  savingsGoal: number | null;
  basicCost: number;
  fancyCost: number;
  extraCost: number;
  /** base64 PNG (no data: prefix) captured from the on-screen category donut chart. */
  pieChartBase64: string;
  /** base64 PNG (no data: prefix) captured from the on-screen income/expense bar chart. */
  barChartBase64: string;
}

/**
 * The report always shows real numbers regardless of the on-screen "hide balances"
 * privacy toggle - generating/sharing a PDF is a deliberate export action, not a glance
 * at the screen in public, so masking here would defeat the point of the report.
 */
export function buildOverviewReportHtml(data: OverviewReportData): string {
  const {
    periodLabel,
    totalIncome,
    totalCosts,
    netProfitLoss,
    costLimit,
    costVariance,
    savingsGoal,
    basicCost,
    fancyCost,
    extraCost,
    pieChartBase64,
    barChartBase64,
  } = data;

  const totalCategoryCost = basicCost + fancyCost + extraCost;
  const pct = (value: number) => (totalCategoryCost > 0 ? ((value / totalCategoryCost) * 100).toFixed(1) : "0.0");

  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const isProfit = netProfitLoss >= 0;
  const netLabel = isProfit ? "Net Profit" : "Net Loss";
  const netColor = isProfit ? BRAND_COLOR : "#d03b3b";

  const costVarianceLine =
    costLimit === null
      ? "No cost budget set for this period"
      : costVariance !== null && costVariance >= 0
        ? `${formatCurrency(costVariance)} remaining of ${formatCurrency(costLimit)} cost budget`
        : `${formatCurrency(Math.abs(costVariance || 0))} over the ${formatCurrency(costLimit)} cost budget`;

  const savingsProgressLine =
    savingsGoal === null || savingsGoal === 0
      ? "No savings goal set for this period"
      : `${formatCurrency(Math.max(netProfitLoss, 0))} of ${formatCurrency(savingsGoal)} savings goal (${Math.min(
          (Math.max(netProfitLoss, 0) / savingsGoal) * 100,
          999,
        ).toFixed(1)}%)`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #09090b; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 2px; }
  .subtitle { font-size: 12px; color: #71717a; margin-bottom: 24px; }
  h2 { font-size: 14px; margin: 24px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
  td.label { color: #475569; }
  td.value { text-align: right; font-weight: 700; }
  .net { color: ${netColor}; }
  .note { font-size: 11px; color: #475569; margin-top: 4px; }
  .charts { margin-top: 12px; }
  .chart-box { text-align: center; margin-bottom: 20px; }
  .chart-box img { max-width: 100%; }
  .chart-caption { font-size: 11px; font-weight: 700; color: #475569; margin-top: 6px; }
  .app-details td { font-size: 11px; color: #71717a; border-bottom: none; padding: 3px 0; }
  .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <h1>MC Tracker &mdash; Financial Overview Report</h1>
  <div class="subtitle">${periodLabel} &middot; Generated ${generatedAt}</div>

  <h2>Summary</h2>
  <table>
    <tr><td class="label">Total Income</td><td class="value">${formatCurrency(totalIncome)}</td></tr>
    <tr><td class="label">Total Costs</td><td class="value">${formatCurrency(totalCosts)}</td></tr>
    <tr><td class="label">${netLabel}</td><td class="value net">${formatCurrency(Math.abs(netProfitLoss))}</td></tr>
  </table>
  <div class="note">${costVarianceLine}</div>
  <div class="note">${savingsProgressLine}</div>

  <h2>Category Breakdown</h2>
  <table>
    <tr><td class="label">Basic</td><td class="value">${formatCurrency(basicCost)} (${pct(basicCost)}%)</td></tr>
    <tr><td class="label">Fancy</td><td class="value">${formatCurrency(fancyCost)} (${pct(fancyCost)}%)</td></tr>
    <tr><td class="label">Extra</td><td class="value">${formatCurrency(extraCost)} (${pct(extraCost)}%)</td></tr>
  </table>

  <h2>Charts</h2>
  <div class="charts">
    <div class="chart-box">
      <img src="data:image/png;base64,${pieChartBase64}" />
      <div class="chart-caption">Category Expense Proportions</div>
    </div>
    <div class="chart-box">
      <img src="data:image/png;base64,${barChartBase64}" />
      <div class="chart-caption">Income vs Expense Overview</div>
    </div>
  </div>

  <h2>Report Details</h2>
  <table class="app-details">
    <tr><td>Platform</td><td class="value">React Native Mobile</td></tr>
    <tr><td>Calendar Engine</td><td class="value">13-Month Ethiopian E.C.</td></tr>
    <tr><td>Currency</td><td class="value">USD</td></tr>
  </table>

  <div class="footer">Generated by MC Tracker Mobile</div>
</body>
</html>
`;
}
