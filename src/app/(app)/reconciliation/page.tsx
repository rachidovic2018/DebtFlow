import Link from "next/link";
import { ClipboardCheck, AlarmClock, Coins, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { NewReconciliationForm } from "@/components/reconciliation/new-reconciliation-form";
import { ReconciliationRowActions } from "@/components/reconciliation/reconciliation-row-actions";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact, sumCents } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ReconciliationPage() {
  const now = new Date();

  const [reconciliations, deals] = await Promise.all([
    prisma.reconciliation.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        deal: { select: { id: true, client: { select: { id: true, legalName: true } } } },
      },
    }),
    // Active deals (collecting) are eligible for reconciliation.
    prisma.deal.findMany({
      where: { status: { in: ["FUNDED", "COLLECTING"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, client: { select: { legalName: true } } },
    }),
  ]);

  const pendingCount = reconciliations.filter((r) => r.status === "PENDING").length;
  const overdueCount = reconciliations.filter(
    (r) => r.status === "PENDING" && r.slaDueAt && r.slaDueAt < now,
  ).length;
  const totalCredited = sumCents(
    reconciliations
      .filter((r) => r.status === "CREDITED" || r.status === "COMPLETED")
      .map((r) => r.overCollectionCreditCents ?? 0n),
  );

  const dealOptions = deals.map((d) => ({
    id: d.id,
    label: `${d.client.legalName} · ${d.id.slice(0, 8)} · ${d.status.toLowerCase()}`,
  }));

  return (
    <div>
      <PageHeader
        title="Reconciliation"
        description="Compliance-critical: recompute owed remittance from reported receipts and credit any over-collection. A receivables purchase — never a loan."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending review" value={String(pendingCount)} icon={ClipboardCheck} accent="amber" />
        <StatCard
          label="Overdue SLA"
          value={String(overdueCount)}
          icon={AlarmClock}
          accent="rose"
          hint="Pending past SLA due date"
        />
        <StatCard
          label="Total credited"
          value={fmtUSDCompact(totalCredited)}
          icon={Coins}
          accent="emerald"
          hint="Over-collection returned to merchants"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" /> New Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <NewReconciliationForm deals={dealOptions} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Reconciliation Queue</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {reconciliations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No reconciliations yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Client / Deal</TH>
                  <TH>Period</TH>
                  <TH className="text-right">Reported Receipts</TH>
                  <TH className="text-right">Recomputed Remittance</TH>
                  <TH className="text-right">Over-Collection Credit</TH>
                  <TH>Status</TH>
                  <TH>SLA</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {reconciliations.map((r) => {
                  const overdue = r.status === "PENDING" && r.slaDueAt && r.slaDueAt < now;
                  const actionable = r.status === "PENDING" || r.status === "RECOMPUTED";
                  return (
                    <TR key={r.id}>
                      <TD>
                        <Link
                          href={`/deals/${r.deal.id}`}
                          className="font-medium hover:underline"
                        >
                          {r.deal.client.legalName}
                        </Link>
                        <div className="text-2xs text-muted-foreground">
                          Deal {r.deal.id.slice(0, 8)}
                        </div>
                      </TD>
                      <TD className="text-muted-foreground">
                        {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}
                      </TD>
                      <TD className="text-right tabular-nums">
                        {fmtUSD(r.reportedReceiptsCents)}
                      </TD>
                      <TD className="text-right tabular-nums">
                        {fmtUSD(r.recomputedRemittanceCents)}
                      </TD>
                      <TD className="text-right tabular-nums">
                        {fmtUSD(r.overCollectionCreditCents ?? 0n)}
                      </TD>
                      <TD>
                        <Badge tone={statusTone(r.status)}>{r.status.replace(/_/g, " ")}</Badge>
                        {r.status === "DENIED" && r.denialReason && (
                          <div className="mt-0.5 max-w-[16rem] truncate text-2xs text-muted-foreground" title={r.denialReason}>
                            {r.denialReason}
                          </div>
                        )}
                      </TD>
                      <TD>
                        {overdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                            <AlarmClock className="size-3.5" /> Overdue
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {fmtDate(r.slaDueAt)}
                          </span>
                        )}
                      </TD>
                      <TD className="text-right">
                        {actionable ? (
                          <ReconciliationRowActions id={r.id} />
                        ) : (
                          <span className="text-2xs text-muted-foreground">—</span>
                        )}
                      </TD>
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
