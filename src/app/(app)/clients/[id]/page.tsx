import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Hash,
  Gauge,
  UserCircle,
  Users2,
  Landmark,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { ClientTabs, type ClientTab } from "@/components/clients/client-tabs";
import { AddContactForm } from "@/components/clients/add-contact-form";
import { prisma } from "@/lib/prisma";
import { fmtUSD, fmtFactor, fmtPct, sumCents } from "@/lib/money";
import { statusTone } from "@/lib/status-tone";
import { maskAccount, decryptField } from "@/lib/crypto";

export const dynamic = "force-dynamic";

function guaranteeLabel(t: string): string {
  return t === "ABSOLUTE" ? "Absolute" : "Performance/Validity";
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value || "—"}</div>
      </div>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      team: { select: { name: true } },
      broker: { select: { name: true } },
      contacts: { orderBy: { createdAt: "asc" } },
      bankAccounts: { orderBy: { createdAt: "asc" } },
      applications: { orderBy: { createdAt: "desc" } },
      creditorRelationships: {
        include: { creditor: { select: { name: true } } },
        orderBy: { balanceCents: "desc" },
      },
      deals: {
        orderBy: { createdAt: "desc" },
        include: {
          ledgerEntries: { select: { type: true, amountCents: true } },
        },
      },
    },
  });

  if (!client) notFound();

  const activities = await prisma.activity.findMany({
    where: { entityType: "Client", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: { select: { name: true } } },
  });

  const totalDebt = sumCents(client.creditorRelationships.map((r) => r.balanceCents));

  // ── Overview tab ─────────────────────────────────────────────────────────
  const address = [
    client.addressLine1,
    client.addressLine2,
    [client.city, client.state].filter(Boolean).join(", "),
    client.postalCode,
  ]
    .filter(Boolean)
    .join(" · ");

  const overview = (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-2 sm:grid-cols-2">
          <InfoRow icon={Building2} label="Legal Name" value={client.legalName} />
          <InfoRow icon={Building2} label="DBA" value={client.dba} />
          <InfoRow icon={Hash} label="Sector" value={client.sector} />
          <InfoRow icon={Hash} label="Business Type" value={client.businessType} />
          <InfoRow icon={Hash} label="EIN" value={client.ein} />
          <InfoRow icon={Mail} label="Email" value={client.email} />
          <InfoRow icon={Phone} label="Phone" value={client.phone} />
          <InfoRow icon={MapPin} label="Address" value={address} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status & Ownership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge tone={statusTone(client.status)}>
              {client.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Client Score</span>
            <span className="font-medium tabular-nums">
              {client.clientScore ?? "—"}
            </span>
          </div>
          <InfoRow icon={UserCircle} label="Owner" value={client.owner?.name} />
          <InfoRow icon={Users2} label="Team" value={client.team?.name} />
          <InfoRow icon={Landmark} label="Broker / ISO" value={client.broker?.name} />
        </CardContent>
      </Card>
    </div>
  );

  // ── Contacts tab ─────────────────────────────────────────────────────────
  const contacts = (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Owners & Guarantors</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {client.contacts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No contacts yet — add one below.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Title</TH>
                  <TH className="text-right">Ownership</TH>
                  <TH>Guarantor</TH>
                  <TH>Guarantee Type</TH>
                </TR>
              </THead>
              <TBody>
                {client.contacts.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <div className="font-medium">{c.fullName}</div>
                      {c.email && (
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      )}
                    </TD>
                    <TD className="text-muted-foreground">{c.title ?? "—"}</TD>
                    <TD className="text-right tabular-nums">
                      {c.ownershipPct != null
                        ? `${Number(c.ownershipPct).toFixed(2)}%`
                        : "—"}
                    </TD>
                    <TD>
                      {c.isGuarantor ? (
                        <Badge tone="indigo">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TD>
                    <TD className="text-muted-foreground">
                      {guaranteeLabel(c.guaranteeType)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Add Contact</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <AddContactForm clientId={client.id} />
        </CardContent>
      </Card>
    </div>
  );

  // ── Creditors tab ────────────────────────────────────────────────────────
  const creditors = (
    <Card>
      <CardHeader>
        <CardTitle>Creditor Relationships</CardTitle>
        <span className="text-sm text-muted-foreground">
          Total debt: <span className="font-medium tabular-nums">{fmtUSD(totalDebt)}</span>
        </span>
      </CardHeader>
      <CardContent className="pt-2">
        {client.creditorRelationships.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No creditor relationships on file.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Creditor</TH>
                <TH className="text-right">Balance</TH>
                <TH className="text-right">Monthly Payment</TH>
              </TR>
            </THead>
            <TBody>
              {client.creditorRelationships.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.creditor.name}</TD>
                  <TD className="text-right tabular-nums">{fmtUSD(r.balanceCents)}</TD>
                  <TD className="text-right tabular-nums">
                    {r.monthlyPaymentCents != null ? fmtUSD(r.monthlyPaymentCents) : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  // ── Deals tab ────────────────────────────────────────────────────────────
  const deals = (
    <Card>
      <CardHeader>
        <CardTitle>Deals</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {client.deals.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No deals yet for this client.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Deal</TH>
                <TH>Status</TH>
                <TH className="text-right">Advance</TH>
                <TH className="text-right">Purchased</TH>
                <TH className="text-right">Factor</TH>
                <TH className="text-right">Holdback</TH>
                <TH className="text-right">Outstanding</TH>
                <TH className="w-40">Collected</TH>
              </TR>
            </THead>
            <TBody>
              {client.deals.map((d) => {
                // Outstanding balance is DERIVED from the ledger, never stored:
                // purchasedAmount − Σ(PAYBACK_COLLECTION).
                const collected = sumCents(
                  d.ledgerEntries
                    .filter((e) => e.type === "PAYBACK_COLLECTION")
                    .map((e) => e.amountCents),
                );
                const outstanding = BigInt(d.purchasedAmountCents) - BigInt(collected);
                const purchasedNum = Number(d.purchasedAmountCents);
                const pct =
                  purchasedNum > 0 ? (Number(collected) / purchasedNum) * 100 : 0;
                return (
                  <TR key={d.id}>
                    <TD>
                      <Link
                        href={`/deals/${d.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {d.id.slice(0, 8)}
                      </Link>
                    </TD>
                    <TD>
                      <Badge tone={statusTone(d.status)}>
                        {d.status.replace(/_/g, " ")}
                      </Badge>
                    </TD>
                    <TD className="text-right tabular-nums">
                      {fmtUSD(d.advanceAmountCents)}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {fmtUSD(d.purchasedAmountCents)}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {fmtFactor(Number(d.factorRate))}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {fmtPct(Number(d.holdbackPct))}
                    </TD>
                    <TD className="text-right tabular-nums">{fmtUSD(outstanding)}</TD>
                    <TD>
                      <Progress value={pct} />
                      <div className="mt-1 text-2xs text-muted-foreground tabular-nums">
                        {fmtUSD(collected)} ({pct.toFixed(0)}%)
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  // ── Applications tab ─────────────────────────────────────────────────────
  const applications = (
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {client.applications.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No applications on file.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Application</TH>
                <TH>Status</TH>
                <TH className="text-right">Requested Amount</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {client.applications.map((a) => (
                <TR key={a.id}>
                  <TD className="font-medium">{a.id.slice(0, 8)}</TD>
                  <TD>
                    <Badge tone={statusTone(a.status)}>
                      {a.status.replace(/_/g, " ")}
                    </Badge>
                  </TD>
                  <TD className="text-right tabular-nums">
                    {a.requestedAmountCents != null
                      ? fmtUSD(a.requestedAmountCents)
                      : "—"}
                  </TD>
                  <TD className="text-muted-foreground">
                    {a.createdAt.toLocaleDateString("en-US")}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  // ── Banking tab ──────────────────────────────────────────────────────────
  // Decrypt server-side only; render last-4 masked.
  const banking = (
    <Card>
      <CardHeader>
        <CardTitle>Bank Accounts</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {client.bankAccounts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No bank accounts on file.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Bank</TH>
                <TH>Account</TH>
                <TH>Type</TH>
                <TH>Primary</TH>
              </TR>
            </THead>
            <TBody>
              {client.bankAccounts.map((b) => {
                let masked = "••••";
                try {
                  masked = maskAccount(decryptField(b.accountNumberEnc));
                } catch {
                  masked = "••••";
                }
                return (
                  <TR key={b.id}>
                    <TD className="font-medium">{b.bankName}</TD>
                    <TD className="tabular-nums">{masked}</TD>
                    <TD className="text-muted-foreground">{b.accountType ?? "—"}</TD>
                    <TD>
                      {b.isPrimary ? (
                        <Badge tone="emerald">Primary</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
  );

  // ── Activity tab ─────────────────────────────────────────────────────────
  const activity = (
    <ActivityTimeline
      items={activities.map((a) => ({
        id: a.id,
        type: a.type,
        summary: a.summary,
        actorName: a.actor?.name ?? null,
        createdAt: a.createdAt,
      }))}
    />
  );

  const tabs: ClientTab[] = [
    { value: "overview", label: "Overview", content: overview },
    { value: "contacts", label: "Contacts", content: contacts },
    { value: "creditors", label: "Creditors", content: creditors },
    { value: "deals", label: "Deals", content: deals },
    { value: "applications", label: "Applications", content: applications },
    { value: "banking", label: "Banking", content: banking },
    { value: "activity", label: "Activity", content: activity },
  ];

  return (
    <div>
      <PageHeader
        title={client.legalName}
        description={
          client.dba
            ? `dba ${client.dba}${client.sector ? ` · ${client.sector}` : ""}`
            : client.sector ?? "Merchant account"
        }
      >
        <Badge tone={statusTone(client.status)}>
          {client.status.replace(/_/g, " ")}
        </Badge>
        {client.clientScore != null && (
          <Badge tone="violet">
            <Gauge className="size-3.5" /> Score {client.clientScore}
          </Badge>
        )}
        <Link href="/clients" className="text-sm text-muted-foreground hover:underline">
          ← All clients
        </Link>
      </PageHeader>

      <ClientTabs tabs={tabs} />
    </div>
  );
}
