"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  FileSignature,
  Receipt,
  FileUp,
  Download,
  Send,
  PenLine,
  Calendar,
  User,
  Mail,
  Building2,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { docTone } from "@/lib/status";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Contract, Client } from "@/lib/mock";

type DocCategory = "Contracts" | "Statements" | "Invoices" | "Uploaded Files";

export interface DocItem {
  id: string;
  title: string;
  category: DocCategory;
  typeLabel: string;
  status: string; // Draft | Sent | Viewed | Signed | Rejected
  date: string;
  client: Client | undefined;
  signerEmail: string;
  amount?: number;
  creditor?: string;
  bodyKind: "contract" | "statement" | "invoice" | "upload";
}

const CATEGORY_ICON: Record<DocCategory, typeof FileText> = {
  Contracts: FileSignature,
  Statements: FileText,
  Invoices: Receipt,
  "Uploaded Files": FileUp,
};

const CATEGORY_ICON_TONE: Record<DocCategory, string> = {
  Contracts: "bg-indigo-50 text-indigo-600",
  Statements: "bg-sky-50 text-sky-600",
  Invoices: "bg-violet-50 text-violet-600",
  "Uploaded Files": "bg-amber-50 text-amber-600",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Contracts", label: "Contracts" },
  { key: "Statements", label: "Statements" },
  { key: "Invoices", label: "Invoices" },
  { key: "Uploaded Files", label: "Uploaded" },
];

export function DocumentsCenter({ docs }: { docs: DocItem[] }) {
  const [filter, setFilter] = React.useState<string>("All");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string>(docs[0]?.id ?? "");

  const visible = React.useMemo(() => {
    return docs.filter((d) => {
      const matchCat = filter === "All" || d.category === filter;
      const matchQuery =
        query.trim() === "" ||
        d.title.toLowerCase().includes(query.toLowerCase()) ||
        (d.client?.fullName.toLowerCase().includes(query.toLowerCase()) ?? false);
      return matchCat && matchQuery;
    });
  }, [docs, filter, query]);

  const selected =
    visible.find((d) => d.id === selectedId) ?? visible[0] ?? docs[0];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* LEFT: list ~40% */}
      <Card className="flex flex-col overflow-hidden lg:col-span-2">
        <div className="space-y-3 border-b border-border p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents or clients…"
              className="pl-9"
            />
          </div>
          <div className="inline-flex w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  filter === f.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[640px] flex-1 overflow-y-auto">
          {visible.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No documents match your filters.
            </p>
          )}
          {visible.map((d) => {
            const Icon = CATEGORY_ICON[d.category];
            const active = selected?.id === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0",
                  active ? "bg-accent/[0.06]" : "hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    CATEGORY_ICON_TONE[d.category],
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <Badge tone={docTone(d.status)}>{d.status}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.client?.fullName ?? "—"} · {d.typeLabel}
                  </p>
                  <p className="mt-0.5 text-2xs text-muted-foreground">
                    {formatDate(d.date)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* RIGHT: preview ~60% */}
      <div className="grid grid-cols-1 gap-4 lg:col-span-3 xl:grid-cols-3">
        {selected ? (
          <>
            <div className="xl:col-span-2">
              <DocumentSheet doc={selected} />
            </div>
            <div className="xl:col-span-1">
              <MetadataSidebar doc={selected} />
            </div>
          </>
        ) : (
          <Card className="col-span-full p-10 text-center text-sm text-muted-foreground">
            Select a document to preview.
          </Card>
        )}
      </div>
    </div>
  );
}

