"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runCycle, type CycleResult } from "@/app/(app)/deals/actions";

// Header action: runs the full EPPS cycle (schedule → batch → sync/post) and
// surfaces the resulting counts. Dev-mode convenience for the local flow.
export function RunCycleButton() {
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<CycleResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await runCycle();
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Cycle failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {result && !error && (
        <span className="text-xs text-muted-foreground tabular-nums">
          Scheduled {result.scheduled} · Batched {result.batched} · Posted {result.posted}
        </span>
      )}
      {error && <span className="text-xs text-rose-600">{error}</span>}
      <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
        <RefreshCw className={pending ? "animate-spin" : undefined} />
        {pending ? "Running…" : "Run EPPS Cycle"}
      </Button>
    </div>
  );
}
