import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Scale,
  Wallet,
  HandCoins,
  Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { TrendBar } from "@/components/charts/charts";
import { CHART_COLORS } from "@/components/charts/theme";
import { TransactionFilters } from "@/components/accounting/transaction-filters";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";
import type { Prisma, TransactionType, TransactionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const TX_TYPES: TransactionType[] = [
  "FUNDING_OUTFLOW",
  "CLIENT_PAYMENT",
  "COMMISSION_PAYOUT",
  "SYNDICATION_DISTRIBUTION",
  "FEE",
  "REFUND",
];
const TX_STATUSES: TransactionStatus[] = [
  "PENDING",
  "CLEARED",
  "RECONCILED",
  "FAILED",
];

const OUTFLOW_TYPES: TransactionType[] = [
  "FUNDING_OUTFLOW",
  "COMMISSION_PAYOUT",
  "SYNDICATION_DISTRIBUTION",
];

const TYPE_TONE: Record<TransactionType, Parameters<typeof Badge>[0]["tone"]> = {
  CLIENT_PAYMENT: "emerald",
  FUNDING_OUTFLOW: "sky",
  COMMISSION_PAYOUT: "violet",
  SYNDICATION_DISTRIBUTION: "indigo",
  FEE: "amber",
  REFUND: "rose",
};

const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" });
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type SP = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.length > 0 ? s : undefined;
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const typeFilter = one(sp.type);
  const statusFilter = one(sp.status);
  const fromFilter = one(sp.from);
  const toFilter = one(sp.to);

  // ── Build the filtered Transaction query (company books). ──
  const where: Prisma.TransactionWhereInput = {};
  if (typeFilter && TX_TYPES.includes(typeFilter as TransactionType)) {
    where.type = typeFilter as TransactionType;
  }
  if (statusFilter && TX_STATUSES.includes(statusFilter as TransactionStatus)) {
    where.status = statusFilter as TransactionStatus;
  }
  if (fromFilter || toFilter) {
    where.occurredAt = {};
    if (fromFilter) where.occurredAt.gte = new Date(fromFilter);
    if (toFilter) {
      // inclusive end of the selected day
      const end = new Date(toFilter);
      end.setHours(23, 59, 59, 999);
      where.occurredAt.lte = end;
    }
  }

  const [
    rows,
    inflowAgg,
    outflowAgg,
    commissionAgg,
    statusCounts,
    clearedForChart,
    receivablesDeals,
    collectedAgg,
  ] = await Promise.all([
    // Filtered ledger table — most recent first, ~40 rows.
    prisma.transaction.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 40,
      include: {
        client: { select: { id: true, legalName: true } },
        deal: { select: { id: true } },
        broker: { select: { id: true, name: true } },
      },
    }),
    // Rollups span ALL books (not the table filter): total inflow = Σ cleared CLIENT_PAYMENT.
    prisma.transaction.aggregate({
      where: { type: "CLIENT_PAYMENT", status: "CLEARED" },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: { type: { in: OUTFLOW_TYPES }, status: "CLEARED" },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "COMMISSION_PAYOUT", status: "CLEARED" },
      _sum: { amountCents: true },
    }),
    prisma.transaction.groupBy({ by: ["status"], _count: true }),
    // Monthly inflow vs outflow chart — CLEARED only.
    prisma.transaction.findMany({
      where: { status: "CLEARED" },
      select: { type: true, amountCents: true, occurredAt: true },
    }),
    // Receivables purchased on live deals.
    prisma.deal.findMany({
      where: { status: { in: ["FUNDED", "COLLECTING"] } },
      select: { purchasedAmountCents: true },
    }),
    // Payback collected per-deal ledger (distinct from company books).
    prisma.ledgerEntry.aggregate({
      where: { type: "PAYBACK_COLLECTION" },
      _sum: { amountCents: true },
    }),
  ]);

  const totalInflow = inflowAgg._sum.amountCents ?? 0n;
  const totalOutflow = outflowAgg._sum.amountCents ?? 0n;
  const net = totalInflow - totalOutflow;
  const commissionsPaid = commissionAgg._sum.amountCents ?? 0n;
  // Cash position = running net of all cleared movements (same as net here).
  const cashPosition = net;

  const receivables = receivablesDeals.reduce(
    (s, d) => s + d.purchasedAmountCents,
    0n,
  );
  const collected = collectedAgg._sum.amountCents ?? 0n;

  // ── Monthly inflow vs outflow (cents → dollars only at the chart edge). ──
  const monthMap = new Map<
    string,
    { key: string; label: string; sortKey: number; inflow: number; outflow: number }
  >();
  for (const t of clearedForChart) {
    const d = t.occurredAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let bucket = monthMap.get(key);
    if (!bucket) {
      bucket = {
        key,
        label: MONTH_FMT.format(d),
        sortKey: d.getFullYear() * 12 + d.getMonth(),
        inflow: 0,
        outflow: 0,
      };
      monthMap.set(key, bucket);
    }
    const dollars = Number(t.amountCents) / 100;
    if (t.type === "CLIENT_PAYMENT") bucket.inflow += dollars;
    else if (OUTFLOW_TYPES.includes(t.type)) bucket.outflow += dollars;
  }
  const chartData = Array.from(monthMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(-12)
    .map((m) => ({ month: m.label, Inflow: m.inflow, Outflow: m.outflow }));

  // Reconciliation lifecycle counts.
  const statusMap = new Map<string, number>(
    statusCounts.map((s) => [s.status, s._count]),
  );

  return (
    <div>
      <PageHeader
        title="Accounting"
        description="Company books — cash movements, reconciliation & receivables coverage"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Inflow"
          value={fmtUSDCompact(totalInflow)}
          icon={ArrowDownToLine}
          accent="emerald"
          hint="Σ cleared client payments"
        />
        <StatCard
          label="Total Outflow"
          value={fmtUSDCompact(totalOutflow)}
          icon={ArrowUpFromLine}
          accent="rose"
          hint="funding + commissions + syndication"
        />
        <StatCard
          label="Net"
          value={fmtUSDCompact(net)}
          icon={Scale}
          accent={net >= 0n ? "emerald" : "rose"}
          hint="inflow − outflow"
        />
        <StatCard
          label="Cash Position"
          value={fmtUSDCompact(cashPosition)}
          icon={Wallet}
          accent="indigo"
          hint="running net (cleared)"
        />
        <StatCard
          label="Commissions Paid"
          value={fmtUSDCompact(commissionsPaid)}
          icon={HandCoins}
          accent="violet"
          hint="Σ commission payouts"
        />
        <StatCard
          label="Receivables / Collected"
          value={`${fmtUSDCompact(receivables)} / ${fmtUSDCompact(collected)}`}
          icon={Receipt}
          accent="amber"
          hint="purchased vs payback collected"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inflow vs Outflow by Month</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No cleared transactions yet.
              </p>
            ) : (
              <TrendBar
                data={chartData}
                xKey="month"
                series={[
                  { key: "Inflow", color: CHART_COLORS.emerald, label: "Inflow" },
                  { key: "Outflow", color: CHART_COLORS.rose, label: "Outflow" },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Bank-reconciliation lifecycle: Pending → Cleared → Reconciled.
            </p>
            {TX_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between">
                <Badge tone={statusTone(s)}>{s.replace(/_/g, " ")}</Badge>
                <span className="text-sm font-medium tabular-nums">
                  {statusMap.get(s) ?? 0}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Transactions Ledger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <TransactionFilters
            type={typeFilter}
            status={statusFilter}
            from={fromFilter}
            to={toFilter}
          />

          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions match these filters.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH>Client</TH>
                  <TH>Deal</TH>
                  <TH className="text-right">Amount</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((t) => (
                  <TR key={t.id}>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {DATE_FMT.format(t.occurredAt)}
                    </TD>
                    <TD>
                      <Badge tone={TYPE_TONE[t.type]}>
                        {t.type.replace(/_/g, " ")}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={statusTone(t.status)}>
                        {t.status.replace(/_/g, " ")}
                      </Badge>
                    </TD>
                    <TD>
                      {t.client ? (
                        <Link
                          href={`/clients/${t.client.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {t.client.legalName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD>
                      {t.deal ? (
                        <Link
                          href={`/deals/${t.deal.id}`}
                          className="font-mono text-xs text-foreground hover:underline"
                        >
                          {t.deal.id.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {fmtUSD(t.amountCents)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Company-books <strong>Transactions</strong> are distinct from per-deal{" "}
        <strong>LedgerEntry</strong> records (payback collection). The two are
        linked via <code>dealId</code> but track different things: Transactions
        are the firm&apos;s cash movements; LedgerEntry is the append-only
        receivables-collection ledger per deal.
      </p>
    </div>
  );
}
