"use client";

import * as React from "react";
import { AlertCircle, UserPlus } from "lucide-react";
import type { LeadStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { moveLead, convertLead } from "@/app/(app)/leads/actions";

// The allowed next statuses for this lead, computed server-side from the state
// machine and passed in (keeps the client thin and the rules single-sourced).
export function LeadStatusControls({
  id,
  status,
  allowedTransitions,
  canConvert,
}: {
  id: string;
  status: LeadStatus;
  allowedTransitions: LeadStatus[];
  canConvert: boolean;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const isTerminal = status === "CONVERTED" || status === "LOST";

  async function handleMove(to: LeadStatus) {
    setError(null);
    setBusy(true);
    const res = await moveLead(id, to);
    if (!res.ok) setError(res.error);
    setBusy(false);
  }

  async function handleConvert() {
    setError(null);
    setBusy(true);
    const res = await convertLead(id);
    if (res && !res.ok) {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isTerminal ? (
        <p className="text-sm text-muted-foreground">
          This lead is {status === "CONVERTED" ? "converted" : "lost"} — no further stage changes.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {allowedTransitions.length === 0 && (
            <p className="text-sm text-muted-foreground">No available transitions.</p>
          )}
          {allowedTransitions.map((to) => (
            <Button
              key={to}
              variant={to === "LOST" ? "outline" : "subtle"}
              size="sm"
              disabled={busy}
              onClick={() => handleMove(to)}
            >
              {to.replace(/_/g, " ")}
            </Button>
          ))}
          {canConvert && (
            <Button variant="accent" size="sm" disabled={busy} onClick={handleConvert}>
              <UserPlus />
              Convert to Client
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
