import Link from "next/link";
import { Landmark, Users, Scale } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact, sumCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CreditorsPage() {
  const creditors = await prisma.creditor.findMany({
    include: {
      relationships: {
        select: { clientId: true, balanceCents: true },
      },
    },
  });

  const rows = creditors
    .map((c) => {
      const distinctClients = new Set(c.relationships.map((r) => r.clientId)).size;
      const exposure = sumCents(c.relationships.map((r) => r.balanceCents));
      return {
        id: c.id,
        name: c.name,
        sector: c.sector,
        clients: distinctClients,
        relationships: c.relationships.length,
        exposure,
      };
    })
    // Most relevant creditor: by client count desc, then balance exposure desc.
    .sort((a, b) => b.clients - a.clients || Number(b.exposure - a.exposure));

  const totalCreditors = rows.length;
  const totalExposure = sumCents(rows.map((r) => r.exposure));
  const totalRelationships = rows.reduce((s, r) => s + r.relationships, 0);

  return (
    <div>
      <PageHeader
        title="Creditors"
        description="Ranked by client exposure across the portfolio"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Creditors"
          value={String(totalCreditors)}
          icon={Landmark}
          accent="indigo"
        />
        <StatCard
          label="Total Exposure"
          value={fmtUSDCompact(totalExposure)}
          icon={Scale}
          accent="amber"
          hint="Σ outstanding balances"
        />
        <StatCard
          label="Relationships"
          value={String(totalRelationships)}
          icon={Users}
          accent="sky"
          hint="client ↔ creditor links"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Creditor Ranking</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No creditors on file yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-12 text-right">#</TH>
                  <TH>Creditor</TH>
                  <TH className="text-right">Clients</TH>
                  <TH className="text-right">Relationships</TH>
                  <TH className="text-right">Exposure</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r, i) => (
                  <TR key={r.id}>
                    <TD className="text-right tabular-nums text-muted-foreground">{i + 1}</TD>
                    <TD>
                      <Link
                        href={`/creditors/${r.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {r.name}
                      </Link>
                      {r.sector && (
                        <div className="text-xs text-muted-foreground">{r.sector}</div>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">{r.clients}</TD>
                    <TD className="text-right tabular-nums">{r.relationships}</TD>
                    <TD className="text-right tabular-nums">{fmtUSD(r.exposure)}</TD>
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
