import Link from "next/link";
import {
  Briefcase,
  UserPlus,
  DollarSign,
  Wallet,
  FileSignature,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { TrendArea, TrendBar } from "@/components/charts/charts";
import { CHART_COLORS } from "@/components/charts/theme";
import {
  dashboardKpis,
  settlementSeries,
  revenueSeries,
  agentPerformance,
  activities,
  contracts,
  payments,
  clients,
  getClient,
  getAgent,
} from "@/lib/mock";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  relativeDays,
} from "@/lib/utils";

function rel(date: string): string {
  const d = relativeDays(date);
  if (d === 0) return "Today";
  if (d === -1) return "Yesterday";
  return `${Math.abs(d)}d ago`;
}

// Static (JIT-safe) tone classes for alert icons.
const ALERT_TONE: Record<string, string> = {
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  indigo: "bg-indigo-50 text-indigo-600",
};

export default function DashboardPage() {
  const k = dashboardKpis;
  const settlement = settlementSeries();
  const revenue = revenueSeries();
  const team = agentPerformance().slice(0, 6);

  const failed = payments.filter((p) => p.status === "Failed").slice(0, 3);
  const pendingSigs = contracts.filter((c) => c.status === "Sent" || c.status === "Viewed").slice(0, 3);
  const highRisk = clients.filter((c) => c.risk === "High").slice(0, 3);

  const alerts = [
    {
      tone: "rose" as const,
      icon: AlertTriangle,
      title: `${k.failedACH} failed ACH payments`,
      detail: "Need reconciliation and client outreach",
      href: "/payments",
      cta: "Reconcile",
    },
    {
      tone: "amber" as const,
      icon: FileSignature,
      title: `${k.pendingSignatures} contracts awaiting signature`,
      detail: "Sent or viewed, not yet signed",
      href: "/contracts",
      cta: "Follow up",
    },
    {
      tone: "indigo" as const,
      icon: UserPlus,
      title: `${k.newEnrollments} new enrollments this month`,
      detail: "Ready for onboarding and program setup",
      href: "/clients",
      cta: "Review",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        description="Thursday, June 12, 2026 · Acme Debt Relief"
      >
        <Button variant="outline" size="sm">Export</Button>
        <Button size="sm">
          New Enrollment
          <ArrowRight />
        </Button>
      </PageHeader>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Active Cases" value={String(k.activeCases)} icon={Briefcase} accent="indigo" delta={{ value: "8.2%", direction: "up" }} hint="vs last month" />
        <StatCard label="New Enrollments" value={String(k.newEnrollments)} icon={UserPlus} accent="violet" delta={{ value: "12%", direction: "up" }} hint="this month" />
        <StatCard label="Revenue (MTD)" value={formatCompactCurrency(k.revenueThisMonth)} icon={DollarSign} accent="emerald" delta={{ value: "6.4%", direction: "up" }} hint="vs last month" />
        <StatCard label="Collected Today" value={formatCompactCurrency(k.paymentsCollectedToday)} icon={Wallet} accent="sky" hint={`${k.paymentsCollectedTodayCount} payments`} />
        <StatCard label="Pending Signatures" value={String(k.pendingSignatures)} icon={FileSignature} accent="amber" hint="awaiting client" />
        <StatCard label="Failed ACH" value={String(k.failedACH)} icon={AlertTriangle} accent="rose" delta={{ value: "3", direction: "down", good: true }} hint="this month" />
      </div>

      {/* Settlement performance + alerts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Settlement Performance</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Enrolled vs settled debt, trailing 9 months</p>
            </div>
            <Badge tone="emerald" dot>On track</Badge>
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
            <CardTitle>Workflow Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.title} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${ALERT_TONE[a.tone]}`}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{a.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
                    <Link href={a.href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                      {a.cta} <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Revenue + recent activity */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Revenue & Collections</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Company revenue vs gross collections</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
              <TrendingUp className="size-4" /> +6.4%
            </span>
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
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activities.slice(0, 7).map((a) => {
              const agent = getAgent(a.agentId);
              return (
                <div key={a.id} className="flex items-start gap-3 rounded-lg px-1 py-2">
                  <Avatar size="sm" initials={agent?.initials ?? "··"} seed={a.agentId ?? a.id} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{rel(a.date)}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Team performance */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <Link href="/reports" className="text-sm font-medium text-accent hover:underline">
            View report
          </Link>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((t) => (
              <div key={t.agent.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Avatar initials={t.agent.initials} seed={t.agent.id} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">
                      {t.agent.firstName} {t.agent.lastName}
                    </p>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(t.revenue)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t.activeClients} active · {t.clients} clients</span>
                    <span>{formatPercent(t.reliability)} reliable</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
