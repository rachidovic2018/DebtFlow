import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Banknote, CalendarClock, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { CaseStatusControls } from "@/components/collections/case-status-controls";
import { ReceiptsBasedPlanForm } from "@/components/collections/receipts-based-plan-form";
import { AssignCaseSelect } from "@/components/collections/assign-case-select";
import { prisma } from "@/lib/prisma";
import { fmtUSD } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";
import { COLLECTIONS_TRANSITIONS } from "@/domain/state-machines";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function bucketLabel(b: string): string {
  if (b === "CURRENT") return "Current";
  if (b === "DPD_90_PLUS") return "90+ DPD";
  return b.replace("DPD_", "").replace(/_/g, "–") + " DPD";
}

interface ExistingPlan {
  holdbackPct?: number;
  reviewCadenceDays?: number;
  note?: string;
}

export default async function CollectionsCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const kase = await prisma.collectionsCase.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, legalName: true, status: true } },
      deal: { select: { id: true, status: true, advanceAmountCents: true, purchasedAmountCents: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!kase) notFound();

  const [activities, users] = await Promise.all([
    prisma.activity.findMany({
      where: { entityType: "CollectionsCase", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const nextStates = COLLECTIONS_TRANSITIONS[kase.status];
  const existingPlan = (kase.paymentPlan as ExistingPlan | null) ?? null;

  return (
    <div>
      <PageHeader
        title={kase.client.legalName}
        description={`Collections case ${kase.id.slice(0, 8)} · receivables recovery`}
      >
        <Badge tone={statusTone(kase.status)}>{kase.status.replace(/_/g, " ")}</Badge>
        <Badge tone="slate">{bucketLabel(kase.bucket)}</Badge>
        <Link href={`/clients/${kase.client.id}`} className="text-sm text-muted-foreground hover:underline">
          View client →
        </Link>
        <Link href="/collections" className="text-sm text-muted-foreground hover:underline">
          ← All collections
        </Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Case Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3 text-sm">
              <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Client</div>
                <Link href={`/clients/${kase.client.id}`} className="font-medium hover:underline">
                  {kase.client.legalName}
                </Link>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <GitBranch className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Deal</div>
                <Link href={`/deals/${kase.deal.id}`} className="font-medium hover:underline">
                  {kase.deal.id.slice(0, 8)} · {kase.deal.status.toLowerCase()}
                </Link>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Banknote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Balance at open</div>
                <div className="font-medium tabular-nums">{fmtUSD(kase.balanceAtOpenCents ?? 0n)}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Opened</div>
                <div className="font-medium">{fmtDate(kase.openedAt)}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Resolved</div>
                <div className="font-medium">{fmtDate(kase.resolvedAt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Move case to</div>
              <CaseStatusControls caseId={kase.id} nextStates={nextStates} />
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Assigned to {kase.assignedTo ? `· ${kase.assignedTo.name}` : "· unassigned"}
              </div>
              <AssignCaseSelect caseId={kase.id} users={users} current={kase.assignedTo?.id ?? null} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Receipts-Based Payment Plan</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ReceiptsBasedPlanForm caseId={kase.id} existing={existingPlan} />
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
