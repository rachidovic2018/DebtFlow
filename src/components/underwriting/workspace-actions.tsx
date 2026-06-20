"use client";

import * as React from "react";
import { Play, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { beginUnderwriting, runAnalysis } from "@/app/(app)/underwriting/actions";

// Header actions for the decision workspace. "Begin Underwriting" only shows when
// the app is in UNDER_REVIEW (the legal precondition for an APPROVED decision).
export function WorkspaceActions({
  applicationId,
  canBegin,
}: {
  applicationId: string;
  canBegin: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {canBegin && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => beginUnderwriting(applicationId))}
          >
            <Play className="size-4" /> Begin Underwriting
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => runAnalysis(applicationId))}
        >
          <ScanLine className="size-4" /> Analyze Statements
        </Button>
      </div>
      {error && <p className="text-2xs text-rose-600">{error}</p>}
    </div>
  );
}
