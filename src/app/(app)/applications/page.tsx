import Link from "next/link";
import { FileSearch, Gauge, BadgeCheck, Banknote } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact, sumCents } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";
import type { ApplicationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Pipeline columns in funnel order. DECLINED / WITHDRAWN are terminal off-ramps
// shown last so the happy path (Submitted → Funded) reads left to right.
const COLUMNS: { status: ApplicationStatus; label: string }[] = [
  { status: "SUBMITTED", label: "Submitted" },
  { status: "UNDER_REVIEW", label: "Under Review" },
  { status: "UNDERWRITING", label: "Underwriting" },
  { status: "APPROVED", label: "Approved" },
  { status: "FUNDED", label: "Funded" },
  { status: "DECLINED", label: "Declined" },
  { status: "WITHDRAWN", label: "Withdrawn" },
];

export default async function ApplicationsPage() {
  const applications = await prisma.application.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      requestedAmountCents: true,
      client: { select: { id: true, legalName: true } },
      owner: { select: { name: true } },
      stips: { select: { status: true } },
    },
  });

  const byStatus = new Map<ApplicationStatus, typeof applications>();
  for (const col of COLUMNS) byStatus.set(col.status, []);
  for (const app of applications) {
    const bucket = byStatus.get(app.status);
    if (bucket) bucket.push(app);
  }

  const total = applications.length;
  const inUnderwriting = byStatus.get("UNDERWRITING")?.length ?? 0;
  const approved = byStatus.get("APPROVED")?.length ?? 0;
  const fundedApps = byStatus.get("FUNDED") ?? [];
  const fundedVolume = sumCents(fundedApps.map((a) => a.requestedAmountCents));

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Receivables-purchase pipeline · Submitted → Funded"
      >
        <Badge tone="slate">{total} total</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Applications" value={String(total)} icon={FileSearch} accent="sky" hint="all stages" />
        <StatCard label="In Underwriting" value={String(inUnderwriting)} icon={Gauge} accent="amber" hint="active review" />
        <StatCard label="Approved" value={String(approved)} icon={BadgeCheck} accent="emerald" hint="awaiting funding" />
        <StatCard label="Funded Volume" value={fmtUSDCompact(fundedVolume)} icon={Banknote} accent="indigo" hint="requested at funding" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {COLUMNS.map((col) => {
          const cards = byStatus.get(col.status) ?? [];
          return (
            <div key={col.status} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(col.status)} dot>
                    {col.label}
                  </Badge>
                </div>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {cards.length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {cards.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    None
                  </p>
                )}
                {cards.map((app) => {
                  const total = app.stips.length;
                  const received = app.stips.filter((s) => s.status === "RECEIVED").length;
                  return (
                    <Card key={app.id} className="p-3 transition-colors hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/clients/${app.client.id}`}
                          className="text-sm font-medium leading-snug hover:underline"
                        >
                          {app.client.legalName}
                        </Link>
                        <Badge tone={statusTone(app.status)}>{app.status.replace(/_/g, " ")}</Badge>
                      </div>
                      <Link
                        href={`/applications/${app.id}`}
                        className="mt-2 block text-lg font-semibold tabular-nums tracking-tight hover:underline"
                      >
                        {app.requestedAmountCents != null ? fmtUSD(app.requestedAmountCents) : "—"}
                      </Link>
                      <div className="mt-2 flex items-center justify-between text-2xs text-muted-foreground">
                        <span>{app.owner?.name ?? "Unassigned"}</span>
                        <span
                          className={
                            total > 0 && received === total ? "text-emerald-600" : undefined
                          }
                        >
                          Stips {received}/{total}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
