import { formatCurrency } from "./utils";

export interface TrendIntervalItem {
  bucketLabel: string;
  income: number;
  cost: number;
}

export interface TransactionItem {
  date: string;
  ethDate?: string;
  type: "income" | "cost";
  category: string;
  description: string;
  amount: number;
}

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
  pieChartBase64: string;
  incomeCostPieBase64: string;
  trendIntervals?: TrendIntervalItem[];
  recentTransactions?: TransactionItem[];
}

/**
 * Builds an Executive PDF Report HTML layout matching the Web Version identically,
 * including Income & Expense Trend Intervals and Itemized Recent Transactions.
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
    incomeCostPieBase64,
    trendIntervals = [],
    recentTransactions = [],
  } = data;

  const totalCategoryCost = basicCost + fancyCost + extraCost;
  const pct = (value: number) =>
    totalCategoryCost > 0 ? ((value / totalCategoryCost) * 100).toFixed(1) : "0.0";

  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const isProfit = netProfitLoss >= 0;
  const netLabel = isProfit ? "Net Profit" : "Net Loss";
  const netColor = isProfit ? "#059669" : "#dc2626";

  const costVarianceStr =
    costLimit === null
      ? "no plan set"
      : costVariance !== null && costVariance >= 0
        ? `${formatCurrency(costVariance)} under budget`
        : `${formatCurrency(Math.abs(costVariance || 0))} over budget`;

  const savingsProgressStr =
    savingsGoal === null || savingsGoal === 0
      ? "no plan set"
      : `${formatCurrency(Math.max(netProfitLoss, 0))} of ${formatCurrency(savingsGoal)} (${Math.min(
          (Math.max(netProfitLoss, 0) / savingsGoal) * 100,
          999,
        ).toFixed(0)}%)`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>MC Tracker - Executive Financial Overview Report (${periodLabel})</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    padding: 16px;
    margin: 0;
  }
  
  /* Brand Header */
  .header-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #10b981;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .brand-title {
    font-size: 24px;
    font-weight: 800;
    color: #047857;
    margin: 0 0 4px 0;
    letter-spacing: -0.5px;
  }
  .brand-subtitle {
    font-size: 12px;
    color: #64748b;
    margin: 0;
  }
  .badge-group {
    text-align: right;
  }
  .timeframe-pill {
    background: #ecfdf5;
    color: #047857;
    border: 1px solid #a7f3d0;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    display: inline-block;
  }
  .date-stamp {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
  }

  /* Section Titles */
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    margin: 20px 0 10px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 4px;
  }

  /* Cards Grid */
  .cards-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
    border-spacing: 10px;
    margin: 0 -10px 10px -10px;
  }
  .metric-card {
    display: table-cell;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 14px;
    background: #f8fafc;
    vertical-align: top;
  }
  .card-label {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .card-value {
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  .card-subtext {
    font-size: 10px;
    color: #64748b;
  }

  /* Tables */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 12px;
  }
  .data-table th {
    background: #f1f5f9;
    color: #475569;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    padding: 8px 10px;
    text-align: left;
  }
  .data-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #f1f5f9;
  }
  .data-table tr:nth-child(even) {
    background: #fafafa;
  }

  /* Visual Progress Bar */
  .bar-container {
    background: #e2e8f0;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 3px;
  }
  .bar-fill {
    height: 100%;
    border-radius: 4px;
  }

  /* Charts Side by Side */
  .charts-flex {
    display: flex;
    gap: 16px;
    margin-top: 10px;
    margin-bottom: 16px;
  }
  .chart-card {
    flex: 1;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px;
    background: #ffffff;
    text-align: center;
  }
  .chart-card img {
    max-width: 100%;
    max-height: 180px;
    object-fit: contain;
  }
  .chart-title {
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    margin-top: 6px;
  }

  .income-val { color: #059669; }
  .cost-val { color: #dc2626; }

  .footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
    font-size: 10px;
    color: #94a3b8;
    text-align: center;
  }
</style>
</head>
<body>

  <!-- Executive Header Bar -->
  <div class="header-bar">
    <div>
      <h1 class="brand-title">MC TRACKER</h1>
      <p class="brand-subtitle">Executive Financial Overview Report</p>
    </div>
    <div class="badge-group">
      <div class="timeframe-pill">${periodLabel}</div>
      <div class="date-stamp">Generated: ${generatedAt}</div>
    </div>
  </div>

  <!-- Executive Summary Metric Cards -->
  <div class="section-title">Executive Summary</div>
  <div class="cards-grid">
    <div class="metric-card">
      <div class="card-label">Total Income</div>
      <div class="card-value" style="color: #059669;">${formatCurrency(totalIncome)}</div>
      <div class="card-subtext">Incoming funds</div>
    </div>

    <div class="metric-card">
      <div class="card-label">Total Costs</div>
      <div class="card-value" style="color: #0f172a;">${formatCurrency(totalCosts)}</div>
      <div class="card-subtext">Total expenses</div>
    </div>

    <div class="metric-card">
      <div class="card-label">${netLabel}</div>
      <div class="card-value" style="color: ${netColor};">${formatCurrency(Math.abs(netProfitLoss))}</div>
      <div class="card-subtext">Net balance</div>
    </div>

    <div class="metric-card">
      <div class="card-label">Budget & Savings</div>
      <div class="card-value" style="color: #334155; font-size: 14px;">${costVarianceStr}</div>
      <div class="card-subtext">Goal: ${savingsProgressStr}</div>
    </div>
  </div>

  <!-- Expense Category Breakdown Table -->
  <div class="section-title">Expense Category Breakdown</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="border-radius: 6px 0 0 6px;">Category</th>
        <th>Proportion Bar</th>
        <th style="text-align: right;">Share</th>
        <th style="text-align: right; border-radius: 0 6px 6px 0;">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight: 600;">Basic Expenses</td>
        <td style="width: 45%;">
          <div class="bar-container">
            <div class="bar-fill" style="background: #10b981; width: ${pct(basicCost)}%;"></div>
          </div>
        </td>
        <td style="text-align: right; font-weight: 600; color: #10b981;">${pct(basicCost)}%</td>
        <td style="text-align: right; font-weight: 700;">${formatCurrency(basicCost)}</td>
      </tr>
      <tr>
        <td style="font-weight: 600;">Fancy Expenses</td>
        <td style="width: 45%;">
          <div class="bar-container">
            <div class="bar-fill" style="background: #f59e0b; width: ${pct(fancyCost)}%;"></div>
          </div>
        </td>
        <td style="text-align: right; font-weight: 600; color: #f59e0b;">${pct(fancyCost)}%</td>
        <td style="text-align: right; font-weight: 700;">${formatCurrency(fancyCost)}</td>
      </tr>
      <tr>
        <td style="font-weight: 600;">Extra Expenses</td>
        <td style="width: 45%;">
          <div class="bar-container">
            <div class="bar-fill" style="background: #3b82f6; width: ${pct(extraCost)}%;"></div>
          </div>
        </td>
        <td style="text-align: right; font-weight: 600; color: #3b82f6;">${pct(extraCost)}%</td>
        <td style="text-align: right; font-weight: 700;">${formatCurrency(extraCost)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Income & Expense Trend Intervals Table -->
  ${
    trendIntervals.length > 0
      ? `
    <div class="section-title">Income & Expense Trend Intervals</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="border-radius: 6px 0 0 6px;">Period Interval</th>
          <th style="text-align: right;">Income</th>
          <th style="text-align: right;">Expenses</th>
          <th style="text-align: right; border-radius: 0 6px 6px 0;">Net Profit / Loss</th>
        </tr>
      </thead>
      <tbody>
        ${trendIntervals
          .map((pt) => {
            const net = pt.income - pt.cost;
            return `
          <tr>
            <td style="font-weight: 700; color: #1e293b;">${pt.bucketLabel}</td>
            <td style="text-align: right; font-weight: 700;" class="income-val">${formatCurrency(pt.income)}</td>
            <td style="text-align: right; font-weight: 700;" class="cost-val">${formatCurrency(pt.cost)}</td>
            <td style="text-align: right; font-weight: 800;" class="${net >= 0 ? "income-val" : "cost-val"}">
              ${net >= 0 ? "+" : ""}${formatCurrency(net)}
            </td>
          </tr>
        `;
          })
          .join("")}
      </tbody>
    </table>
  `
      : ""
  }

  <!-- Recent Transactions Feed Table -->
  ${
    recentTransactions.length > 0
      ? `
    <div class="section-title">Recent Transactions</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="border-radius: 6px 0 0 6px;">Date</th>
          <th>Type / Category</th>
          <th>Description</th>
          <th style="text-align: right; border-radius: 0 6px 6px 0;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${recentTransactions
          .slice(0, 10)
          .map((tx) => {
            const isInc = tx.type === "income";
            return `
          <tr>
            <td style="color: #475569;">${tx.date}${tx.ethDate ? ` (${tx.ethDate})` : ""}</td>
            <td><span style="font-weight: 700; color: #1e293b;">${tx.category}</span> <span style="font-size: 10px; color: #64748b;">(${tx.type.toUpperCase()})</span></td>
            <td style="color: #64748b;">${tx.description || "-"}</td>
            <td style="text-align: right; font-weight: 800;" class="${isInc ? "income-val" : "cost-val"}">
              ${isInc ? "+" : "-"}${formatCurrency(tx.amount)}
            </td>
          </tr>
        `;
          })
          .join("")}
      </tbody>
    </table>
  `
      : ""
  }

  <!-- Visual Charts Section -->
  <div class="section-title">Visual Analytics</div>
  <div class="charts-flex">
    <div class="chart-card">
      <img src="data:image/png;base64,${pieChartBase64}" />
      <div class="chart-caption">Category Expense Proportions</div>
    </div>
    <div class="chart-card">
      <img src="data:image/png;base64,${incomeCostPieBase64}" />
      <div class="chart-caption">Income vs Expense Ratio</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    Generated automatically by MC Tracker Mobile Application &bull; All rights reserved &copy; 2026
  </div>

</body>
</html>
`;
}
