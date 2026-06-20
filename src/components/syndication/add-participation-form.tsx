"use client";

import { PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createParticipation } from "@/app/(app)/syndication/actions";

interface DealOption {
  id: string;
  label: string;
}

export function AddParticipationForm({ deals }: { deals: DealOption[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Participation</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={createParticipation}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="space-y-1.5">
            <label htmlFor="dealId" className="text-xs font-medium text-muted-foreground">
              Deal
            </label>
            <Select id="dealId" name="dealId" required defaultValue="">
              <option value="" disabled>
                Select a deal…
              </option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="investorName" className="text-xs font-medium text-muted-foreground">
              Investor
            </label>
            <Input
              id="investorName"
              name="investorName"
              required
              placeholder="Meridian Syndicate"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="participationPct"
              className="text-xs font-medium text-muted-foreground"
            >
              Participation %
            </label>
            <Input
              id="participationPct"
              name="participationPct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              placeholder="25"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="investedAmount"
              className="text-xs font-medium text-muted-foreground"
            >
              Invested ($)
            </label>
            <Input
              id="investedAmount"
              name="investedAmount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="50000"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              <PieChart className="size-4" />
              Add Participation
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
