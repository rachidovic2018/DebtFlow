"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleRow {
  id: string;
  title: string;
  description: string;
  defaultOn: boolean;
}

const ROWS: ToggleRow[] = [
  {
    id: "failed-ach",
    title: "Failed ACH alerts",
    description: "Notify immediately when a draft is returned or declined",
    defaultOn: true,
  },
  {
    id: "new-enrollment",
    title: "New enrollment",
    description: "When a client completes onboarding and joins a program",
    defaultOn: true,
  },
  {
    id: "contract-signed",
    title: "Contract signed",
    description: "When a settlement or service agreement is e-signed",
    defaultOn: true,
  },
  {
    id: "daily-summary",
    title: "Daily summary",
    description: "A morning digest of collections, drafts, and tasks",
    defaultOn: false,
  },
];

function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        on ? "bg-accent" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function NotificationToggles() {
  const [state, setState] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(ROWS.map((r) => [r.id, r.defaultOn])),
  );

  return (
    <div className="divide-y divide-border">
      {ROWS.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{row.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {row.description}
            </p>
          </div>
          <Switch
            label={row.title}
            on={state[row.id]}
            onToggle={() =>
              setState((s) => ({ ...s, [row.id]: !s[row.id] }))
            }
          />
        </div>
      ))}
    </div>
  );
}
