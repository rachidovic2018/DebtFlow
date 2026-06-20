"use client";

import * as React from "react";
import { Plus, Check, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusTone } from "@/lib/status-tone";
import { addStip, setStipStatus } from "@/app/(app)/applications/actions";
import type { StipStatus } from "@prisma/client";

export interface StipRow {
  id: string;
  name: string;
  status: StipStatus;
}

// Stip checklist — application progress is gated on stips. Toggle a stip
// REQUESTED ↔ RECEIVED and add new stips. All writes go through Server Actions.
export function StipChecklist({
  applicationId,
  stips,
}: {
  applicationId: string;
  stips: StipRow[];
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");

  const received = stips.filter((s) => s.status === "RECEIVED").length;
  const total = stips.length;

  function toggle(stip: StipRow) {
    setError(null);
    const next: StipStatus = stip.status === "RECEIVED" ? "REQUESTED" : "RECEIVED";
    startTransition(async () => {
      const res = await setStipStatus(stip.id, next);
      if (!res.ok) setError(res.error);
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = name.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await addStip(applicationId, value);
      if (res.ok) setName("");
      else setError(res.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stipulations</CardTitle>
        <Badge tone={received === total && total > 0 ? "emerald" : "amber"}>
          {received}/{total} received
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        <p className="text-xs text-muted-foreground">
          Application progress is gated on stips — underwriting cannot complete
          until required documents are received.
        </p>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {stips.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              No stips requested yet.
            </li>
          )}
          {stips.map((stip) => {
            const isReceived = stip.status === "RECEIVED";
            const toggleable = stip.status === "REQUESTED" || stip.status === "RECEIVED";
            return (
              <li key={stip.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{stip.name}</span>
                  <Badge tone={statusTone(stip.status)}>{stip.status}</Badge>
                </div>
                {toggleable && (
                  <Button
                    size="sm"
                    variant={isReceived ? "outline" : "subtle"}
                    disabled={pending}
                    onClick={() => toggle(stip)}
                  >
                    {isReceived ? (
                      <>
                        <RotateCcw className="size-4" /> Mark requested
                      </>
                    ) : (
                      <>
                        <Check className="size-4" /> Mark received
                      </>
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        <form onSubmit={add} className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a stip (e.g. 4 months bank statements)"
            disabled={pending}
          />
          <Button type="submit" size="sm" variant="primary" disabled={pending || !name.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </form>

        {error && <p className="text-2xs text-rose-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
