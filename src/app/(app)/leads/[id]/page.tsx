import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { ActivityTimeline, type ActivityItem } from "@/components/shared/activity-timeline";
import { LeadStatusControls } from "@/components/leads/lead-status-controls";
import { prisma } from "@/lib/prisma";
import { fmtUSD } from "@/lib/money";
import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/status-tone";
import { LEAD_TRANSITIONS } from "@/domain/state-machines";

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      broker: { select: { name: true } },
    },
  });

  if (!lead) notFound();

  const activities = await prisma.activity.findMany({
    where: { entityType: "Lead", entityId: id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });

  const timeline: ActivityItem[] = activities.map((a) => ({
    id: a.id,
    type: a.type,
    summary: a.summary,
    actorName: a.actor?.name ?? null,
    createdAt: a.createdAt,
  }));

  const allowedTransitions = LEAD_TRANSITIONS[lead.status] ?? [];
  const canConvert =
    !lead.convertedClientId &&
    (lead.status === "QUALIFIED" || lead.status === "APPLICATION_STARTED");

  return (
    <div>
      <PageHeader title={lead.businessName} description={lead.contactName ?? "Lead detail"}>
        <Badge tone={statusTone(lead.status)}>{lead.status.replace(/_/g, " ")}</Badge>
        <Link href="/leads" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <ArrowLeft />
          Back to pipeline
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
              {lead.score != null && <Badge tone="indigo">Score {lead.score}</Badge>}
            </CardHeader>
            <CardContent className="pt-2">
              <Detail label="Business" value={lead.businessName} />
              <Separator />
              <Detail label="Contact" value={lead.contactName ?? "—"} />
              <Separator />
              <Detail
                label="Email"
                value={lead.email ? <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a> : "—"}
              />
              <Separator />
              <Detail
                label="Phone"
                value={lead.phone ? <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a> : "—"}
              />
              <Separator />
              <Detail
                label="Requested Amount"
                value={lead.requestedAmountCents != null ? fmtUSD(lead.requestedAmountCents) : "—"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Detail label="Owner" value={lead.owner?.name ?? "Unassigned"} />
              <Separator />
              <Detail label="Broker" value={lead.broker?.name ?? "Direct"} />
              <Separator />
              <Detail label="Source" value={lead.source ?? "—"} />
              {lead.convertedClientId && (
                <>
                  <Separator />
                  <Detail
                    label="Converted Client"
                    value={
                      <Link
                        href={`/clients/${lead.convertedClientId}`}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                      >
                        View client <ArrowUpRight className="size-3.5" />
                      </Link>
                    }
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stage</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <LeadStatusControls
                id={lead.id}
                status={lead.status}
                allowedTransitions={allowedTransitions}
                canConvert={canConvert}
              />
            </CardContent>
          </Card>

          <ActivityTimeline items={timeline} />
        </div>
      </div>
    </div>
  );
}
