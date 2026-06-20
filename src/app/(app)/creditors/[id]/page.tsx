import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Scale, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact, sumCents } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

export default async function CreditorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const creditor = await prisma.creditor.findUnique({
    where: { id },
    include: {
      relationships: {
        orderBy: { balanceCents: "desc" },
        include: {
          client: { select: { id: true, legalName: true, dba: true, status: true } },
        },
      },
    },
  });

  if (!creditor) notFound();

  const distinctClients = new Set(creditor.relationships.map((r) => r.clientId)).size;
  const totalBalance = sumCents(creditor.relationships.map((r) => r.balanceCents));
  const totalMonthly = sumCents(creditor.relationships.map((r) => r.monthlyPaymentCents));

  return (
    <div>
      <Link
        href="/creditors"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Creditors
      </Link>

      <PageHeader
        title={creditor.name}
        description={creditor.sector ?? "Creditor exposure detail"}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Clients Owing"
          value={String(distinctClients)}
          icon={Users}
          accent="indigo"
        />
        <StatCard
          label="Total Balance"
          value={fmtUSDCompact(totalBalance)}
          icon={Scale}
          accent="amber"
          hint="exposure across clients"
        />
        <StatCard
          label="Monthly Payments"
          value={fmtUSDCompact(totalMonthly)}
          icon={CalendarClock}
          accent="sky"
          hint="combined obligations"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Clients Owing This Creditor</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {creditor.relationships.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No client relationships on file.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Client</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Balance</TH>
                  <TH className="text-right">Monthly Payment</TH>
                </TR>
              </THead>
              <TBody>
                {creditor.relationships.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link
                        href={`/clients/${r.client.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {r.client.legalName}
                      </Link>
                      {r.client.dba && (
                        <div className="text-xs text-muted-foreground">{r.client.dba}</div>
                      )}
                    </TD>
                    <TD>
                      <Badge tone={statusTone(r.client.status)}>
                        {r.client.status.replace(/_/g, " ")}
                      </Badge>
                    </TD>
                    <TD className="text-right tabular-nums">{fmtUSD(r.balanceCents)}</TD>
                    <TD className="text-right tabular-nums">
                      {r.monthlyPaymentCents != null ? fmtUSD(r.monthlyPaymentCents) : "—"}
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
