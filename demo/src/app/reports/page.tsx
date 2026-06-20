import {
  DollarSign,
  Wallet,
  Briefcase,
  Users,
  Handshake,
  TrendingUp,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { TrendArea, TrendBar } from "@/components/charts/charts";
import { CHART_COLORS } from "@/components/charts/theme";
import {
  dashboardKpis,
  paymentStats,
  portfolio,
  revenueSeries,
  collectionsSeries,
  settlementSeries,
  stageCounts,
  agentPerformance,
} from "@/lib/mock";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";

export default function ReportsPage() {
  const k = dashboardKpis;
  const revenue = revenueSeries();
  const collections = collectionsSeries();
  const settlement = settlementSeries();
  const stages = stageCounts();
  const team = agentPerformance();

  const last = settlement[settlement.length - 1];
  const settlementRate = last ? Math.round((last.settled / last.enrolled) * 100) : 0;
  const collected12mo = revenue.reduce((sum, m) => sum + m.collections, 0);
  const companyRevenue = revenue.reduce((sum, m) => sum + m.revenue, 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Executive analytics across revenue, collections, and team performance"
      >
        <Select defaultValue="9m" className="w-40">
          <option value="3m">Last 3 months</option>
          <option value="6m">Last 6 months</option>
          <option value="9m">Last 9 months</option>
          <option value="ytd">Year to date</option>
        </Select>
        <Button variant="outline" size="sm">
          <Download />
          Export
        </Button>
      </PageHeader>

      {/* Executive KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Company Revenue"
          value={formatCompactCurrency(companyRevenue)}
          icon={DollarSign}
          accent="indigo"
          delta={{ value: "6.4%", direction: "up" }}
          hint="trailing 9 months"
        />
        <StatCard
          label="Gross Collections"
          value={formatCompactCurrency(collected12mo)}
          icon={Wallet}
          accent="sky"
          delta={{ value: "5.1%", direction: "up" }}
          hint="trailing 9 months"
        />
        <StatCard
          label="Enrolled Debt"
          value={formatCompactCurrency(portfolio.totalEnrolledDebt)}
          icon={Briefcase}
          accent="violet"
          hint={`${portfolio.totalClients} clients`}
        />
        <StatCard
          label="Settled Debt"
          value={formatCompactCurrency(portfolio.settledDebt)}
          icon={Handshake}
          accent="emerald"
          hint={`${formatPercent(settlementRate)} settlement rate`}
        />
        <StatCard
          label="Active Cases"
          value={String(k.activeCases)}
          icon={Users}
          accent="amber"
          delta={{ value: "8.2%", direction: "up" }}
          hint="signed · active · settlement"
        />
        <StatCard
          label="Received (All)"
          value={formatCompactCurrency(paymentStats.received)}
          icon={TrendingUp}
          accent="rose"
          hint={`${paymentStats.receivedCount} payments`}
        />
      </div>

      {/* Revenue + Collections analytics */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Revenue Analytics</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Gross collections vs company revenue
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <TrendBar
              data={revenue}
              xKey="month"
              series={[
                { key: "collections", color: CHART_COLORS.sky, label: "Collections" },
                { key: "revenue", color: CHART_COLORS.indigo, label: "Revenue" },
              ]}
              height={260}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Collections Analytics</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Collected vs target
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={collections}
              xKey="month"
              series={[
                { key: "target", color: CHART_COLORS.slate, label: "Target" },
                { key: "collected", color: CHART_COLORS.emerald, label: "Collected" },
              ]}
              height={260}
            />
          </CardContent>
        </Card>
      </div>

      {/* Settlement + Case performance */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Settlement Analytics</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Enrolled vs settled debt
              </p>
            </div>
            <Badge tone="emerald" dot>
              {formatPercent(settlementRate)} rate
            </Badge>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={settlement}
              xKey="month"
              series={[
                { key: "enrolled", color: CHART_COLORS.indigo, label: "Enrolled" },
                { key: "settled", color: CHART_COLORS.emerald, label: "Settled" },
              ]}
              height={260}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Case Performance</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Clients by pipeline stage
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <TrendBar
              data={stages}
              xKey="stage"
              series={[{ key: "count", color: CHART_COLORS.violet, label: "Cases" }]}
              height={260}
              money={false}
            />
          </CardContent>
        </Card>
      </div>

      {/* Agent performance */}
      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Agent Performance</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Revenue contribution and payment reliability by agent
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <Table>
            <THead>
              <TR>
                <TH>Agent</TH>
                <TH className="text-right">Clients</TH>
                <TH className="text-right">Active</TH>
                <TH className="text-right">Enrolled Debt</TH>
                <TH className="text-right">Revenue</TH>
                <TH className="w-48">Reliability</TH>
              </TR>
            </THead>
            <TBody>
              {team.map((t) => (
                <TR key={t.agent.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm" initials={t.agent.initials} seed={t.agent.id} />
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-tight">
                          {t.agent.firstName} {t.agent.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{t.agent.role}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-right tabular-nums">{t.clients}</TD>
                  <TD className="text-right tabular-nums">{t.activeClients}</TD>
                  <TD className="text-right tabular-nums">
                    {formatCompactCurrency(t.enrolledDebt)}
                  </TD>
                  <TD className="text-right font-medium tabular-nums">
                    {formatCurrency(t.revenue)}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Progress value={t.reliability} className="flex-1" />
                      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {formatPercent(t.reliability)}
                      </span>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
