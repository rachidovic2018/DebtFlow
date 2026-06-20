"use client";

import { HandCoins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { distribute } from "@/app/(app)/syndication/actions";

// Per-row action: append a distribution ($ -> cents) to a participation's log.
export function RecordDistributionForm({ participationId }: { participationId: string }) {
  const action = distribute.bind(null, participationId);
  return (
    <form action={action} className="flex items-center justify-end gap-1.5">
      <Input
        name="amount"
        type="number"
        step="0.01"
        min="0"
        required
        placeholder="$ amount"
        className="h-8 w-28"
        aria-label="Distribution amount"
      />
      <Button type="submit" variant="outline" size="sm">
        <HandCoins className="size-4" />
        Distribute
      </Button>
    </form>
  );
}
