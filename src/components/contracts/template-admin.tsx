"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTemplate, toggleTemplate, deleteTemplate } from "@/app/(app)/contracts/actions";

const MAPPING_PLACEHOLDER = `{
  "advance_amount": { "field_api_id": "advance", "readOnly": true },
  "factor_rate": { "field_api_id": "factor" }
}`;

// Admin form to register a ContractTemplate. fieldMapping is a JSON textarea parsed
// server-side. Disabled when the viewer lacks privilege.
export function RegisterTemplateForm({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function action(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createTemplate(formData);
      if (!res.ok) setError(res.error);
      else {
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Only funding ops or admins can register templates.
      </p>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <Input name="name" placeholder="Standard MCA Agreement" required />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">DigiSigner Template ID</span>
          <Input name="digisignerTemplateId" placeholder="tpl_xxx" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Doc Type</span>
          <Input name="docType" placeholder="MCA_AGREEMENT" defaultValue="MCA_AGREEMENT" />
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input type="checkbox" name="isActive" defaultChecked className="size-4 rounded border-input" />
          <span className="text-sm">Active</span>
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Field Mapping (JSON)</span>
        <textarea
          name="fieldMapping"
          rows={5}
          spellCheck={false}
          placeholder={MAPPING_PLACEHOLDER}
          className="w-full rounded-lg border border-input bg-card px-3 py-2 font-mono text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {error && <p className="text-2xs text-rose-600">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        <Plus className="size-4" /> {pending ? "Registering…" : "Register Template"}
      </Button>
    </form>
  );
}

// Active-toggle + delete controls for a template row. Admin-only.
export function TemplateRowActions({
  id,
  isActive,
  canManage,
}: {
  id: string;
  isActive: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  if (!canManage) return null;

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-2xs text-rose-600">{error}</span>}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => toggleTemplate(id, !isActive))}
      >
        <Power className="size-4" /> {isActive ? "Deactivate" : "Activate"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => run(() => deleteTemplate(id))}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
