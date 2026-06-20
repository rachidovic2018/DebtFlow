import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { AdvanceControls } from "@/components/applications/advance-controls";
import { StipChecklist } from "@/components/applications/stip-checklist";
import { prisma } from "@/lib/prisma";
import { fmtUSD } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";
import { APPLICATION_TRANSITIONS } from "@/domain/state-machines";

export const dynamic = "force-dynamic";

const PENDING = "Pending statement analysis";

function Feature({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default async function ApplicationDetailPage({
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
      useOfFunds: true,
      avgMonthlyRevenueCents: true,
      depositVolatility: true,
      negativeDays: true,
      avgDailyBalanceCents: true,
      hasStacking: true,
      revenueTrend: true,
      createdAt: true,
      client: { select: { id: true, legalName: true, dba: true } },
      owner: { select: { name: true } },
      stips: {
        orderBy: { requestedAt: "asc" },
        select: { id: true, name: true, status: true },
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

  const nextTargets = APPLICATION_TRANSITIONS[app.status];

  const trendIcon =
    app.revenueTrend === "UP" || app.revenueTrend === "RISING"
      ? TrendingUp
      : app.revenueTrend === "DOWN" || app.revenueTrend === "FALLING"
        ? TrendingDown
        : Minus;
  const TrendIcon = trendIcon;

  return (
    <div>
      <Link
        href="/applications"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Pipeline
      </Link>

      <PageHeader
        title={app.client.legalName}
        description={
          app.client.dba
            ? `DBA ${app.client.dba} · Receivables purchase application`
            : "Receivables purchase application"
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
            <div>
              <p className="text-xs text-muted-foreground">Owner</p>
              <p className="text-sm font-medium">{app.owner?.name ?? "Unassigned"}</p>
            </div>
            {app.useOfFunds && (
              <div>
                <p className="text-xs text-muted-foreground">Use of Funds</p>
                <p className="text-sm font-medium">{app.useOfFunds}</p>
              </div>
            )}
          </div>
          <AdvanceControls applicationId={app.id} targets={nextTargets} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Underwriting Features</CardTitle>
              <Badge tone="slate">Derived from bank statements</Badge>
            </CardHeader>
            <CardContent className="pt-3">
              <Feature
                label="Avg Monthly Revenue"
                value={
                  app.avgMonthlyRevenueCents != null
                    ? fmtUSD(app.avgMonthlyRevenueCents)
                    : PENDING
                }
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
                  app.avgDailyBalanceCents != null
                    ? fmtUSD(app.avgDailyBalanceCents)
                    : PENDING
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
              <p className="mt-3 text-2xs text-muted-foreground">
                Features are computed asynchronously after statement ingestion
                (Phase 4). &quot;Pending statement analysis&quot; means the value
                is not yet available.
              </p>
            </CardContent>
          </Card>

          <StipChecklist applicationId={app.id} stips={app.stips} />
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
