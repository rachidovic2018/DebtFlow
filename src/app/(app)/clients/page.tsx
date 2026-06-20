import Link from "next/link";
import { Users, UserCheck, Banknote, Gauge } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact, sumCents } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { name: true } },
      creditorRelationships: { select: { balanceCents: true } },
      deals: { select: { advanceAmountCents: true } },
    },
  });

  // Total debt per client = Σ of their CreditorRelationship.balanceCents.
  const rows = clients.map((c) => ({
    client: c,
    totalDebt: sumCents(c.creditorRelationships.map((r) => r.balanceCents)),
    advance: sumCents(c.deals.map((d) => d.advanceAmountCents)),
  }));

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "ACTIVE_CLIENT").length;
  // Portfolio advance = Σ advanceAmountCents across all clients' deals.
  const portfolioAdvance = sumCents(rows.map((r) => r.advance));
  const scored = clients.filter((c) => c.clientScore != null);
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((s, c) => s + (c.clientScore ?? 0), 0) / scored.length)
      : 0;

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Merchant accounts — receivables-purchase relationships"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Clients"
          value={String(totalClients)}
          icon={Users}
          accent="indigo"
          hint="all statuses"
        />
        <StatCard
          label="Active Clients"
          value={String(activeClients)}
          icon={UserCheck}
          accent="emerald"
          hint="funded & collecting"
        />
        <StatCard
          label="Portfolio Advance"
          value={fmtUSDCompact(portfolioAdvance)}
          icon={Banknote}
          accent="sky"
          hint="total advanced"
        />
        <StatCard
          label="Avg Client Score"
          value={scored.length > 0 ? String(avgScore) : "—"}
          icon={Gauge}
          accent="violet"
          hint="0–100"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No clients yet — convert a qualified lead to create one.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Client</TH>
                  <TH>Sector</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Score</TH>
                  <TH>Owner</TH>
                  <TH className="text-right">Total Debt</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map(({ client, totalDebt }) => (
                  <TR key={client.id}>
                    <TD>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {client.legalName}
                      </Link>
                      {client.dba && (
                        <div className="text-xs text-muted-foreground">
                          dba {client.dba}
                        </div>
                      )}
                    </TD>
                    <TD className="text-muted-foreground">{client.sector ?? "—"}</TD>
                    <TD>
                      <Badge tone={statusTone(client.status)}>
                        {client.status.replace(/_/g, " ")}
                      </Badge>
                    </TD>
                    <TD className="text-right tabular-nums">
                      {client.clientScore ?? "—"}
                    </TD>
                    <TD className="text-muted-foreground">
                      {client.owner?.name ?? "Unassigned"}
                    </TD>
                    <TD className="text-right tabular-nums">{fmtUSD(totalDebt)}</TD>
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
