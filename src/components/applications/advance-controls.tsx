"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { advanceApplication } from "@/app/(app)/applications/actions";
import type { ApplicationStatus } from "@prisma/client";

// Status-advance controls. Only legal next states (passed from the server, sourced
// from APPLICATION_TRANSITIONS) are offered. Illegal-transition errors thrown by
// the service are surfaced inline.
export function AdvanceControls({
  applicationId,
  targets,
}: {
  applicationId: string;
  targets: ApplicationStatus[];
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  if (targets.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Terminal state — no further transitions.
      </p>
    );
  }

  function advance(to: ApplicationStatus) {
    setError(null);
    startTransition(async () => {
      const res = await advanceApplication(applicationId, to);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {targets.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={to === "DECLINED" || to === "WITHDRAWN" ? "outline" : "primary"}
            disabled={pending}
            onClick={() => advance(to)}
          >
            <ArrowRight className="size-4" />
            {to.replace(/_/g, " ")}
          </Button>
        ))}
      </div>
      {error && <p className="text-2xs text-rose-600">{error}</p>}
    </div>
  );
}