function DocumentSheet({ doc }: { doc: DocItem }) {
  const client = doc.client;
  return (
    <Card className="overflow-hidden bg-muted/30 p-4 sm:p-6">
      {/* Faux paper sheet */}
      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-white shadow-sm">
        <div className="border-b border-slate-200 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
                  DF
                </span>
                <span className="text-sm font-semibold tracking-tight text-slate-900">
                  DebtFlow
                </span>
              </div>
              <p className="mt-1 text-2xs text-slate-400">
                Debt Settlement Operations · Houston, TX
              </p>
            </div>
            <div className="text-right text-2xs text-slate-400">
              <p className="font-mono">{doc.id.toUpperCase()}</p>
              <p>{formatDate(doc.date)}</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-7">
          <h2 className="text-center text-lg font-semibold uppercase tracking-wide text-slate-900">
            {doc.title}
          </h2>
          <div className="mx-auto mt-1 h-0.5 w-12 rounded bg-indigo-600" />

          <div className="mt-7 grid grid-cols-2 gap-6 text-xs">
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-400">
                Client
              </p>
              <p className="font-medium text-slate-900">
                {client?.fullName ?? "—"}
              </p>
              <p className="text-slate-500">{client?.email}</p>
              <p className="text-slate-500">
                {client?.city}, {client?.state}
              </p>
            </div>
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-400">
                {doc.bodyKind === "contract" ? "Prepared By" : "Account"}
              </p>
              <p className="font-medium text-slate-900">
                {doc.creditor ?? "DebtFlow CRM"}
              </p>
              <p className="text-slate-500">Case Management Division</p>
              <p className="text-slate-500">documents@debtflow.io</p>
            </div>
          </div>

          <Separator className="my-6 bg-slate-200" />

          <DocumentBody doc={doc} />

          {doc.bodyKind === "contract" && (
            <div className="mt-10 grid grid-cols-2 gap-8">
              <SignatureLine label="Client Signature" name={client?.fullName} signed={doc.status === "Signed"} />
              <SignatureLine label="DebtFlow Representative" name="O. Bennett" signed />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function DocumentBody({ doc }: { doc: DocItem }) {
  const client = doc.client;
  if (doc.bodyKind === "invoice" || doc.bodyKind === "statement") {
    const rows =
      doc.bodyKind === "invoice"
        ? [
            { label: "Program service fee", amount: Math.round((doc.amount ?? 0) * 0.7) },
            { label: "Settlement processing", amount: Math.round((doc.amount ?? 0) * 0.22) },
            { label: "ACH transaction fee", amount: Math.round((doc.amount ?? 0) * 0.08) },
          ]
        : [
            { label: "Opening balance", amount: client?.totalDebt ?? 0 },
            { label: "Payments applied", amount: -Math.round((client?.monthlyPayment ?? 0) * 3) },
            { label: "Settlements credited", amount: -Math.round((doc.amount ?? 0)) },
          ];
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return (
      <div className="text-xs">
        <table className="w-full">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-slate-100">
                <td className="py-2 text-slate-600">{r.label}</td>
                <td className="py-2 text-right font-medium tabular-nums text-slate-900">
                  {formatCurrency(r.amount)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-3 font-semibold text-slate-900">
                {doc.bodyKind === "invoice" ? "Amount Due" : "Current Balance"}
              </td>
              <td className="pt-3 text-right font-semibold tabular-nums text-slate-900">
                {formatCurrency(Math.abs(total))}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-6 leading-relaxed text-slate-500">
          This {doc.bodyKind} reflects activity on the account of{" "}
          {client?.fullName ?? "the client"} as of {formatDate(doc.date)}. Please
          retain for your records. Questions may be directed to your assigned case
          manager.
        </p>
      </div>
    );
  }

  if (doc.bodyKind === "upload") {
    return (
      <div className="text-xs leading-relaxed text-slate-600">
        <p className="mb-3">
          Uploaded supporting document for{" "}
          <span className="font-medium text-slate-900">{client?.fullName}</span>.
          This file was submitted as part of the client&rsquo;s enrollment and
          verification process.
        </p>
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <FileUp className="size-6 text-slate-400" />
          <div>
            <p className="font-medium text-slate-900">{doc.title}</p>
            <p className="text-slate-400">PDF · Verified · {formatDate(doc.date)}</p>
          </div>
        </div>
      </div>
    );
  }

  // contract body
  const total = client?.totalDebt ?? 0;
  return (
    <div className="space-y-3 text-xs leading-relaxed text-slate-600">
      <p>
        This {doc.title} (the &ldquo;Agreement&rdquo;) is entered into as of{" "}
        {formatDate(doc.date)} by and between{" "}
        <span className="font-medium text-slate-900">{client?.fullName}</span> (the
        &ldquo;Client&rdquo;) and DebtFlow CRM (the &ldquo;Company&rdquo;), for the
        purpose of negotiating and settling the Client&rsquo;s enrolled
        obligations.
      </p>
      <p>
        <span className="font-semibold text-slate-900">1. Enrolled Debt.</span> The
        Client enrolls outstanding obligations totaling{" "}
        <span className="font-medium tabular-nums text-slate-900">
          {formatCurrency(total)}
        </span>{" "}
        into the Company&rsquo;s settlement program.
      </p>
      <p>
        <span className="font-semibold text-slate-900">2. Monthly Draft.</span> The
        Client authorizes a recurring {client?.frequency.toLowerCase() ?? "monthly"}{" "}
        draft of{" "}
        <span className="font-medium tabular-nums text-slate-900">
          {formatCurrency(client?.monthlyPayment ?? 0)}
        </span>{" "}
        toward a dedicated settlement account.
      </p>
      <p>
        <span className="font-semibold text-slate-900">3. Term.</span> The program
        term is {client?.programMonths ?? 36} months, subject to successful
        negotiation of enrolled accounts.
      </p>
      <p className="text-slate-400">
        Signed electronically via DigiSigner. Signer:{" "}
        <span className="font-mono">{doc.signerEmail}</span>
      </p>
    </div>
  );
}

function SignatureLine({
  label,
  name,
  signed,
}: {
  label: string;
  name?: string;
  signed: boolean;
}) {
  return (
    <div>
      <div className="flex h-9 items-end">
        {signed ? (
          <span className="font-[cursive] text-lg text-indigo-700">{name}</span>
        ) : (
          <span className="text-2xs text-slate-300">Awaiting signature</span>
        )}
      </div>
      <div className="mt-1 border-t border-slate-300 pt-1">
        <p className="text-2xs uppercase tracking-wide text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function MetadataSidebar({ doc }: { doc: DocItem }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold tracking-tight">Document Details</h3>
      <div className="mt-4 space-y-3 text-sm">
        <MetaRow icon={FileText} label="Type">
          {doc.typeLabel}
        </MetaRow>
        <MetaRow icon={Calendar} label="Status">
          <Badge tone={docTone(doc.status)}>{doc.status}</Badge>
        </MetaRow>
        <MetaRow icon={User} label="Client">
          {doc.client ? (
            <Link
              href={`/clients/${doc.client.id}`}
              className="font-medium text-accent hover:underline"
            >
              {doc.client.fullName}
            </Link>
          ) : (
            "—"
          )}
        </MetaRow>
        <MetaRow icon={Calendar} label="Created">
          {formatDate(doc.date)}
        </MetaRow>
        {doc.creditor && (
          <MetaRow icon={Building2} label="Creditor">
            {doc.creditor}
          </MetaRow>
        )}
        <MetaRow icon={Mail} label="Signer">
          <span className="break-all font-mono text-xs">{doc.signerEmail}</span>
        </MetaRow>
        {doc.amount != null && (
          <MetaRow icon={Receipt} label="Amount">
            <span className="font-medium tabular-nums">
              {formatCurrency(doc.amount)}
            </span>
          </MetaRow>
        )}
      </div>

      <Separator className="my-5" />

      <div className="space-y-2">
        <Button className="w-full">
          <Download /> Download
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline">
            <Send /> Send
          </Button>
          <Button variant="outline" disabled={doc.status === "Signed"}>
            <PenLine /> Sign
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof FileText;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}

// Re-export the contract type so the page can build doc items.
export type { Contract };
