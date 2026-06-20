import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, FileSearch, Banknote, Wallet, Mail, Phone, Percent } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact, fmtPct, sumCents } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

export default async function BrokerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const broker = await prisma.broker.findUnique({
    where: { id },
    include: {
      _count: { select: { clients: true, applications: true } },
      clients: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { applications: true } },
          deals: { select: { advanceAmountCents: true } },
        },
      },
    },
  });

  if (!broker) notFound();

  // Total collected = Σ PAYBACK_COLLECTION across this broker's clients' deals.
  const clientIds = broker.clients.map((c) => c.id);
  const collectedAgg = await prisma.ledgerEntry.aggregate({
    where: {
      type: "PAYBACK_COLLECTION",
      deal: { clientId: { in: clientIds.length ? clientIds : ["__none__"] } },
    },
    _sum: { amountCents: true },
  });

  const totalFunded = sumCents(
    broker.clients.flatMap((c) => c.deals.map((d) => d.advanceAmountCents)),
  );
  const totalCollected = collectedAgg._sum.amountCents ?? 0n;

  return (
    <div>
      <Link
        href="/brokers"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Brokers / ISOs
      </Link>

      <PageHeader title={broker.name} description="Broker / ISO performance">
        <Badge tone={statusTone(broker.status)}>{broker.status.replace(/_/g, " ")}</Badge>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile &amp; Commission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4" />
              <span>{broker.email ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4" />
              <span>{broker.phone ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Percent className="size-4" />
              <span>
                Commission{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {fmtPct(Number(broker.commissionPct))}
                </span>{" "}
                of advance
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard
            label="Clients"
            value={String(broker._count.clients)}
            icon={Users}
            accent="indigo"
          />
          <StatCard
            label="Applications"
            value={String(broker._count.applications)}
            icon={FileSearch}
            accent="sky"
          />
          <StatCard
            label="Total Funded"
            value={fmtUSDCompact(totalFunded)}
            icon={Banknote}
            accent="emerald"
            hint="advances to their clients"
          />
          <StatCard
            label="Total Collected"
            value={fmtUSDCompact(totalCollected)}
            icon={Wallet}
            accent="violet"
            hint="payback to date"
          />
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {broker.clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No clients sourced by this broker yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Client</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Applications</TH>
                  <TH className="text-right">Funded</TH>
                </TR>
              </THead>
              <TBody>
                {broker.clients.map((c) => {
                  const funded = sumCents(c.deals.map((d) => d.advanceAmountCents));
                  return (
                    <TR key={c.id}>
                      <TD>
                        <Link
                          href={`/clients/${c.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {c.legalName}
                        </Link>
                        {c.dba && (
                          <div className="text-xs text-muted-foreground">{c.dba}</div>
                        )}
                      </TD>
                      <TD>
                        <Badge tone={statusTone(c.status)}>
                          {c.status.replace(/_/g, " ")}
                        </Badge>
                      </TD>
                      <TD className="text-right tabular-nums">{c._count.applications}</TD>
                      <TD className="text-right tabular-nums">{fmtUSD(funded)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
