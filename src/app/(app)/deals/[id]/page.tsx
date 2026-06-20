import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote,
  ShoppingBag,
  Percent,
  Sigma,
  CalendarClock,
  Repeat,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { FundDealButton } from "@/components/deals/fund-deal-button";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtFactor, fmtPct, sumCents } from "@/lib/money";
import { remittanceCents } from "@/lib/services/epps-scheduler";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

function freqLabel(f: string): string {
  return f.charAt(0) + f.slice(1).toLowerCase();
}

function Term({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Banknote;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium tabular-nums">{value ?? "—"}</div>
      </div>
    </div>
  );
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          legalName: true,
          status: true,
          eppsEnrollment: { select: { status: true, enrolledAt: true, gateway: true } },
        },
      },
      ledgerEntries: { orderBy: { occurredAt: "desc" } },
      eppsPayments: { orderBy: { dueDate: "desc" } },
    },
  });

  if (!deal) notFound();

  const activities = await prisma.activity.findMany({
    where: { entityType: "Deal", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: { select: { name: true } } },
  });

  // Outstanding balance is DERIVED: purchased − Σ(PAYBACK_COLLECTION).
  const collected = sumCents(
    deal.ledgerEntries
      .filter((e) => e.type === "PAYBACK_COLLECTION")
      .map((e) => e.amountCents),
  );
  const outstanding = deal.purchasedAmountCents - collected;
  const purchasedNum = Number(deal.purchasedAmountCents);
  const pct = purchasedNum > 0 ? (Number(collected) / purchasedNum) * 100 : 0;

  // Estimated remaining remittances from the receipts-based estimate.
  const perRemit = remittanceCents(deal);
  const remainingRemittances =
    outstanding > 0n && perRemit > 0n
      ? Math.ceil(Number(outstanding) / Number(perRemit))
      : 0;

  const enrollment = deal.client.eppsEnrollment;

  return (
    <div>
      <PageHeader
        title={deal.client.legalName}
        description={`Deal ${deal.id.slice(0, 8)} · receivables purchase`}
      >
        <Badge tone={statusTone(deal.status)}>{deal.status.replace(/_/g, " ")}</Badge>
        {deal.status === "PENDING" && <FundDealButton dealId={deal.id} />}
        <Link
          href={`/clients/${deal.client.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          View client →
        </Link>
        <Link href="/deals" className="text-sm text-muted-foreground hover:underline">
          ← All deals
        </Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Terms — receivables-purchase, NOT a loan. */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Purchase Terms</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <Term icon={Banknote} label="Advance" value={fmtUSD(deal.advanceAmountCents)} />
            <Term
              icon={ShoppingBag}
              label="Purchased Amount"
              value={fmtUSD(deal.purchasedAmountCents)}
            />
            <Term
              icon={Sigma}
              label="Factor Rate"
              value={fmtFactor(Number(deal.factorRate))}
            />
            <Term
              icon={Percent}
              label="Holdback"
              value={fmtPct(Number(deal.holdbackPct))}
            />
            <Term
              icon={Repeat}
              label="Remittance"
              value={freqLabel(deal.remittanceFrequency)}
            />
            <Term
              icon={CalendarClock}
              label="Estimated Term"
              value={`${deal.estimatedTermDays} days (est.)`}
            />
            <Term icon={CheckCircle2} label="Funded" value={fmtDateTime(deal.fundedAt)} />
          </CardContent>
        </Card>

        {/* Collection progress — derived from the ledger. */}
        <Card>
          <CardHeader>
            <CardTitle>Collection Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Collected</span>
                <span className="font-medium tabular-nums">
                  {fmtUSD(collected)} / {fmtUSD(deal.purchasedAmountCents)}
                </span>
              </div>
              <Progress value={pct} className="mt-2" />
              <div className="mt-1 text-2xs text-muted-foreground tabular-nums">
                {pct.toFixed(1)}% collected
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className="font-medium tabular-nums">{fmtUSD(outstanding)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Est. remaining remittances</span>
              <span className="font-medium tabular-nums">{remainingRemittances}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">EPPS enrollment</span>
              <Badge tone={statusTone(enrollment?.status ?? "PENDING")}>
                {(enrollment?.status ?? "PENDING").replace(/_/g, " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EPPS payments */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>EPPS Payments</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {deal.eppsPayments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No remittances scheduled yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Due</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Status</TH>
                  <TH>Batch Window</TH>
                  <TH>Submitted</TH>
                  <TH>Cleared</TH>
                  <TH>Returned</TH>
                  <TH>Return Code</TH>
                </TR>
              </THead>
              <TBody>
                {deal.eppsPayments.map((p) => (
                  <TR key={p.id}>
                    <TD className="text-muted-foreground">{fmtDateTime(p.dueDate)}</TD>
                    <TD className="text-right tabular-nums">{fmtUSD(p.amountCents)}</TD>
                    <TD>
                      <Badge tone={statusTone(p.status)}>
                        {p.status.replace(/_/g, " ")}
                      </Badge>
                    </TD>
                    <TD className="text-muted-foreground">{p.batchWindow ?? "—"}</TD>
                    <TD className="text-muted-foreground">{fmtDateTime(p.submittedAt)}</TD>
                    <TD className="text-muted-foreground">{fmtDateTime(p.clearedAt)}</TD>
                    <TD className="text-muted-foreground">{fmtDateTime(p.returnedAt)}</TD>
                    <TD className="text-muted-foreground">{p.returnCode ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ledger — append-only, drives the balance. */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {deal.ledgerEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No ledger entries yet — the ledger moves only on cleared settlement.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Type</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Occurred</TH>
                </TR>
              </THead>
              <TBody>
                {deal.ledgerEntries.map((e) => (
                  <TR key={e.id}>
                    <TD className="font-medium">{e.type.replace(/_/g, " ")}</TD>
                    <TD className="text-right tabular-nums">{fmtUSD(e.amountCents)}</TD>
                    <TD className="text-muted-foreground">{fmtDateTime(e.occurredAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <ActivityTimeline
          items={activities.map((a) => ({
            id: a.id,
            type: a.type,
            summary: a.summary,
            actorName: a.actor?.name ?? null,
            createdAt: a.createdAt,
          }))}
        />
      </div>
    </div>
  );
}
