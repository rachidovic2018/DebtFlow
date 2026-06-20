"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileSignature,
  FileText,
  ShieldCheck,
  Wand2,
  Eye,
  Send,
  Check,
  PenLine,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { docTone } from "@/lib/status";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { ContractTemplate } from "@/lib/mock";

export interface ContractRow {
  id: string;
  template: ContractTemplate;
  status: string;
  createdDate: string;
  sentDate: string | null;
  viewedDate: string | null;
  signedDate: string | null;
  clientId: string;
  clientName: string;
}

export interface SampleClient {
  id: string;
  fullName: string;
  city: string;
  state: string;
  totalDebt: number;
  monthlyPayment: number;
  programMonths: number;
  frequency: string;
  email: string;
}

const TEMPLATES: {
  key: ContractTemplate;
  icon: typeof FileSignature;
  blurb: string;
  tone: string;
}[] = [
  {
    key: "Debt Settlement Agreement",
    icon: FileSignature,
    blurb: "Core agreement enrolling debt into the settlement program.",
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    key: "Service Agreement",
    icon: FileText,
    blurb: "Defines program fees, scope, and the company's obligations.",
    tone: "bg-sky-50 text-sky-600",
  },
  {
    key: "Authorization Agreement",
    icon: ShieldCheck,
    blurb: "ACH draft authorization for the dedicated settlement account.",
    tone: "bg-violet-50 text-violet-600",
  },
];

const STEPS = ["Draft", "Sent", "Viewed", "Signed"] as const;
type Step = (typeof STEPS)[number];

function stepIndexForStatus(status: string): number {
  switch (status) {
    case "Draft":
      return 0;
    case "Sent":
      return 1;
    case "Viewed":
      return 2;
    case "Signed":
      return 3;
    case "Rejected":
      return 2; // viewed then rejected
    default:
      return 0;
  }
}

