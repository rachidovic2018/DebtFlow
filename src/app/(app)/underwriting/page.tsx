import Link from "next/link";
import { ClipboardCheck, Gauge, BadgeCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { fmtUSD } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

// The underwriting queue: applications actively in or past initial review.
const QUEUE_STATUSES = ["UNDER_REVIEW", "UNDERWRITING", "APPROVED"] as const;

export default async function UnderwritingQueuePage() {
  const applications = await prisma.application.findMany({
    where: { status: { in: [...QUEUE_STATUSES] } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      requestedAmountCents: true,
      avgMonthlyRevenueCents: true,
      updatedAt: true,
      client: { select: { legalName: true } },
      stips: { select: { status: true } },
    },
  });

  const inReview = applications.filter((a) => a.status === "UNDER_REVIEW").length;
  const inUnderwriting = applications.filter((a) => a.status === "UNDERWRITING").length;
  const approved = applications.filter((a) => a.status === "APPROVED").length;

  // "Approved recently" — last 7 days — as a today-ish signal.
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const approvedRecent = applications.filter(
    (a) => a.status === "APPROVED" && a.updatedAt.getTime() >= cutoff,
  ).length;

  return (
    <div>
      <PageHeader
        title="Underwriting Queue"
        description="Receivables-purchase review · Under Review → Underwriting → Approved"
      >
        <Badge tone="slate">{applications.length} in queue</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="In Review" value={String(inReview)} icon={ClipboardCheck} accent="sky" hint="awaiting underwriting" />
        <StatCard label="In Underwriting" value={String(inUnderwriting)} icon={Gauge} accent="amber" hint="active decisioning" />
        <StatCard label="Approved (7d)" value={String(approvedRecent)} icon={BadgeCheck} accent="emerald" hint="recently approved" />
        <StatCard label="Approved (total)" value={String(approved)} icon={BadgeCheck} accent="indigo" hint="awaiting funding" />
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          {applications.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              No applications in the underwriting queue.
            </p>
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Client</TH>
                  <TH>Requested</TH>
                  <TH>Status</TH>
                  <TH>Features</TH>
                  <TH>Stips</TH>
                </TR>
              </THead>
              <TBody>
                {applications.map((app) => {
                  const total = app.stips.length;
                  const received = app.stips.filter((s) => s.status === "RECEIVED").length;
                  const analyzed = app.avgMonthlyRevenueCents != null;
                  return (
                    <TR key={app.id}>
                      <TD>
                        <Link
                          href={`/underwriting/${app.id}`}
                          className="font-medium hover:underline"
                        >
                          {app.client.legalName}
                        </Link>
                      </TD>
                      <TD className="tabular-nums">
                        {app.requestedAmountCents != null ? fmtUSD(app.requestedAmountCents) : "—"}
                      </TD>
                      <TD>
                        <Badge tone={statusTone(app.status)} dot>
                          {app.status.replace(/_/g, " ")}
                        </Badge>
                      </TD>
                      <TD>
                        <Badge tone={analyzed ? "emerald" : "slate"}>
                          {analyzed ? "Analyzed" : "Needs analysis"}
                        </Badge>
                      </TD>
                      <TD>
                        <span
                          className={
                            total > 0 && received === total
                              ? "tabular-nums text-emerald-600"
                              : "tabular-nums text-muted-foreground"
                          }
                        >
                          {received}/{total}
                        </span>
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
