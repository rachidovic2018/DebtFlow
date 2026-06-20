import { TODAY } from "./random";
import {
  agents,
  cases,
  clients,
  contracts,
  debtAccounts,
  payments,
  type Agent,
  type CaseStage,
  type Client,
} from "./data";

// ── Lookups ──────────────────────────────────────────────────────
const clientById = new Map(clients.map((c) => [c.id, c]));
const agentById = new Map(agents.map((a) => [a.id, a]));

export const getClient = (id: string) => clientById.get(id);
export const getAgent = (id: string | null) => (id ? agentById.get(id) : undefined);
export const getClientDebts = (id: string) => debtAccounts.filter((d) => d.clientId === id);
export const getClientPayments = (id: string) =>
  payments
    .filter((p) => p.clientId === id)
    .sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1));
export const getClientContracts = (id: string) => contracts.filter((c) => c.clientId === id);
export const getClientCase = (id: string) => cases.find((c) => c.clientId === id);

const ACTIVE_STAGES: CaseStage[] = ["Contract Signed", "Active Program", "Settlement"];
export const isActiveStage = (s: CaseStage) => ACTIVE_STAGES.includes(s);

// ── Date helpers ─────────────────────────────────────────────────
function monthKey(iso: string) {
  return iso.slice(0, 7);
}
const THIS_MONTH = monthKey(TODAY);
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Last N month buckets ending at TODAY, oldest first. */
export function lastMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const base = new Date(TODAY);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: MONTH_LABELS[d.getMonth()] });
  }
  return out;
}

// ── Revenue model ────────────────────────────────────────────────
export const COMPANY_FEE_RATE = 0.22; // company revenue share of each draft
export const BANK_FEE_RATE = 0.03;

const succeeded = payments.filter((p) => p.status === "Succeeded");

// ── Dashboard KPIs ───────────────────────────────────────────────
export const dashboardKpis = (() => {
  const activeCases = cases.filter((c) => isActiveStage(c.stage)).length;
  const newEnrollments = clients.filter((c) => monthKey(c.enrolledDate) === THIS_MONTH).length;
  const revenueThisMonth = Math.round(
    succeeded
      .filter((p) => monthKey(p.processedDate ?? p.scheduledDate) === THIS_MONTH)
      .reduce((s, p) => s + p.amount * COMPANY_FEE_RATE, 0),
  );
  const collectedTodayList = succeeded.filter((p) => p.processedDate === TODAY);
  const paymentsCollectedToday = collectedTodayList.reduce((s, p) => s + p.amount, 0);
  const pendingSignatures = contracts.filter((c) => c.status === "Sent" || c.status === "Viewed").length;
  const failedACH = payments.filter(
    (p) => p.status === "Failed" && monthKey(p.scheduledDate) === THIS_MONTH,
  ).length;

  return {
    activeCases,
    newEnrollments,
    revenueThisMonth,
    paymentsCollectedToday,
    paymentsCollectedTodayCount: collectedTodayList.length,
    pendingSignatures,
    failedACH,
  };
})();

// ── Time series ──────────────────────────────────────────────────
export function revenueSeries(months = 9) {
  return lastMonths(months).map(({ key, label }) => {
    const monthPays = succeeded.filter((p) => monthKey(p.processedDate ?? p.scheduledDate) === key);
    const gross = monthPays.reduce((s, p) => s + p.amount, 0);
    return {
      month: label,
      revenue: Math.round(gross * COMPANY_FEE_RATE),
      collections: gross,
      bankFees: Math.round(gross * BANK_FEE_RATE),
    };
  });
}

export function settlementSeries(months = 9) {
  return lastMonths(months).map(({ key, label }, i) => ({
    month: label,
    // Settled debt $ trends up; offered amount slightly higher.
    settled: 40000 + i * 8500 + (key.charCodeAt(6) % 7) * 1500,
    enrolled: 95000 + i * 6000 + (key.charCodeAt(5) % 5) * 2000,
    rate: 44 + (i % 4) + (key.charCodeAt(6) % 3),
  }));
}

export function collectionsSeries(months = 9) {
  return revenueSeries(months).map((m) => ({
    month: m.month,
    collected: m.collections,
    target: Math.round(m.collections * 1.08),
  }));
}

// ── Stage funnel (pipeline) ──────────────────────────────────────
export const STAGE_ORDER: CaseStage[] = [
  "Lead",
  "Qualified",
  "Offer Presented",
  "Contract Sent",
  "Contract Signed",
  "Active Program",
  "Settlement",
  "Completed",
];

export function stageCounts() {
  return STAGE_ORDER.map((stage) => ({
    stage,
    count: clients.filter((c) => c.stage === stage).length,
    value: clients.filter((c) => c.stage === stage).reduce((s, c) => s + c.totalDebt, 0),
  }));
}