export function ContractStudio({
  contracts,
  clients,
}: {
  contracts: ContractRow[];
  clients: SampleClient[];
}) {
  const [template, setTemplate] = React.useState<ContractTemplate>(
    "Debt Settlement Agreement",
  );
  const [clientId, setClientId] = React.useState<string>(clients[0]?.id ?? "");
  const [featuredId, setFeaturedId] = React.useState<string>(
    contracts[0]?.id ?? "",
  );

  const client =
    clients.find((c) => c.id === clientId) ?? clients[0];
  const featured =
    contracts.find((c) => c.id === featuredId) ?? contracts[0];

  return (
    <div className="space-y-5">
      {/* Generate experience */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Generate Contract</CardTitle>
            <Badge tone="indigo" dot>
              DigiSigner
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Template</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TEMPLATES.map((t) => {
                  const active = template === t.key;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTemplate(t.key)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        active
                          ? "border-accent bg-accent/[0.05] ring-1 ring-accent"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg",
                          t.tone,
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <p className="mt-2 text-xs font-semibold leading-tight">
                        {t.key}
                      </p>
                      <p className="mt-1 text-2xs leading-snug text-muted-foreground">
                        {t.blurb}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Client</p>
              <Select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — {formatCurrency(c.totalDebt)}
                  </option>
                ))}
              </Select>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button>
                <Wand2 /> Generate Contract
              </Button>
              <Button variant="outline">
                <Eye /> Preview
              </Button>
              <Button variant="accent">
                <Send /> Send for Signature
              </Button>
            </div>
            <p className="text-2xs text-muted-foreground">
              Merge variables are populated from the selected client record and
              previewed live on the right.
            </p>
          </CardContent>
        </Card>

        {/* Live preview */}
        <Card className="bg-muted/30 p-4 xl:col-span-2">
          <ContractPreview template={template} client={client} />
        </Card>
      </div>

      {/* Signature timeline (featured) */}
      <Card>
        <CardHeader>
          <CardTitle>Signature Status</CardTitle>
          <Select
            value={featuredId}
            onChange={(e) => setFeaturedId(e.target.value)}
            className="h-8 w-auto text-xs"
          >
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.template} · {c.clientName}
              </option>
            ))}
          </Select>
        </CardHeader>
        <CardContent>
          {featured && <SignatureTimeline contract={featured} />}
        </CardContent>
      </Card>

      {/* Tracking table */}
      <Card>
        <CardHeader>
          <CardTitle>All Contracts</CardTitle>
          <span className="text-sm text-muted-foreground">
            {contracts.length} total
          </span>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <TH>Contract</TH>
              <TH>Client</TH>
              <TH>Status</TH>
              <TH>Created</TH>
              <TH className="text-right">Signature Progress</TH>
            </tr>
          </THead>
          <TBody>
            {contracts.map((c) => (
              <TR
                key={c.id}
                className="cursor-pointer"
                onClick={() => setFeaturedId(c.id)}
              >
                <TD className="font-medium">{c.template}</TD>
                <TD>
                  <Link
                    href={`/clients/${c.clientId}`}
                    className="text-accent hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c.clientName}
                  </Link>
                </TD>
                <TD>
                  <Badge tone={docTone(c.status)}>{c.status}</Badge>
                </TD>
                <TD className="text-muted-foreground">{formatDate(c.createdDate)}</TD>
                <TD>
                  <MiniTimeline status={c.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function ContractPreview({
  template,
  client,
}: {
  template: ContractTemplate;
  client: SampleClient | undefined;
}) {
  const name = client?.fullName ?? "{{client_name}}";
  const debt = client ? formatCurrency(client.totalDebt) : "{{total_debt}}";
  const draft = client ? formatCurrency(client.monthlyPayment) : "{{monthly_draft}}";
  const months = client?.programMonths ?? 36;

  const bodyByTemplate: Record<ContractTemplate, React.ReactNode> = {
    "Debt Settlement Agreement": (
      <>
        <Clause n={1} title="Enrolled Debt">
          The Client enrolls obligations totaling{" "}
          <Var>{debt}</Var> into the Company&rsquo;s settlement program.
        </Clause>
        <Clause n={2} title="Settlement Authority">
          The Client authorizes the Company to negotiate reductions with enrolled
          creditors on the Client&rsquo;s behalf.
        </Clause>
        <Clause n={3} title="Program Term">
          The estimated program length is <Var>{String(months)} months</Var>.
        </Clause>
      </>
    ),
    "Service Agreement": (
      <>
        <Clause n={1} title="Scope of Services">
          The Company will provide negotiation, account management, and settlement
          services for <Var>{name}</Var>.
        </Clause>
        <Clause n={2} title="Fees">
          Service fees are assessed as a percentage of enrolled debt of{" "}
          <Var>{debt}</Var>, billed only upon successful settlement.
        </Clause>
        <Clause n={3} title="Performance">
          No settlement fee is earned until a creditor agreement is reached and
          approved by the Client.
        </Clause>
      </>
    ),
    "Authorization Agreement": (
      <>
        <Clause n={1} title="ACH Authorization">
          The Client authorizes a recurring{" "}
          <Var>{client?.frequency.toLowerCase() ?? "monthly"}</Var> draft of{" "}
          <Var>{draft}</Var> to a dedicated settlement account.
        </Clause>
        <Clause n={2} title="Account">
          Funds accumulate in an FDIC-insured dedicated account held in the
          Client&rsquo;s name.
        </Clause>
        <Clause n={3} title="Revocation">
          This authorization remains in effect until revoked in writing by the
          Client.
        </Clause>
      </>
    ),
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-indigo-600 text-2xs font-bold text-white">
            DF
          </span>
          <span className="text-xs font-semibold text-slate-900">DebtFlow</span>
        </div>
        <Badge tone="indigo">Preview</Badge>
      </div>
      <div className="px-6 py-5">
        <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-slate-900">
          {template}
        </h3>
        <div className="mx-auto mt-1 h-0.5 w-10 rounded bg-indigo-600" />
        <p className="mt-4 text-2xs leading-relaxed text-slate-600">
          This Agreement is entered into by and between{" "}
          <Var>{name}</Var>
          {client ? (
            <>
              {" "}
              of {client.city}, {client.state}
            </>
          ) : null}{" "}
          and DebtFlow CRM.
        </p>
        <div className="mt-3 space-y-2.5">
          {bodyByTemplate[template]}
        </div>
        <div className="mt-6 border-t border-dashed border-slate-300 pt-3">
          <p className="text-2xs text-slate-400">Signer</p>
          <p className="font-[cursive] text-base text-indigo-700">{name}</p>
          <p className="font-mono text-2xs text-slate-400">
            {client?.email ?? "{{signer_email}}"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Clause({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <p className="text-2xs leading-relaxed text-slate-600">
      <span className="font-semibold text-slate-900">
        {n}. {title}.
      </span>{" "}
      {children}
    </p>
  );
}

function Var({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-indigo-50 px-1 font-medium text-indigo-700">
      {children}
    </span>
  );
}

const STEP_ICON: Record<Step, typeof PenLine> = {
  Draft: PenLine,
  Sent: Send,
  Viewed: Eye,
  Signed: Check,
};

function SignatureTimeline({ contract }: { contract: ContractRow }) {
  const rejected = contract.status === "Rejected";
  const activeIdx = stepIndexForStatus(contract.status);
  const dates: (string | null)[] = [
    contract.createdDate,
    contract.sentDate,
    contract.viewedDate,
    contract.signedDate,
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{contract.template}</span>
        <span className="text-sm text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground">{contract.clientName}</span>
        <Badge tone={docTone(contract.status)}>{contract.status}</Badge>
      </div>

      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done = i < activeIdx;
          const current = i === activeIdx;
          const Icon = STEP_ICON[step];
          const isLast = i === STEPS.length - 1;
          const tone =
            done || (current && contract.status === "Signed")
              ? "border-emerald-500 bg-emerald-500 text-white"
              : current && rejected
                ? "border-rose-500 bg-rose-500 text-white"
                : current
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground";
          const lineDone = i < activeIdx;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 transition-colors",
                    tone,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <p
                  className={cn(
                    "mt-1.5 text-xs font-medium",
                    done || current ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step}
                </p>
                <p className="text-2xs text-muted-foreground">
                  {dates[i] ? formatDate(dates[i] as string) : "—"}
                </p>
              </div>
              {!isLast && (
                <div className="mx-2 mb-8 h-0.5 flex-1 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      lineDone ? "bg-emerald-500" : "bg-muted",
                    )}
                    style={{ width: lineDone ? "100%" : "0%" }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {rejected && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <Clock className="size-4" /> The signer declined this document. A revised
          version can be generated and resent.
        </div>
      )}
      {contract.status === "Signed" && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <ShieldCheck className="size-4" /> Fully executed and stored. A signed
          PDF audit trail is available for download.
        </div>
      )}
    </div>
  );
}

function MiniTimeline({ status }: { status: string }) {
  const activeIdx = stepIndexForStatus(status);
  const rejected = status === "Rejected";
  return (
    <div className="flex items-center justify-end gap-1.5">
      {STEPS.map((step, i) => {
        const reached = i <= activeIdx;
        const tone = !reached
          ? "bg-muted"
          : rejected && i === activeIdx
            ? "bg-rose-500"
            : status === "Signed"
              ? "bg-emerald-500"
              : "bg-accent";
        return (
          <span
            key={step}
            title={step}
            className={cn("h-1.5 w-6 rounded-full transition-colors", tone)}
          />
        );
      })}
    </div>
  );
}
