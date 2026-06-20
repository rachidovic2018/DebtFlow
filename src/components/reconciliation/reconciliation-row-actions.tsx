"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approve, deny } from "@/app/(app)/reconciliation/actions";

// Per-row Approve (applies the over-collection credit by lowering upcoming
// QUEUED debits) and Deny (a stored reason is REQUIRED — submit is blocked while
// empty). Only actionable while the reconciliation is still pending review.
export function ReconciliationRowActions({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();
  const [denying, setDenying] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function onApprove() {
    setError(null);
    startTransition(async () => {
      try {
        await approve(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Approve failed");
      }
    });
  }

  function onDeny() {
    if (!reason.trim()) {
      setError("A denial reason is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deny(id, reason.trim());
        setDenying(false);
        setReason("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Deny failed");
      }
    });
  }

  if (denying) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Denial reason (required)"
            className="h-8 w-56"
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={onDeny}
            disabled={pending || !reason.trim()}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDenying(false);
              setReason("");
              setError(null);
            }}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
        {error && <span className="text-2xs text-rose-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onApprove} disabled={pending}>
          <Check />
          Approve
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDenying(true)}
          disabled={pending}
        >
          <X />
          Deny
        </Button>
      </div>
      {error && <span className="text-2xs text-rose-600">{error}</span>}
    </div>
  );
}
