import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Percent,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { TrendBar, TrendArea, Donut } from "@/components/charts/charts";
import { CHART_COLORS } from "@/components/charts/theme";
import { adminFinancials, expenseBreakdown, commissions, agents } from "@/lib/mock";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/utils";

// Static tone map for expense bars (JIT-safe).
const EXPENSE_BARS: { key: string; label: string; indicator: string }[] = [
  { key: "payroll", label: "Payroll", indicator: "bg-indigo-500" },
  { key: "marketing", label: "Marketing", indicator: "bg-emerald-500" },
  { key: "software", label: "Software", indicator: "bg-amber-500" },
  { key: "office", label: "Office", indicator: "bg-sky-500" },
  { key: "other", label: "Other", indicator: "bg-violet-500" },
];

export default function AdminPage() {
  const fin = adminFinancials();
  const { totals, margin, series, forecast } = fin;
  const last = series[series.length - 1];
  const breakdown = expenseBreakdown();
  const comms = commissions();
  const headcount = agents.length;

  const lastMonthExpenses = EXPENSE_BARS.map((b) => ({
    ...b,
    amount: last[b.key as keyof typeof last] as number,
  }));
  const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);

  const commTotals = comms.reduce(
    (acc, c) => ({
      deals: acc.deals + c.deals,
      enrolledDebt: acc.enrolledDebt + c.enrolledDebt,
      commission: acc.commission + c.commission,
      salary: acc.salary + c.salary,
    }),
    { deals: 0, enrolledDebt: 0, commission: 0, salary: 0 },
  );

  // Combine trailing series + forecast for the forecast chart.
  const forecastData = [
    ...series.slice(-3).map((m) => ({ month: m.month, revenue: m.revenue, expenses: m.expenses })),
    ...forecast,
  ];

  return (
    <div>
      <PageHeader title="Admin" description="Company financials & operations">
        <Button variant="outline" size="sm">
          Export P&amp;L
        </Button>
        <Button size="sm">Close the month</Button>
      </PageHeader>

      {/* Executive KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Revenue (TTM)" value={formatCompactCurrency(totals.revenue)} icon={DollarSign} accent="indigo" delta={{ value: "9.1%", direction: "up" }} hint="trailing 9 mo" />
        <StatCard label="Expenses" value={formatCompactCurrency(totals.expenses)} icon={TrendingDown} accent="rose" delta={{ value: "4.3%", direction: "up", good: false }} hint="trailing 9 mo" />
        <StatCard label="Net Profit" value={formatCompactCurrency(totals.profit)} icon={TrendingUp} accent="emerald" delta={{ value: "12.6%", direction: "up" }} hint="trailing 9 mo" />
        <StatCard label="Profit Margin" value={formatPercent(margin)} icon={Percent} accent="violet" delta={{ value: "2.1pt", direction: "up" }} hint="net margin" />
        <StatCard label="Payroll (TTM)" value={formatCompactCurrency(totals.payroll)} icon={Wallet} accent="amber" hint="all staff" />
        <StatCard label="Headcount" value={String(headcount)} icon={Users} accent="sky" hint="active agents" />
      </div>

      {/* P&L + expense donut */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Revenue, Expenses & Profit</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Monthly P&amp;L, trailing 9 months</p>
            </div>
            <Badge tone="emerald" dot>
              {formatPercent(margin)} margin
            </Badge>
          </CardHeader>
          <CardContent>
            <TrendBar
              data={series}
              xKey="month"
              series={[
                { key: "revenue", color: CHART_COLORS.indigo, label: "Revenue" },
                { key: "expenses", color: CHART_COLORS.rose, label: "Expenses" },
                { key: "profit", color: CHART_COLORS.emerald, label: "Profit" },
              ]}
              height={280}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">Latest month</p>
          </CardHeader>
          <CardContent>
            <Donut
              data={breakdown}
              centerLabel="Total"
              centerValue={formatCompactCurrency(lastMonthTotal)}
              height={280}
            />
          </CardContent>
        </Card>
      </div>

      {/* Forecast + company expenses */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Financial Forecast</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Projected revenue vs expenses, next 3 months
              </p>
            </div>
            <Badge tone="indigo" dot>
              Forecast
            </Badge>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={forecastData}
              xKey="month"
              series={[
                { key: "revenue", color: CHART_COLORS.indigo, label: "Revenue" },
                { key: "expenses", color: CHART_COLORS.amber, label: "Expenses" },
              ]}
              height={260}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Expenses</CardTitle>
            <p className="text-xs text-muted-foreground">{last.month}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastMonthExpenses.map((e) => {
              const share = lastMonthTotal ? (e.amount / lastMonthTotal) * 100 : 0;
              return (
                <div key={e.key}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{e.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(e.amount)}
                      <span className="ml-1.5 text-xs">{formatPercent(share)}</span>
                    </span>
                  </div>
                  <Progress value={share} indicatorClassName={e.indicator} />
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(lastMonthTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission tracking */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Commission Tracking</CardTitle>
          <p className="text-xs text-muted-foreground">Trailing period · by agent</p>
        </CardHeader>
        <CardContent className="pt-2">
          <Table>
            <THead>
              <TR>
                <TH>Agent</TH>
                <TH className="text-right">Deals</TH>
                <TH className="text-right">Enrolled Debt</TH>
                <TH className="text-right">Commission</TH>
                <TH className="text-right">Monthly Salary</TH>
              </TR>
            </THead>
            <TBody>
              {comms.map((c) => (
                <TR key={c.agent.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm" initials={c.agent.initials} seed={c.agent.id} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {c.agent.firstName} {c.agent.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{c.agent.role}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-right tabular-nums">{c.deals}</TD>
                  <TD className="text-right tabular-nums">{formatCurrency(c.enrolledDebt)}</TD>
                  <TD className="text-right font-medium tabular-nums">{formatCurrency(c.commission)}</TD>
                  <TD className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(c.salary)}
                  </TD>
                </TR>
              ))}
              <TR className="font-semibold hover:bg-transparent">
                <TD>Total</TD>
                <TD className="text-right tabular-nums">{commTotals.deals}</TD>
                <TD className="text-right tabular-nums">{formatCurrency(commTotals.enrolledDebt)}</TD>
                <TD className="text-right tabular-nums">{formatCurrency(commTotals.commission)}</TD>
                <TD className="text-right tabular-nums">{formatCurrency(commTotals.salary)}</TD>
              </TR>
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payroll summary */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Payroll Summary</CardTitle>
            <p className="text-xs text-muted-foreground">{last.month}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly payroll</span>
              <span className="text-sm font-semibold tabular-nums">{formatCurrency(last.payroll)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total salaries</span>
              <span className="text-sm font-semibold tabular-nums">{formatCurrency(commTotals.salary)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Commissions paid</span>
              <span className="text-sm font-semibold tabular-nums">{formatCurrency(commTotals.commission)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium">Avg cost / head</span>
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(Math.round(last.payroll / headcount))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profit Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Net profit, trailing 9 months</p>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={series}
              xKey="month"
              series={[{ key: "profit", color: CHART_COLORS.emerald, label: "Profit" }]}
              height={220}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
