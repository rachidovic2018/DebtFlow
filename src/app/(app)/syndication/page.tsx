import Link from "next/link";
import { Users2, Banknote, HandCoins } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { AddParticipationForm } from "@/components/syndication/add-participation-form";
import { RecordDistributionForm } from "@/components/syndication/record-distribution-form";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact, sumCents } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

// Sum the amountCents entries in a participation's distributions JSON log.
function sumDistributions(distributions: unknown): bigint {
  if (!Array.isArray(distributions)) return 0n;
  return distributions.reduce<bigint>((acc, d) => {
    const raw = (d as { amountCents?: unknown })?.amountCents;
    if (raw == null) return acc;
    try {
      return acc + BigInt(String(raw));
    } catch {
      return acc;
    }
  }, 0n);
}

export default async function SyndicationPage() {
  const participations = await prisma.participation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      deal: { include: { client: { select: { id: true, legalName: true } } } },
    },
  });

  // Deal options for the Add Participation picker (fundable/active positions).
  const deals = await prisma.deal.findMany({
    where: { status: { in: ["PENDING", "FUNDED", "COLLECTING"] } },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { legalName: true } } },
  });
  const dealOptions = deals.map((d) => ({
    id: d.id,
    label: `${d.client.legalName} · ${fmtUSDCompact(d.purchasedAmountCents)} · ${d.id.slice(0, 6)}`,
  }));

  // Per-participation distributed totals.
  const distributedById = new Map<string, bigint>(
    participations.map((p) => [p.id, sumDistributions(p.distributions)]),
  );

  // Group participations by deal, preserving recency order.
  const groups = new Map<
    string,
    { deal: (typeof participations)[number]["deal"]; rows: typeof participations }
  >();
  for (const p of participations) {
    const g = groups.get(p.dealId);
    if (g) g.rows.push(p);
    else groups.set(p.dealId, { deal: p.deal, rows: [p] });
  }

  const totalInvested = sumCents(participations.map((p) => p.investedAmountCents));
  const totalDistributed = sumCents([...distributedById.values()]);

  return (
    <div>
      <PageHeader
        title="Syndication"
        description="Investor participations on receivables-purchase positions and their distributions"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Participations"
          value={String(participations.length)}
          icon={Users2}
          accent="violet"
          hint="across all deals"
        />
        <StatCard
          label="Total Invested"
          value={fmtUSDCompact(totalInvested)}
          icon={Banknote}
          accent="indigo"
          hint="Σ investor capital"
        />
        <StatCard
          label="Total Distributed"
          value={fmtUSDCompact(totalDistributed)}
          icon={HandCoins}
          accent="emerald"
          hint="Σ distributions paid"
        />
      </div>

      <div className="mt-4">
        <AddParticipationForm deals={dealOptions} />
      </div>

      {groups.size === 0 ? (
        <Card className="mt-4">
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              No participations yet — add one above to syndicate a deal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 space-y-4">
          {[...groups.values()].map(({ deal, rows }) => (
            <Card key={deal.id}>
              <CardHeader>
                <CardTitle>
                  <Link
                    href={`/clients/${deal.client.id}`}
                    className="hover:underline"
                  >
                    {deal.client.legalName}
                  </Link>
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone={statusTone(deal.status)}>
                    {deal.status.replace(/_/g, " ")}
                  </Badge>
                  <span className="tabular-nums">
                    {fmtUSD(deal.purchasedAmountCents)} purchased · {deal.id.slice(0, 8)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <Table>
                  <THead>
                    <TR>
                      <TH>Investor</TH>
                      <TH className="text-right">Participation</TH>
                      <TH className="text-right">Invested</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Distributed</TH>
                      <TH className="text-right">Record Distribution</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {rows.map((p) => (
                      <TR key={p.id}>
                        <TD className="font-medium text-foreground">{p.investorName}</TD>
                        <TD className="text-right tabular-nums">
                          {Number(p.participationPct)}%
                        </TD>
                        <TD className="text-right tabular-nums">
                          {fmtUSD(p.investedAmountCents)}
                        </TD>
                        <TD>
                          <Badge tone={statusTone(p.status)}>
                            {p.status.replace(/_/g, " ")}
                          </Badge>
                        </TD>
                        <TD className="text-right tabular-nums">
                          {fmtUSD(distributedById.get(p.id) ?? 0n)}
                        </TD>
                        <TD className="text-right">
                          <RecordDistributionForm participationId={p.id} />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
