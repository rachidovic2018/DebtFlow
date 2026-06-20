"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startRenewal } from "@/app/(app)/renewals/actions";

// Per-row action: spawns a renewal Application from a >=50%-collected deal and
// redirects to the new application. The server action handles the redirect.
export function StartRenewalButton({ dealId }: { dealId: string }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        await startRenewal(dealId);
      } catch (e) {
        // redirect() throws NEXT_REDIRECT — let it propagate, surface real errors.
        if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
        setError(e instanceof Error ? e.message : "Renewal failed");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-2xs text-rose-600">{error}</span>}
      <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
        <RefreshCw className={pending ? "animate-spin" : undefined} />
        {pending ? "Starting…" : "Start Renewal"}
      </Button>
    </div>
  );
}
