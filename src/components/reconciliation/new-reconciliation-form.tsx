"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { create } from "@/app/(app)/reconciliation/actions";

export interface DealOption {
  id: string;
  label: string;
}

// Low-friction reconciliation intake (compliance-critical). A merchant's ACTUAL
// receipts for a period are submitted; the service recomputes owed remittance
// (holdback × receipts) and queues any over-collection credit for review.
export function NewReconciliationForm({ deals }: { deals: DealOption[] }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const dealId = String(fd.get("dealId") ?? "");
    const periodStart = String(fd.get("periodStart") ?? "");
    const periodEnd = String(fd.get("periodEnd") ?? "");
    const reportedReceipts = Number(fd.get("reportedReceipts"));

    if (!dealId) return setError("Select a deal.");
    if (!periodStart || !periodEnd) return setError("Pick a period start and end.");
    if (!Number.isFinite(reportedReceipts) || reportedReceipts < 0)
      return setError("Enter reported receipts.");

    startTransition(async () => {
      try {
        await create({ dealId, periodStart, periodEnd, reportedReceipts });
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission failed");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <label className="space-y-1 text-sm lg:col-span-2">
        <span className="text-xs font-medium text-muted-foreground">Active deal</span>
        <Select name="dealId" defaultValue="">
          <option value="" disabled>
            Select a deal…
          </option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Period start</span>
        <Input type="date" name="periodStart" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Period end</span>
        <Input type="date" name="periodEnd" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Reported receipts ($)</span>
        <Input
          type="number"
          name="reportedReceipts"
          min="0"
          step="0.01"
          placeholder="0.00"
          inputMode="decimal"
        />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
        <Button type="submit" size="sm" disabled={pending || deals.length === 0}>
          <Plus />
          {pending ? "Submitting…" : "New Reconciliation"}
        </Button>
        {deals.length === 0 && (
          <span className="text-xs text-muted-foreground">No active (collecting) deals available.</span>
        )}
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    </form>
  );
}
