import Link from "next/link";
import { Banknote, ShoppingBag, HandCoins, Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { RunCycleButton } from "@/components/deals/run-cycle-button";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact, fmtFactor, sumCents } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, legalName: true } } },
  });

  // Outstanding balance is DERIVED from the ledger, never stored. Query the
  // collected total (Σ PAYBACK_COLLECTION) grouped by dealId in a single pass.
  const collectedByDeal = await prisma.ledgerEntry.groupBy({
    by: ["dealId"],
    where: { type: "PAYBACK_COLLECTION" },
    _sum: { amountCents: true },
  });
  const collectedMap = new Map<string, bigint>(
    collectedByDeal.map((g) => [g.dealId, g._sum.amountCents ?? 0n]),
  );

  const rows = deals.map((d) => {
    const collected = collectedMap.get(d.id) ?? 0n;
    const outstanding = d.purchasedAmountCents - collected;
    const purchasedNum = Number(d.purchasedAmountCents);
    const pct = purchasedNum > 0 ? (Number(collected) / purchasedNum) * 100 : 0;
    return { deal: d, collected, outstanding, pct };
  });

  // Portfolio tiles.
  const totalFunded = sumCents(deals.map((d) => d.advanceAmountCents));
  const totalPurchased = sumCents(deals.map((d) => d.purchasedAmountCents));
  const totalCollected = sumCents(rows.map((r) => r.collected));
  const activeDeals = deals.filter((d) => d.status === "COLLECTING").length;

  return (
    <div>
      <PageHeader
        title="Deals"
        description="Receivables-purchase positions — funded advances and EPPS collections"
      >
        <RunCycleButton />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Funded"
          value={fmtUSDCompact(totalFunded)}
          icon={Banknote}
          accent="sky"
          hint="Σ advance disbursed"
        />
        <StatCard
          label="Total Purchased"
          value={fmtUSDCompact(totalPurchased)}
          icon={ShoppingBag}
          accent="indigo"
          hint="Σ receivables purchased"
        />
        <StatCard
          label="Total Collected"
          value={fmtUSDCompact(totalCollected)}
          icon={HandCoins}
          accent="emerald"
          hint="Σ cleared paybacks"
        />
        <StatCard
          label="Active Deals"
          value={String(activeDeals)}
          icon={Activity}
          accent="violet"
          hint="currently collecting"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>All Deals</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No deals yet — fund an approved application to create one.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Client</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Advance</TH>
                  <TH className="text-right">Purchased</TH>
                  <TH className="text-right">Factor</TH>
                  <TH className="text-right">Outstanding</TH>
                  <TH className="w-44">Collected</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map(({ deal: d, collected, outstanding, pct }) => (
                  <TR key={d.id}>
                    <TD>
                      <Link
                        href={`/deals/${d.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {d.client.legalName}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {d.id.slice(0, 8)}
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={statusTone(d.status)}>
                        {d.status.replace(/_/g, " ")}
                      </Badge>
                    </TD>
                    <TD className="text-right tabular-nums">
                      {fmtUSD(d.advanceAmountCents)}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {fmtUSD(d.purchasedAmountCents)}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {fmtFactor(Number(d.factorRate))}
                    </TD>
                    <TD className="text-right tabular-nums">{fmtUSD(outstanding)}</TD>
                    <TD>
                      <Progress value={pct} />
                      <div className="mt-1 text-2xs text-muted-foreground tabular-nums">
                        {fmtUSD(collected)} ({pct.toFixed(0)}%)
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
