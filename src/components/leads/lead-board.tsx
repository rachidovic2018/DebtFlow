"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, UserPlus, AlertCircle } from "lucide-react";
import type { LeadStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtUSD, sumCents } from "@/lib/money";
import { moveLead, convertLead } from "@/app/(app)/leads/actions";

// The open funnel — CONVERTED / LOST are terminal and not working columns.
const FUNNEL: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "APPLICATION_STARTED"];

const COLUMN_LABEL: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  APPLICATION_STARTED: "Application Started",
};

const COLUMN_TONE: Record<string, string> = {
  NEW: "bg-slate-400",
  CONTACTED: "bg-sky-400",
  QUALIFIED: "bg-indigo-400",
  APPLICATION_STARTED: "bg-violet-400",
};

export interface BoardLead {
  id: string;
  businessName: string;
  contactName: string | null;
  score: number | null;
  requestedAmountCents: string | null; // BigInt serialized to string at the edge
  status: LeadStatus;
  ownerName: string | null;
  brokerName: string | null;
}

// Where each stage can advance / retreat within the open funnel.
function nextStage(status: LeadStatus): LeadStatus | null {
  const i = FUNNEL.indexOf(status);
  return i >= 0 && i < FUNNEL.length - 1 ? FUNNEL[i + 1] : null;
}
function prevStage(status: LeadStatus): LeadStatus | null {
  const i = FUNNEL.indexOf(status);
  return i > 0 ? FUNNEL[i - 1] : null;
}

export function LeadBoard({ leads }: { leads: BoardLead[] }) {
  const [error, setError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const byStatus = React.useMemo(() => {
    const map: Record<string, BoardLead[]> = { NEW: [], CONTACTED: [], QUALIFIED: [], APPLICATION_STARTED: [] };
    for (const lead of leads) if (map[lead.status]) map[lead.status].push(lead);
    return map;
  }, [leads]);

  async function handleMove(id: string, to: LeadStatus) {
    setError(null);
    setPendingId(id);
    const res = await moveLead(id, to);
    if (!res.ok) setError(res.error);
    setPendingId(null);
  }

  async function handleConvert(id: string) {
    setError(null);
    setPendingId(id);
    // On success this redirects (no return); on failure it returns an error.
    const res = await convertLead(id);
    if (res && !res.ok) {
      setError(res.error);
      setPendingId(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {FUNNEL.map((status) => {
          const column = byStatus[status] ?? [];
          const total = sumCents(column.map((l) => (l.requestedAmountCents ? BigInt(l.requestedAmountCents) : 0n)));
          return (
            <div key={status} className="flex flex-col rounded-xl border border-border bg-muted/30">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${COLUMN_TONE[status]}`} />
                  <span className="text-sm font-semibold tracking-tight">{COLUMN_LABEL[status]}</span>
                  <span className="rounded-full bg-card px-2 py-0.5 text-2xs font-medium tabular-nums text-muted-foreground">
                    {column.length}
                  </span>
                </div>
                <span className="text-2xs font-medium tabular-nums text-muted-foreground">{fmtUSD(total)}</span>
              </div>

              <div className="flex flex-col gap-3 p-3">
                {column.length === 0 && (
                  <p className="py-6 text-center text-2xs text-muted-foreground">No leads</p>
                )}
                {column.map((lead) => {
                  const prev = prevStage(lead.status);
                  const next = nextStage(lead.status);
                  const canConvert = lead.status === "QUALIFIED" || lead.status === "APPLICATION_STARTED";
                  const busy = pendingId === lead.id;
                  return (
                    <div key={lead.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/leads/${lead.id}`} className="text-sm font-medium hover:underline">
                          {lead.businessName}
                        </Link>
                        {lead.score != null && (
                          <Badge tone="indigo" className="shrink-0">
                            {lead.score}
                          </Badge>
                        )}
                      </div>
                      {lead.contactName && (
                        <p className="mt-0.5 text-2xs text-muted-foreground">{lead.contactName}</p>
                      )}
                      <p className="mt-2 text-sm font-semibold tabular-nums">
                        {lead.requestedAmountCents ? fmtUSD(BigInt(lead.requestedAmountCents)) : "—"}
                      </p>
                      <div className="mt-1 flex flex-col gap-0.5 text-2xs text-muted-foreground">
                        <span>Owner: {lead.ownerName ?? "Unassigned"}</span>
                        <span>Broker: {lead.brokerName ?? "Direct"}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!prev || busy}
                          title={prev ? `Move to ${COLUMN_LABEL[prev]}` : "Already at first stage"}
                          onClick={() => prev && handleMove(lead.id, prev)}
                        >
                          <ArrowLeft />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!next || busy}
                          title={next ? `Move to ${COLUMN_LABEL[next]}` : "Last open stage"}
                          onClick={() => next && handleMove(lead.id, next)}
                        >
                          <ArrowRight />
                        </Button>
                        {canConvert && (
                          <Button
                            variant="accent"
                            size="sm"
                            className="ml-auto h-7"
                            disabled={busy}
                            onClick={() => handleConvert(lead.id)}
                          >
                            <UserPlus />
                            Convert
                          </Button>
                        )}
                      </div>
                    </div>
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
