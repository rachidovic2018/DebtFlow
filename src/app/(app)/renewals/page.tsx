import Link from "next/link";
import { RefreshCw, ShoppingBag, HandCoins, Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StartRenewalButton } from "@/components/renewals/start-renewal-button";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact, sumCents } from "@/lib/money";
import { RENEWAL_THRESHOLD } from "@/lib/services/renewals";

export const dynamic = "force-dynamic";

export default async function RenewalsPage() {
  // Collecting deals are the only renewal candidates. Collected payback is
  // DERIVED from the ledger — a single groupBy by dealId across all paybacks.
  const deals = await prisma.deal.findMany({
    where: { status: "COLLECTING" },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, legalName: true } } },
  });

  const collectedByDeal = await prisma.ledgerEntry.groupBy({
    by: ["dealId"],
    where: { type: "PAYBACK_COLLECTION" },
    _sum: { amountCents: true },
  });
  const collectedMap = new Map<string, bigint>(
    collectedByDeal.map((g) => [g.dealId, g._sum.amountCents ?? 0n]),
  );

  // Eligible when collected / purchased >= 50%.
  const eligible = deals
    .map((d) => {
      const collected = collectedMap.get(d.id) ?? 0n;
      const purchasedNum = Number(d.purchasedAmountCents);
      const ratio = purchasedNum > 0 ? Number(collected) / purchasedNum : 0;
      return { deal: d, collected, ratio, pct: ratio * 100 };
    })
    .filter((r) => r.ratio >= RENEWAL_THRESHOLD);

  // Recently created renewals = Applications carrying a priorDealId.
  const renewals = await prisma.application.findMany({
    where: { priorDealId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { client: { select: { id: true, legalName: true } } },
  });

  const totalPurchased = sumCents(eligible.map((r) => r.deal.purchasedAmountCents));
  const totalCollected = sumCents(eligible.map((r) => r.collected));
  const stackingCount = renewals.filter((a) => a.hasStacking).length;

  return (
    <div>
      <PageHeader
        title="Renewals"
        description="Collecting positions past the 50% payback threshold — eligible for a renewal advance"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Eligible Deals"
          value={String(eligible.length)}
          icon={RefreshCw}
          accent="violet"
          hint={`>= ${RENEWAL_THRESHOLD * 100}% collected`}
        />
        <StatCard
          label="Eligible Purchased"
          value={fmtUSDCompact(totalPurchased)}
          icon={ShoppingBag}
          accent="indigo"
          hint="Σ receivables purchased"
        />
        <StatCard
          label="Eligible Collected"
          value={fmtUSDCompact(totalCollected)}
          icon={HandCoins}
          accent="emerald"
          hint="Σ cleared paybacks"
        />
        <StatCard
          label="Renewal Apps"
          value={String(renewals.length)}
          icon={Layers}
          accent="sky"
          hint={stackingCount > 0 ? `${stackingCount} stacking flagged` : "linked to a prior deal"}
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Renewal-Eligible Deals</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {eligible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No collecting deals have reached the {RENEWAL_THRESHOLD * 100}% payback threshold yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Client</TH>
                  <TH className="text-right">Purchased</TH>
                  <TH className="text-right">Collected</TH>
                  <TH className="w-44">% Collected</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {eligible.map(({ deal: d, collected, pct }) => (
                  <TR key={d.id}>
                    <TD>
                      <Link
                        href={`/clients/${d.client.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {d.client.legalName}
                      </Link>
                      <div className="text-xs text-muted-foreground">{d.id.slice(0, 8)}</div>
                    </TD>
                    <TD className="text-right tabular-nums">
                      {fmtUSD(d.purchasedAmountCents)}
                    </TD>
                    <TD className="text-right tabular-nums">{fmtUSD(collected)}</TD>
                    <TD>
                      <Progress value={pct} />
                      <div className="mt-1 text-2xs text-muted-foreground tabular-nums">
                        {pct.toFixed(0)}%
                      </div>
                    </TD>
                    <TD className="text-right">
                      <StartRenewalButton dealId={d.id} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent Renewals</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {renewals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No renewal applications created yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Client</TH>
                  <TH>Application</TH>
                  <TH className="text-right">Requested</TH>
                  <TH>Created</TH>
                  <TH>Flags</TH>
                </TR>
              </THead>
              <TBody>
                {renewals.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <Link
                        href={`/clients/${a.client.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {a.client.legalName}
                      </Link>
                    </TD>
                    <TD>
                      <Link
                        href={`/applications/${a.id}`}
                        className="text-sm text-foreground hover:underline"
                      >
                        {a.id.slice(0, 8)}
                      </Link>
                    </TD>
                    <TD className="text-right tabular-nums">
                      {a.requestedAmountCents != null ? fmtUSD(a.requestedAmountCents) : "—"}
                    </TD>
                    <TD className="text-xs text-muted-foreground tabular-nums">
                      {a.createdAt.toLocaleDateString()}
                    </TD>
                    <TD>
                      {a.hasStacking ? (
                        <Badge tone="rose">stacking flagged</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