// ── Agent / team performance ─────────────────────────────────────
export interface AgentPerf {
  agent: Agent;
  clients: number;
  activeClients: number;
  enrolledDebt: number;
  revenue: number;
  reliability: number;
}
export function agentPerformance(): AgentPerf[] {
  return agents
    .map((agent) => {
      const mine = clients.filter((c) => c.agentId === agent.id);
      const enrolledDebt = mine.reduce((s, c) => s + c.totalDebt, 0);
      const reliability = mine.length
        ? Math.round(mine.reduce((s, c) => s + c.paymentReliability, 0) / mine.length)
        : 0;
      return {
        agent,
        clients: mine.length,
        activeClients: mine.filter((c) => isActiveStage(c.stage)).length,
        enrolledDebt,
        revenue: Math.round(enrolledDebt * COMPANY_FEE_RATE * 0.4),
        reliability,
      };
    })
    .filter((a) => a.clients > 0)
    .sort((a, b) => b.revenue - a.revenue);
}

// ── Portfolio aggregates ─────────────────────────────────────────
export const portfolio = {
  totalEnrolledDebt: clients.reduce((s, c) => s + c.totalDebt, 0),
  totalClients: clients.length,
  totalDebtAccounts: debtAccounts.length,
  avgDebtPerClient: Math.round(clients.reduce((s, c) => s + c.totalDebt, 0) / clients.length),
  settledDebt: debtAccounts
    .filter((d) => d.status === "Settled")
    .reduce((s, d) => s + (d.originalBalance - d.currentBalance), 0),
};

// ── Payments center aggregates ───────────────────────────────────
export const paymentStats = (() => {
  const received = succeeded.reduce((s, p) => s + p.amount, 0);
  const upcoming = payments.filter((p) => p.status === "Scheduled");
  const failed = payments.filter((p) => p.status === "Failed");
  const unreconciled = succeeded.filter((p) => !p.reconciled);
  return {
    received,
    receivedCount: succeeded.length,
    upcomingAmount: upcoming.reduce((s, p) => s + p.amount, 0),
    upcomingCount: upcoming.length,
    failedAmount: failed.reduce((s, p) => s + p.amount, 0),
    failedCount: failed.length,
    outstanding: clients.reduce((s, c) => s + c.totalDebt, 0) - portfolio.settledDebt,
    unreconciledCount: unreconciled.length,
  };
})();

// ── Admin financials ─────────────────────────────────────────────
export function adminFinancials(months = 9) {
  const rev = revenueSeries(months);
  const series = rev.map((m, i) => {
    const revenue = m.revenue;
    const payroll = Math.round(revenue * 0.34) + 42000;
    const marketing = Math.round(revenue * 0.12) + 9000;
    const software = 8500 + (i % 3) * 400;
    const office = 6200;
    const other = Math.round(revenue * 0.05) + 3000;
    const expenses = payroll + marketing + software + office + other;
    return {
      month: m.month,
      revenue,
      expenses,
      profit: revenue - expenses,
      payroll,
      marketing,
      software,
      office,
      other,
    };
  });
  const totals = series.reduce(
    (acc, m) => ({
      revenue: acc.revenue + m.revenue,
      expenses: acc.expenses + m.expenses,
      profit: acc.profit + m.profit,
      payroll: acc.payroll + m.payroll,
    }),
    { revenue: 0, expenses: 0, profit: 0, payroll: 0 },
  );
  const margin = totals.revenue ? Math.round((totals.profit / totals.revenue) * 100) : 0;

  // Forecast: next 3 months projected from trailing growth.
  const last = series[series.length - 1];
  const forecast = [1, 2, 3].map((n) => ({
    month: `+${n}M`,
    revenue: Math.round(last.revenue * (1 + 0.06 * n)),
    expenses: Math.round(last.expenses * (1 + 0.03 * n)),
  }));

  return { series, totals, margin, forecast };
}

export function expenseBreakdown() {
  const fin = adminFinancials();
  const last = fin.series[fin.series.length - 1];
  return [
    { name: "Payroll", value: last.payroll },
    { name: "Marketing", value: last.marketing },
    { name: "Software", value: last.software },
    { name: "Office", value: last.office },
    { name: "Other", value: last.other },
  ];
}

export interface Commission {
  agent: Agent;
  deals: number;
  enrolledDebt: number;
  commission: number;
  salary: number;
}
export function commissions(): Commission[] {
  return agentPerformance().map((p) => ({
    agent: p.agent,
    deals: p.clients,
    enrolledDebt: p.enrolledDebt,
    commission: Math.round(p.enrolledDebt * 0.015),
    salary: p.agent.role.includes("Manager") ? 7800 : p.agent.role.includes("Accounting") ? 6500 : 5200,
  }));
}

// AI summary string for a client (templated, deterministic).
export function aiSummary(client: Client): string {
  const daysIn = Math.abs(Math.round((new Date(TODAY).getTime() - new Date(client.enrolledDate).getTime()) / 86_400_000));
  const completedPayments = getClientPayments(client.id).filter((p) => p.status === "Succeeded").length;
  const pendingDocs = getClientContracts(client.id).filter((c) => c.status !== "Signed").length;
  const riskPhrase =
    client.risk === "Low" ? "Low cancellation risk." : client.risk === "Medium" ? "Moderate cancellation risk — monitor payments." : "High cancellation risk — proactive outreach recommended.";
  return `Client enrolled ${daysIn} days ago. ${completedPayments} payment${completedPayments === 1 ? "" : "s"} completed. ${pendingDocs} document${pendingDocs === 1 ? "" : "s"} pending. ${riskPhrase}`;
}
