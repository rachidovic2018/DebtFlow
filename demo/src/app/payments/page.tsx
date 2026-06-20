import Link from "next/link";
import {
  Wallet,
  CalendarClock,
  AlertTriangle,
  Scale,
  Check,
  Minus,
  RefreshCw,
  ArrowRight,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { TrendBar } from "@/components/charts/charts";
import { CHART_COLORS } from "@/components/charts/theme";
import {
  payments,
  paymentStats,
  collectionsSeries,
  getClient,
} from "@/lib/mock";
import { paymentTone } from "@/lib/status";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/utils";

const byDateDesc = (a: { scheduledDate: string }, b: { scheduledDate: string }) =>
  a.scheduledDate < b.scheduledDate ? 1 : -1;

const METHOD_TONE: Record<string, string> = {
  ACH: "text-foreground",
  Card: "text-foreground",
  Manual: "text-muted-foreground",
};

export default function PaymentsPage() {
  const s = paymentStats;
  const collections = collectionsSeries();

  const unreconciled = payments
    .filter((p) => p.status === "Succeeded" && !p.reconciled)
    .sort(byDateDesc)
    .slice(0, 6);

  const failed = payments
    .filter((p) => p.status === "Failed")
    .sort(byDateDesc)
    .slice(0, 8);

  const recent = [...payments].sort(byDateDesc).slice(0, 15);

  return (
    <div>
      <PageHeader
        title="Payments"
        description="ACH drafts, reconciliation, and transaction history"
      >
        <Button variant="outline" size="sm">
          <Download />
          Export
        </Button>
        <Button size="sm">
          Record Payment
          <ArrowRight />
        </Button>
      </PageHeader>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Payments Received"
          value={formatCompactCurrency(s.received)}
          icon={Wallet}
          accent="emerald"
          delta={{ value: "5.1%", direction: "up" }}
          hint={`${s.receivedCount} payments`}
        />
        <StatCard
          label="Upcoming ACH"
          value={formatCompactCurrency(s.upcomingAmount)}
          icon={CalendarClock}
          accent="sky"
          hint={`${s.upcomingCount} scheduled`}
        />
        <StatCard
          label="Failed ACH"
          value={formatCompactCurrency(s.failedAmount)}
          icon={AlertTriangle}
          accent="rose"
          delta={{ value: "2", direction: "down", good: true }}
          hint={`${s.failedCount} drafts`}
        />
        <StatCard
          label="Outstanding Balance"
          value={formatCompactCurrency(s.outstanding)}
          icon={Scale}
          accent="indigo"
          hint="enrolled debt remaining"
        />
      </div>

      {/* Collections trend + reconciliation queue */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Collections Trend</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Collected vs target, trailing 9 months
              </p>
            </div>
            <Badge tone="emerald" dot>
              On target
            </Badge>
          </CardHeader>
          <CardContent>
            <TrendBar
              data={collections}
              xKey="month"
              series={[
                { key: "collected", color: CHART_COLORS.sky, label: "Collected" },
                { key: "target", color: CHART_COLORS.slate, label: "Target" },
              ]}
              height={260}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Queue</CardTitle>
            <Badge tone="amber">{s.unreconciledCount} unmatched</Badge>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-2">
            {unreconciled.map((p) => {
              const client = getClient(p.clientId);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">
                      {client?.fullName ?? "Unknown client"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(p.processedDate ?? p.scheduledDate)} · {p.method}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(p.amount)}
                  </span>
                  <Button variant="outline" size="sm">
                    Reconcile
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Failed ACH */}
      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Failed ACH — Needs Attention</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Returned drafts requiring retry or client outreach
            </p>
          </div>
          <Badge tone="rose">{s.failedCount} failed</Badge>
        </CardHeader>
        <CardContent className="pt-3">
          <Table>
            <THead>
              <TR>
                <TH>Client</TH>
                <TH className="text-right">Amount</TH>
                <TH>Failure Code</TH>
                <TH>Scheduled</TH>
                <TH className="text-right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {failed.map((p) => {
                const client = getClient(p.clientId);
                return (
                  <TR key={p.id}>
                    <TD>
                      {client ? (
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium hover:text-accent hover:underline"
                        >
                          {client.fullName}
                        </Link>
                      ) : (
                        "Unknown client"
                      )}
                    </TD>
                    <TD className="text-right font-medium tabular-nums">
                      {formatCurrency(p.amount)}
                    </TD>
                    <TD>
                      <span className="font-mono text-xs text-muted-foreground">
                        {p.failureCode}
                      </span>
                    </TD>
                    <TD className="tabular-nums text-muted-foreground">
                      {formatDate(p.scheduledDate)}
                    </TD>
                    <TD className="text-right">
                      <Button variant="outline" size="sm">
                        <RefreshCw />
                        Retry
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <Link
            href="/reports"
            className="text-sm font-medium text-accent hover:underline"
          >
            View reports
          </Link>
        </CardHeader>
        <CardContent className="pt-3">
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Client</TH>
                <TH>Method</TH>
                <TH className="text-right">Amount</TH>
                <TH>Status</TH>
                <TH className="text-center">Reconciled</TH>
              </TR>
            </THead>
            <TBody>
              {recent.map((p) => {
                const client = getClient(p.clientId);
                return (
                  <TR key={p.id}>
                    <TD className="tabular-nums text-muted-foreground">
                      {formatDate(p.processedDate ?? p.scheduledDate)}
                    </TD>
                    <TD>
                      {client ? (
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium hover:text-accent hover:underline"
                        >
                          {client.fullName}
                        </Link>
                      ) : (
                        "Unknown client"
                      )}
                    </TD>
                    <TD>
                      <span className={METHOD_TONE[p.method]}>{p.method}</span>
                    </TD>
                    <TD className="text-right font-medium tabular-nums">
                      {formatCurrency(p.amount)}
                    </TD>
                    <TD>
                      <Badge tone={paymentTone(p.status)}>{p.status}</Badge>
                    </TD>
                    <TD className="text-center">
                      {p.reconciled ? (
                        <Check className="inline size-4 text-emerald-600" />
                      ) : (
                        <Minus className="inline size-4 text-muted-foreground" />
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
