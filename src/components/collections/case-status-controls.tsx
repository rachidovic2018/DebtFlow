"use client";

import * as React from "react";
import type { CollectionsStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { transition } from "@/app/(app)/collections/actions";

// Status controls — offers only the LEGAL next states (from COLLECTIONS_TRANSITIONS
// passed by the server). Each click routes through the audited transition service.
export function CaseStatusControls({
  caseId,
  nextStates,
}: {
  caseId: string;
  nextStates: CollectionsStatus[];
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function go(to: CollectionsStatus) {
    setError(null);
    startTransition(async () => {
      try {
        await transition(caseId, to);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transition failed");
      }
    });
  }

  if (nextStates.length === 0) {
    return <p className="text-sm text-muted-foreground">This case is closed — no further transitions.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {nextStates.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={to === "WRITTEN_OFF" ? "destructive" : "outline"}
            onClick={() => go(to)}
            disabled={pending}
          >
            {to.replace(/_/g, " ")}
          </Button>
        ))}
      </div>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
