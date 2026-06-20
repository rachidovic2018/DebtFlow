"use client";

import * as React from "react";
import { HandCoins, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setPlan } from "@/app/(app)/collections/actions";

interface ExistingPlan {
  holdbackPct?: number;
  reviewCadenceDays?: number;
  note?: string;
}

// Receipts-based recovery plan — holdback % applied against actual receipts, NOT
// a fixed loan schedule. Submitting moves the case to PAYMENT_PLAN via the service.
export function ReceiptsBasedPlanForm({
  caseId,
  existing,
}: {
  caseId: string;
  existing?: ExistingPlan | null;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    const fd = new FormData(e.currentTarget);
    const holdbackPctInput = Number(fd.get("holdbackPct"));
    const reviewCadenceDays = Number(fd.get("reviewCadenceDays"));
    const note = String(fd.get("note") ?? "").trim();

    if (!Number.isFinite(holdbackPctInput) || holdbackPctInput <= 0 || holdbackPctInput > 100)
      return setError("Enter a holdback % between 0 and 100.");
    if (!Number.isFinite(reviewCadenceDays) || reviewCadenceDays <= 0)
      return setError("Enter a review cadence in days.");

    startTransition(async () => {
      try {
        await setPlan(caseId, {
          // Store holdback as a fraction (0.12 = 12%) to match deal terms.
          holdbackPct: holdbackPctInput / 100,
          reviewCadenceDays,
          note: note || undefined,
        });
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not set plan");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          Recovery stays <strong>receipts-based</strong>: the holdback is applied to the merchant&apos;s
          actual receipts. This is never a fixed loan schedule — no interest, no maturity.
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Holdback (% of receipts)</span>
          <Input
            type="number"
            name="holdbackPct"
            min="0"
            max="100"
            step="0.1"
            placeholder="12"
            defaultValue={
              existing?.holdbackPct != null ? +(existing.holdbackPct * 100).toFixed(2) : ""
            }
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Review cadence (days)</span>
          <Input
            type="number"
            name="reviewCadenceDays"
            min="1"
            step="1"
            placeholder="14"
            defaultValue={existing?.reviewCadenceDays ?? ""}
          />
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Note (optional)</span>
        <Input type="text" name="note" placeholder="Context for this plan…" defaultValue={existing?.note ?? ""} />
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          <HandCoins />
          {pending ? "Saving…" : "Set Receipts-Based Plan"}
        </Button>
        {done && <span className="text-xs text-emerald-600">Plan saved.</span>}
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    </form>
  );
}
