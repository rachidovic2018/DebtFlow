import Link from "next/link";
import type { CollectionsBucket } from "@prisma/client";
import { FolderOpen, HandCoins, AlertTriangle, User as UserIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtUSDCompact, sumCents } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

// Delinquency buckets in escalation order (CURRENT → 90+).
const BUCKETS: { key: CollectionsBucket; label: string; tone: string }[] = [
  { key: "CURRENT", label: "Current", tone: "text-emerald-600" },
  { key: "DPD_1_15", label: "1–15 DPD", tone: "text-sky-600" },
  { key: "DPD_16_30", label: "16–30 DPD", tone: "text-amber-600" },
  { key: "DPD_31_60", label: "31–60 DPD", tone: "text-amber-600" },
  { key: "DPD_61_90", label: "61–90 DPD", tone: "text-rose-600" },
  { key: "DPD_90_PLUS", label: "90+ DPD", tone: "text-rose-600" },
];

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CollectionsPage() {
  const cases = await prisma.collectionsCase.findMany({
    orderBy: { openedAt: "desc" },
    include: {
      client: { select: { id: true, legalName: true } },
      assignedTo: { select: { name: true } },
    },
  });

  const openCount = cases.filter(
    (c) => c.status === "OPEN" || c.status === "IN_PROGRESS",
  ).length;
  const inPlanCount = cases.filter((c) => c.status === "PAYMENT_PLAN").length;
  // At-risk = balance on unresolved cases (not RESOLVED / WRITTEN_OFF).
  const atRisk = sumCents(
    cases
      .filter((c) => c.status !== "RESOLVED" && c.status !== "WRITTEN_OFF")
      .map((c) => c.balanceAtOpenCents ?? 0n),
  );

  const byBucket = (bucket: CollectionsBucket) => cases.filter((c) => c.bucket === bucket);

  return (
    <div>
      <PageHeader
        title="Collections"
        description="Cases grouped by delinquency bucket. Recovery stays receipts-based (holdback × receipts) — never a fixed loan schedule."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open cases" value={String(openCount)} icon={FolderOpen} accent="rose" hint="Open + in progress" />
        <StatCard label="In payment plan" value={String(inPlanCount)} icon={HandCoins} accent="sky" />
        <StatCard
          label="At-risk balance"
          value={fmtUSDCompact(atRisk)}
          icon={AlertTriangle}
          accent="amber"
          hint="Unresolved cases"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {BUCKETS.map(({ key, label, tone }) => {
          const list = byBucket(key);
          return (
            <div key={key} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className={`text-sm font-semibold ${tone}`}>{label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground tabular-nums">
                  {list.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {list.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border py-6 text-center text-2xs text-muted-foreground">
                    No cases
                  </p>
                ) : (
                  list.map((c) => (
                    <Link key={c.id} href={`/collections/${c.id}`} className="block">
                      <Card className="p-3 transition-colors hover:bg-muted/40">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium leading-tight hover:underline">
                            {c.client.legalName}
                          </span>
                          <Badge tone={statusTone(c.status)}>
                            {c.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm font-semibold tabular-nums">
                          {fmtUSD(c.balanceAtOpenCents ?? 0n)}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-2xs text-muted-foreground">
                          <span>Opened {fmtDate(c.openedAt)}</span>
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="size-3" />
                            {c.assignedTo?.name ?? "Unassigned"}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
