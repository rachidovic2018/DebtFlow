import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  delta?: { value: string; direction: "up" | "down"; good?: boolean };
  hint?: string;
  accent?: "indigo" | "emerald" | "amber" | "sky" | "rose" | "violet";
  className?: string;
}

const ICON_TONES: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
  violet: "bg-violet-50 text-violet-600",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  accent = "indigo",
  className,
}: StatCardProps) {
  const deltaGood = delta?.good ?? delta?.direction === "up";
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
        {Icon && (
          <span className={cn("flex size-9 items-center justify-center rounded-lg", ICON_TONES[accent])}>
            <Icon className="size-[18px]" />
          </span>
        )}
      </div>
      {(delta || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                deltaGood ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {delta.direction === "up" ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {delta.value}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
