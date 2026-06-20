"use client";

import * as React from "react";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fund } from "@/app/(app)/deals/actions";

// Funds a PENDING deal via the fundDeal service (PENDING → FUNDED, disburses the
// advance, enrolls the client). Shown only while the deal is PENDING.
export function FundDealButton({ dealId }: { dealId: string }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        await fund(dealId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Funding failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-rose-600">{error}</span>}
      <Button size="sm" onClick={onClick} disabled={pending}>
        <Banknote />
        {pending ? "Funding…" : "Fund Deal"}
      </Button>
    </div>
  );
}
