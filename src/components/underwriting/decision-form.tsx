"use client";

import * as React from "react";
import { Gavel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { submitDecision } from "@/app/(app)/underwriting/actions";

// Records a versioned underwriting decision. MCA terms ONLY: Factor Rate +
// Holdback %, never an interest rate. Estimated Term is explicitly an ESTIMATE.
export function DecisionForm({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<string>("APPROVED");
  const formRef = React.useRef<HTMLFormElement>(null);

  const showTerms = outcome !== "DECLINED";

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitDecision(applicationId, formData);
      if (!res.ok) setError(res.error);
      else formRef.current?.reset();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="size-4 text-muted-foreground" /> Record Decision
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <form ref={formRef} action={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Outcome</span>
              <Select
                name="outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="APPROVED">Approved</option>
                <option value="COUNTER">Counter</option>
                <option value="DECLINED">Declined</option>
              </Select>
            </label>

            {showTerms && (
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Remittance Frequency</span>
                <Select name="remittanceFrequency" defaultValue="DAILY">
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </Select>
              </label>
            )}
          </div>

          {showTerms && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Approved Amount ($)</span>
                  <Input
                    name="approvedAmount"
                    inputMode="decimal"
                    placeholder="50,000"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Factor Rate</span>
                  <Input
                    name="factorRate"
                    inputMode="decimal"
                    placeholder="1.49"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Holdback %</span>
                  <Input
                    name="holdbackPct"
                    inputMode="decimal"
                    placeholder="12"
                  />
                </label>
              </div>

              <label className="space-y-1.5 sm:max-w-xs">
                <span className="text-sm font-medium">
                  Estimated Term (days) &mdash; estimate
                </span>
                <Input
                  name="estimatedTermDays"
                  inputMode="numeric"
                  placeholder="180"
                />
                <span className="block text-2xs text-muted-foreground">
                  An estimate only — actual term varies with daily receivables.
                </span>
              </label>
            </>
          )}

          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Conditions</span>
            <textarea
              name="conditions"
              rows={3}
              placeholder="Stipulations or conditions for this decision…"
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          {error && <p className="text-2xs text-rose-600">{error}</p>}

          <div className="flex items-center justify-between gap-3">
            <p className="text-2xs text-muted-foreground">
              An APPROVED decision triggers contract generation in the Contracts
              module (Phase 5).
            </p>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Submit Decision"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
