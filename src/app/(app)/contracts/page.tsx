import Link from "next/link";
import { FileText, Send, BadgeCheck, Files, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  GenerateContractForm,
  type GenerateOption,
} from "@/components/contracts/generate-contract-form";
import { prisma } from "@/lib/prisma";
import { fmtUSD } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ContractsPage() {
  const [contracts, approvedApps, templates] = await Promise.all([
    prisma.contract.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        sentAt: true,
        signedAt: true,
        mergedData: true,
        client: { select: { id: true, legalName: true } },
        template: { select: { name: true } },
      },
    }),
    // Applications with an APPROVED underwriting decision are eligible for a contract.
    prisma.application.findMany({
      where: { decisions: { some: { outcome: "APPROVED" } } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        requestedAmountCents: true,
        client: { select: { legalName: true } },
      },
    }),
    prisma.contractTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const drafts = contracts.filter((c) => c.status === "DRAFT").length;
  const outForSignature = contracts.filter(
    (c) => c.status === "SENT" || c.status === "VIEWED",
  ).length;
  const signed = contracts.filter((c) => c.status === "SIGNED").length;
  const total = contracts.length;

  const appOptions: GenerateOption[] = approvedApps.map((a) => ({
    id: a.id,
    label: `${a.client.legalName}${a.requestedAmountCents != null ? ` · ${fmtUSD(a.requestedAmountCents)}` : ""}`,
  }));
  const templateOptions: GenerateOption[] = templates.map((t) => ({ id: t.id, label: t.name }));

  return (
    <div>
      <PageHeader
        title="Contracts"
        description="Receivables-purchase agreements · Draft → Signed"
      >
        <Link href="/contracts/templates">
          <Button size="sm" variant="outline">
            <Settings2 className="size-4" /> Templates
          </Button>
        </Link>
        <GenerateContractForm applications={appOptions} templates={templateOptions} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Drafts" value={String(drafts)} icon={FileText} accent="amber" hint="not yet sent" />
        <StatCard label="Out for Signature" value={String(outForSignature)} icon={Send} accent="sky" hint="sent + viewed" />
        <StatCard label="Signed" value={String(signed)} icon={BadgeCheck} accent="emerald" hint="ready to fund" />
        <StatCard label="Total" value={String(total)} icon={Files} accent="indigo" hint="all contracts" />
      </div>

      <Card className="mt-6">
        {contracts.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No contracts yet. Generate one from an approved application.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Client</TH>
                <TH>Template</TH>
                <TH>Status</TH>
                <TH>Sent</TH>
                <TH>Signed</TH>
                <TH className="text-right">View</TH>
              </TR>
            </THead>
            <TBody>
              {contracts.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link
                      href={`/clients/${c.client.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.client.legalName}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{c.template?.name ?? "—"}</TD>
                  <TD>
                    <Badge tone={statusTone(c.status)} dot>
                      {c.status}
                    </Badge>
                  </TD>
                  <TD className="tabular-nums text-muted-foreground">{fmtDate(c.sentAt)}</TD>
                  <TD className="tabular-nums text-muted-foreground">{fmtDate(c.signedAt)}</TD>
                  <TD className="text-right">
                    <Link href={`/contracts/${c.id}`} className="text-sm text-primary hover:underline">
                      Open
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
