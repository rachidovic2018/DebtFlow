import Link from "next/link";
import { Users, Magnet, Banknote, Wallet, TrendingUp, Landmark, Building2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma";
import { fmtUSDCompact, fmtUSD } from "@/lib/money";
import { getDashboardSnapshot, computeDashboardSnapshot } from "@/lib/services/snapshots";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Heavy rankings come from the precomputed snapshot (cron). Fall back to a
  // live compute if the cron hasn't run yet.
  const snap = (await getDashboardSnapshot()) ?? (await computeDashboardSnapshot());

  // Live counts/balances — cheap, queried directly.
  const [
    clientsByStatus,
    activeClients,
    leadsCount,
    deals,
    collectedAgg,
    fundedAgg,
    openCollections,
    pendingRecon,
  ] = await Promise.all([
    prisma.client.groupBy({ by: ["status"], _count: true }),
    prisma.client.count({ where: { status: "ACTIVE_CLIENT" } }),
    prisma.lead.count({ where: { status: { notIn: ["CONVERTED", "LOST"] } } }),
    prisma.deal.findMany({ where: { status: { in: ["FUNDED", "COLLECTING"] } }, select: { purchasedAmountCents: true, advanceAmountCents: true } }),
    prisma.ledgerEntry.aggregate({ where: { type: "PAYBACK_COLLECTION" }, _sum: { amountCents: true } }),
    prisma.transaction.aggregate({ where: { type: "FUNDING_OUTFLOW" }, _sum: { amountCents: true } }),
    prisma.collectionsCase.count({ where: { status: { notIn: ["RESOLVED", "WRITTEN_OFF"] } } }),
    prisma.reconciliation.count({ where: { status: "PENDING" } }),
  ]);

  const totalPurchased = deals.reduce((s, d) => s + d.purchasedAmountCents, 0n);
  const totalCollected = collectedAgg._sum.amountCents ?? 0n;
  const portfolioBalance = totalPurchased - totalCollected; // derived from ledger
  const totalFunded = fundedAgg._sum.amountCents ?? 0n;

  const maxSectorClients = Math.max(1, ...snap.topSectors.map((s) => s.clientCount));
  const maxCreditorClients = Math.max(1, ...snap.topCreditors.map((c) => c.clientCount));

  return (
    <div>
      <PageHeader title="Operations Dashboard" description="Capital Flow · Merchant Cash Advance">
        <Badge tone="slate">Snapshot {new Date(snap.computedAt).toLocaleDateString("en-US")}</Badge>
      </PageHeader>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Active Clients" value={String(activeClients)} icon={Users} accent="indigo" hint="funded & collecting" />
        <StatCard label="Open Leads" value={String(leadsCount)} icon={Magnet} accent="violet" hint="in pipeline" />
        <StatCard label="Total Funded" value={fmtUSDCompact(totalFunded)} icon={Banknote} accent="emerald" hint="advances disbursed" />
        <StatCard label="Collected" value={fmtUSDCompact(totalCollected)} icon={Wallet} accent="sky" hint="payback to date" />
        <StatCard label="Portfolio Balance" value={fmtUSDCompact(portfolioBalance)} icon={TrendingUp} accent="amber" hint="from ledger" />
        <StatCard label="Open Collections" value={String(openCollections)} icon={AlertTriangle} accent="rose" hint={`${pendingRecon} recon pending`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Most relevant creditor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Landmark className="size-4 text-muted-foreground" /> Most Relevant Creditors</CardTitle>
            <Link href="/creditors" className="text-sm font-medium text-accent hover:underline">All</Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {snap.topCreditors.length === 0 && <p className="text-sm text-muted-foreground">No data.</p>}
            {snap.topCreditors.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="tabular-nums text-muted-foreground">{c.clientCount} clients · {fmtUSDCompact(BigInt(c.totalBalanceCents))}</span>
                </div>
                <Progress value={(c.clientCount / maxCreditorClients) * 100} className="mt-1 h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Most relevant sector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="size-4 text-muted-foreground" /> Most Relevant Sectors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {snap.topSectors.map((s) => (
              <div key={s.sector}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.sector}</span>
                  <span className="tabular-nums text-muted-foreground">{s.clientCount} clients · {fmtUSDCompact(BigInt(s.fundedVolumeCents))}</span>
                </div>
                <Progress value={(s.clientCount / maxSectorClients) * 100} className="mt-1 h-1.5" indicatorClassName="bg-violet-500" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Client score distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Client Score</CardTitle>
            <Badge tone="indigo">avg {snap.avgClientScore}</Badge>
          </CardHeader>
          <CardContent className="space-y-2 pt-2 text-sm">
            {snap.scoreDistribution.map((b) => (
              <div key={b.bucket} className="flex items-center justify-between">
                <span className="text-muted-foreground">{b.bucket}</span>
                <span className="font-medium tabular-nums">{b.count}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 text-xs text-muted-foreground">
              {snap.avgCreditorsPerClient} creditors per client (avg)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients by status + portfolio */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Clients by Status</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-2 text-sm">
            {clientsByStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-muted-foreground">{s.status.replace(/_/g, " ")}</span>
                <span className="font-medium tabular-nums">{s._count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Portfolio</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Receivables purchased (active)</span><span className="font-medium tabular-nums">{fmtUSD(totalPurchased)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Collected (ledger)</span><span className="font-medium tabular-nums">{fmtUSD(totalCollected)}</span></div>
            <div className="flex items-center justify-between border-t border-border pt-2"><span className="text-muted-foreground">Outstanding balance</span><span className="font-semibold tabular-nums text-amber-600">{fmtUSD(portfolioBalance)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
