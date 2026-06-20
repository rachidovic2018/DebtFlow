"use client";

import * as React from "react";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { generate } from "@/app/(app)/contracts/actions";

export interface GenerateOption {
  id: string;
  label: string;
}

// Client affordance to spin up a DRAFT contract. Applications shown are only those
// with an APPROVED underwriting decision (queried server-side). On submit the
// `generate` Server Action creates the DRAFT and redirects to its detail page.
export function GenerateContractForm({
  applications,
  templates,
}: {
  applications: GenerateOption[];
  templates: GenerateOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [applicationId, setApplicationId] = React.useState("");
  const [templateId, setTemplateId] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const disabled = applications.length === 0 || templates.length === 0;

  function submit() {
    setError(null);
    if (!applicationId || !templateId) {
      setError("Pick an approved application and a template.");
      return;
    }
    startTransition(async () => {
      try {
        await generate(applicationId, templateId);
      } catch (e) {
        // redirect() throws NEXT_REDIRECT on success — only surface real errors.
        const msg = e instanceof Error ? e.message : "Could not generate contract.";
        if (!msg.includes("NEXT_REDIRECT")) setError(msg);
      }
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={disabled} size="sm">
        <FilePlus2 className="size-4" /> Generate Contract
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Select
          aria-label="Approved application"
          className="w-56"
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
        >
          <option value="">Approved application…</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Contract template"
          className="w-48"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          <option value="">Template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? "Generating…" : "Create"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
      {disabled && (
        <p className="text-2xs text-muted-foreground">
          {applications.length === 0
            ? "No approved applications awaiting a contract."
            : "Register an active template first."}
        </p>
      )}
      {error && <p className="text-2xs text-rose-600">{error}</p>}
    </div>
  );
}
