"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, Input } from "@/components/ui/input";

const TYPE_OPTIONS = [
  ["", "All types"],
  ["FUNDING_OUTFLOW", "Funding outflow"],
  ["CLIENT_PAYMENT", "Client payment"],
  ["COMMISSION_PAYOUT", "Commission payout"],
  ["SYNDICATION_DISTRIBUTION", "Syndication distribution"],
  ["FEE", "Fee"],
  ["REFUND", "Refund"],
] as const;

const STATUS_OPTIONS = [
  ["", "All statuses"],
  ["PENDING", "Pending"],
  ["CLEARED", "Cleared"],
  ["RECONCILED", "Reconciled"],
  ["FAILED", "Failed"],
] as const;

/**
 * Filter bar for the company-books ledger. Writes type/status/from/to into the
 * URL searchParams so the server component re-queries Transactions.
 */
export function TransactionFilters({
  type,
  status,
  from,
  to,
}: {
  type?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const hasFilters = Boolean(type || status || from || to);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Type
        <Select
          className="w-48"
          value={type ?? ""}
          onChange={(e) => setParam("type", e.target.value)}
        >
          {TYPE_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Status
        <Select
          className="w-40"
          value={status ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
        >
          {STATUS_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        From
        <Input
          type="date"
          className="w-40"
          defaultValue={from ?? ""}
          onChange={(e) => setParam("from", e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        To
        <Input
          type="date"
          className="w-40"
          defaultValue={to ?? ""}
          onChange={(e) => setParam("to", e.target.value)}
        />
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40"
        >
          Clear
        </button>
      )}
    </div>
  );
}
