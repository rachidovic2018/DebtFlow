import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSignature, ExternalLink, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { SignatureTimeline } from "@/components/contracts/signature-timeline";
import { ContractActions } from "@/components/contracts/contract-actions";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtFactor, fmtPct } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function canManage(role?: string | null): boolean {
  return role === "ADMIN" || role === "FUNDER_OPS";
}

// mergedData stores amounts as strings-of-cents → BigInt() before fmtUSD.
function centsStr(v: unknown): bigint {
  if (typeof v === "string" && v.trim() !== "") {
    try {
      return BigInt(v);
    } catch {
      return 0n;
    }
  }
  if (typeof v === "number") return BigInt(Math.round(v));
  return 0n;
}

function Term({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const contract = await prisma.contract.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      sentAt: true,
      signedAt: true,
      signedDocumentUrl: true,
      mergedData: true,
      applicationId: true,
      dealId: true,
      client: { select: { id: true, legalName: true } },
      template: { select: { name: true, docType: true } },
    },
  });

  if (!contract) notFound();

  const md = (contract.mergedData ?? {}) as Record<string, unknown>;
  const clientName = typeof md.client_name === "string" ? md.client_name : contract.client.legalName;
  const remittance =
    typeof md.remittance_frequency === "string" ? md.remittance_frequency : "DAILY";
  const estTermDays =
    typeof md.estimated_term_days === "number"
      ? md.estimated_term_days
      : md.estimated_term_days != null
        ? Number(md.estimated_term_days)
        : null;

  // Activity is logged against the Application (contract_drafted etc.).
  const activities = contract.applicationId
    ? await prisma.activity.findMany({
        where: { entityType: "Application", entityId: contract.applicationId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          summary: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      })
    : [];

  return (
    <div>
      <Link
        href="/contracts"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Contracts
      </Link>

      <PageHeader
        title={clientName}
        description={`${contract.template?.name ?? "Contract"} · Receivables purchase agreement`}
      >
        <Badge tone={statusTone(contract.status)} dot>
          {contract.status}
        </Badge>
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Signature Status</p>
              <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <FileSignature className="size-5 text-muted-foreground" /> {contract.status}
              </p>
            </div>
            <ContractActions
              contractId={contract.id}
              status={contract.status}
              canSend={canManage(user?.role)}
            />
          </div>
          <SignatureTimeline
            status={contract.status}
            sentAt={contract.sentAt}
            signedAt={contract.signedAt}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Terms Snapshot</CardTitle>
              <Badge tone="slate">Frozen from underwriting decision</Badge>
            </CardHeader>
            <CardContent className="pt-3">
              <Term label="Client" value={clientName} />
              <Term label="Advance Amount" value={fmtUSD(centsStr(md.advance_amount_cents))} />
              <Term label="Purchased Amount" value={fmtUSD(centsStr(md.purchased_amount_cents))} />
              <Term label="Factor Rate" value={fmtFactor(md.factor_rate as number)} />
              <Term label="Holdback %" value={fmtPct(md.holdback_pct as number)} />
              <Term label="Remittance Frequency" value={remittance} />
              <Term
                label="Estimated Term"
                value={estTermDays != null ? `${estTermDays} days (estimate)` : "—"}
              />
              <p className="mt-3 text-2xs text-muted-foreground">
                A merchant cash advance is a purchase of future receivables — not a loan. The
                estimated term is a good-faith projection based on remittance pace, not a maturity
                date.
              </p>
            </CardContent>
          </Card>

          {contract.status === "SIGNED" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" /> Signed &amp; Ready to Fund
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-3 text-sm">
                {contract.signedDocumentUrl && (
                  <a
                    href={contract.signedDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <ExternalLink className="size-4" /> View signed document
                  </a>
                )}
                {contract.dealId && (
                  <p className="text-muted-foreground">
                    Deal{" "}
                    <Link href={`/deals/${contract.dealId}`} className="font-medium text-primary hover:underline">
                      {contract.dealId}
                    </Link>{" "}
                    has been created and is ready to fund (Phase 6 EPPS).
                  </p>
                )}
              </CardContent>
            </Card>
          )}
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
