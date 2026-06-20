import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { DecisionForm } from "@/components/underwriting/decision-form";
import { WorkspaceActions } from "@/components/underwriting/workspace-actions";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtFactor, fmtPct } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

const PENDING = "Pending analysis";

function Feature({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default async function UnderwritingWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const app = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      requestedAmountCents: true,
      avgMonthlyRevenueCents: true,
      depositVolatility: true,
      negativeDays: true,
      avgDailyBalanceCents: true,
      hasStacking: true,
      revenueTrend: true,
      client: { select: { id: true, legalName: true, dba: true } },
      decisions: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          outcome: true,
          approvedAmountCents: true,
          factorRate: true,
          holdbackPct: true,
          paybackAmountCents: true,
          createdAt: true,
        },
      },
    },
  });

  if (!app) notFound();

  const activities = await prisma.activity.findMany({
    where: { entityType: "Application", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      summary: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  });

  const analyzed = app.avgMonthlyRevenueCents != null;
  const TrendIcon =
    app.revenueTrend === "UP"
      ? TrendingUp
      : app.revenueTrend === "DOWN"
        ? TrendingDown
        : Minus;

  function fmtDate(d: Date): string {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div>
      <Link
        href="/underwriting"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Underwriting Queue
      </Link>

      <PageHeader
        title={app.client.legalName}
        description={
          app.client.dba
            ? `DBA ${app.client.dba} · Receivables purchase decisioning`
            : "Receivables purchase decisioning"
        }
      >
        <Badge tone={statusTone(app.status)} dot>
          {app.status.replace(/_/g, " ")}
        </Badge>
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <p className="text-xs text-muted-foreground">Requested Amount</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {app.requestedAmountCents != null ? fmtUSD(app.requestedAmountCents) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <Link
                href={`/clients/${app.client.id}`}
                className="text-sm font-medium hover:underline"
              >
                {app.client.legalName}
              </Link>
            </div>
          </div>
          <WorkspaceActions applicationId={app.id} canBegin={app.status === "UNDER_REVIEW"} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Underwriting Features</CardTitle>
              <Badge tone={analyzed ? "emerald" : "slate"}>
                {analyzed ? "Analyzed" : "Needs analysis"}
              </Badge>
            </CardHeader>
            <CardContent className="pt-3">
              <Feature
                label="Avg Monthly Revenue"
                value={analyzed ? fmtUSD(app.avgMonthlyRevenueCents) : PENDING}
              />
              <Feature
                label="Deposit Volatility"
                value={
                  app.depositVolatility != null
                    ? Number(app.depositVolatility).toFixed(2)
                    : PENDING
                }
              />
              <Feature
                label="Negative Days"
                value={app.negativeDays != null ? app.negativeDays : PENDING}
              />
              <Feature
                label="Avg Daily Balance"
                value={
                  app.avgDailyBalanceCents != null ? fmtUSD(app.avgDailyBalanceCents) : PENDING
                }
              />
              <Feature
                label="Revenue Trend"
                value={
                  app.revenueTrend ? (
                    <span className="inline-flex items-center gap-1">
                      <TrendIcon className="size-4" /> {app.revenueTrend}
                    </span>
                  ) : (
                    PENDING
                  )
                }
              />
              <Feature
                label="Stacking Detected"
                value={
                  app.hasStacking == null ? (
                    PENDING
                  ) : (
                    <Badge tone={app.hasStacking ? "rose" : "emerald"}>
                      {app.hasStacking ? "Yes" : "None detected"}
                    </Badge>
                  )
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prior Decisions</CardTitle>
              <Badge tone="slate">{app.decisions.length} versions</Badge>
            </CardHeader>
            <CardContent className="px-0 pb-0 pt-3">
              {app.decisions.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted-foreground">
                  No decisions recorded yet.
                </p>
              ) : (
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Ver</TH>
                      <TH>Outcome</TH>
                      <TH>Approved</TH>
                      <TH>Factor</TH>
                      <TH>Holdback</TH>
                      <TH>Payback</TH>
                      <TH>Date</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {app.decisions.map((d) => (
                      <TR key={d.id}>
                        <TD className="tabular-nums">v{d.version}</TD>
                        <TD>
                          <Badge tone={statusTone(d.outcome)}>{d.outcome}</Badge>
                        </TD>
                        <TD className="tabular-nums">
                          {d.approvedAmountCents != null ? fmtUSD(d.approvedAmountCents) : "—"}
                        </TD>
                        <TD className="tabular-nums">
                          {d.factorRate != null ? fmtFactor(Number(d.factorRate)) : "—"}
                        </TD>
                        <TD className="tabular-nums">
                          {d.holdbackPct != null ? fmtPct(Number(d.holdbackPct)) : "—"}
                        </TD>
                        <TD className="tabular-nums">
                          {d.paybackAmountCents != null ? fmtUSD(d.paybackAmountCents) : "—"}
                        </TD>
                        <TD className="text-muted-foreground">{fmtDate(d.createdAt)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <DecisionForm applicationId={app.id} />
        </div>

        <div className="space-y-6">
          <ActivityTimeline
            items={activities.map((a) => ({
              id: a.id,
              type: a.type,
              summary: a.summary,
              actorName: a.actor?.name,
              createdAt: a.createdAt,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
