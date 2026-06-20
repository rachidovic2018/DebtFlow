"use client";

import * as React from "react";
import { Select } from "@/components/ui/input";
import { assign } from "@/app/(app)/collections/actions";

export interface UserOption {
  id: string;
  name: string;
}

// Assign the case to a user. Changes apply immediately via the audited service.
export function AssignCaseSelect({
  caseId,
  users,
  current,
}: {
  caseId: string;
  users: UserOption[];
  current?: string | null;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const userId = e.target.value;
    if (!userId) return;
    setError(null);
    startTransition(async () => {
      try {
        await assign(caseId, userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Assignment failed");
      }
    });
  }

  return (
    <div className="space-y-1">
      <Select defaultValue={current ?? ""} onChange={onChange} disabled={pending}>
        <option value="" disabled>
          Assign to…
        </option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </Select>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
