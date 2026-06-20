import Link from "next/link";
import { Handshake, Banknote, Percent } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { fmtUSDCompact, fmtPct, sumCents } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";
import { AddBrokerForm } from "@/components/brokers/add-broker-form";

export const dynamic = "force-dynamic";

export default async function BrokersPage() {
  const brokers = await prisma.broker.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { clients: true, applications: true } },
      clients: {
        select: { deals: { select: { advanceAmountCents: true } } },
      },
    },
  });

  // Funded volume per broker = Σ advanceAmountCents across their clients' deals.
  const rows = brokers.map((b) => {
    const advances = b.clients.flatMap((c) => c.deals.map((d) => d.advanceAmountCents));
    return { broker: b, fundedCents: sumCents(advances) };
  });

  const totalBrokers = brokers.length;
  const totalFunded = sumCents(rows.map((r) => r.fundedCents));
  const avgCommission =
    brokers.length > 0
      ? brokers.reduce((s, b) => s + Number(b.commissionPct), 0) / brokers.length
      : 0;

  return (
    <div>
      <PageHeader
        title="Brokers / ISOs"
        description="Origination partners and their commission configuration"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Brokers"
          value={String(totalBrokers)}
          icon={Handshake}
          accent="indigo"
          hint="active & inactive"
        />
        <StatCard
          label="Funded Volume"
          value={fmtUSDCompact(totalFunded)}
          icon={Banknote}
          accent="emerald"
          hint="advances via broker clients"
        />
        <StatCard
          label="Avg Commission"
          value={fmtPct(avgCommission)}
          icon={Percent}
          accent="violet"
          hint="across all brokers"
        />
      </div>

      <div className="mt-4">
        <AddBrokerForm />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>All Brokers</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No brokers yet — add one above.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Broker / ISO</TH>
                  <TH className="text-right">Commission</TH>
                  <TH className="text-right">Clients</TH>
                  <TH className="text-right">Applications</TH>
                  <TH className="text-right">Funded Volume</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map(({ broker, fundedCents }) => (
                  <TR key={broker.id}>
                    <TD>
                      <Link
                        href={`/brokers/${broker.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {broker.name}
                      </Link>
                      {broker.email && (
                        <div className="text-xs text-muted-foreground">{broker.email}</div>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {fmtPct(Number(broker.commissionPct))}
                    </TD>
                    <TD className="text-right tabular-nums">{broker._count.clients}</TD>
                    <TD className="text-right tabular-nums">{broker._count.applications}</TD>
                    <TD className="text-right tabular-nums">{fmtUSDCompact(fundedCents)}</TD>
                    <TD>
                      <Badge tone={statusTone(broker.status)}>
                        {broker.status.replace(/_/g, " ")}
                      </Badge>
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
