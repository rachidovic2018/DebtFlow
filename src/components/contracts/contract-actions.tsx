"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Eye, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { send } from "@/app/(app)/contracts/actions";
import type { ContractStatus } from "@prisma/client";

// Send-for-signature + DEV simulate controls for the contract detail page.
// "Send" is a Server Action (DRAFT → SENT). Simulate buttons POST the dev route,
// which drives the local DigiSigner events (and, on signed, creates the Deal).
export function ContractActions({
  contractId,
  status,
  canSend,
}: {
  contractId: string;
  status: ContractStatus;
  canSend: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function doSend() {
    setError(null);
    startTransition(async () => {
      const res = await send(contractId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function simulate(event: "viewed" | "signed") {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/dev/contract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractId, event }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? "Simulator failed.");
        } else {
          router.refresh();
        }
      } catch {
        setError("Simulator request failed.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === "DRAFT" && (
          <Button size="sm" onClick={doSend} disabled={pending || !canSend}>
            <Send className="size-4" /> Send for Signature
          </Button>
        )}
        {status === "SENT" && (
          <Button size="sm" variant="outline" onClick={() => simulate("viewed")} disabled={pending}>
            <Eye className="size-4" /> Simulate Viewed
          </Button>
        )}
        {(status === "SENT" || status === "VIEWED") && (
          <Button size="sm" variant="outline" onClick={() => simulate("signed")} disabled={pending}>
            <PenLine className="size-4" /> Simulate Signed
          </Button>
        )}
      </div>
      {status === "DRAFT" && !canSend && (
        <p className="text-2xs text-muted-foreground">
          Only funding ops or admins can send for signature.
        </p>
      )}
      {(status === "SENT" || status === "VIEWED") && (
        <p className="text-2xs text-muted-foreground">Dev: simulate DigiSigner events locally.</p>
      )}
      {error && <p className="text-2xs text-rose-600">{error}</p>}
    </div>
  );
}
