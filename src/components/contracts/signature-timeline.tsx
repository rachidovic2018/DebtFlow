import { FileText, Send, Eye, PenLine, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContractStatus } from "@prisma/client";

// Signature progress stepper: DRAFT → SENT → VIEWED → SIGNED. Steps at or before
// the current status are highlighted as complete; sentAt / signedAt are stamped on
// their steps. VOID / DECLINED are terminal off-ramps shown as a banner.
const STEPS: { status: ContractStatus; label: string; icon: typeof FileText }[] = [
  { status: "DRAFT", label: "Drafted", icon: FileText },
  { status: "SENT", label: "Sent", icon: Send },
  { status: "VIEWED", label: "Viewed", icon: Eye },
  { status: "SIGNED", label: "Signed", icon: PenLine },
];

const ORDER: Record<string, number> = { DRAFT: 0, SENT: 1, VIEWED: 2, SIGNED: 3 };

function fmt(d: Date | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SignatureTimeline({
  status,
  sentAt,
  signedAt,
}: {
  status: ContractStatus;
  sentAt: Date | null;
  signedAt: Date | null;
}) {
  if (status === "VOID" || status === "DECLINED") {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        This contract is {status === "VOID" ? "void" : "declined"} — the signature flow ended.
      </div>
    );
  }

  const current = ORDER[status] ?? 0;

  return (
    <ol className="flex items-stretch">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        const Icon = step.icon;
        const stamp =
          step.status === "SENT" ? fmt(sentAt) : step.status === "SIGNED" ? fmt(signedAt) : null;
        return (
          <li key={step.status} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "h-0.5 flex-1",
                  i === 0 ? "opacity-0" : done ? "bg-emerald-400" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-border bg-card text-muted-foreground",
                  isCurrent && "ring-2 ring-emerald-200",
                )}
              >
                {done && i < current ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              <span
                className={cn(
                  "h-0.5 flex-1",
                  i === STEPS.length - 1 ? "opacity-0" : i < current ? "bg-emerald-400" : "bg-border",
                )}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </p>
            {stamp && <p className="text-2xs text-muted-foreground">{stamp}</p>}
          </li>
        );
      })}
    </ol>
  );
}
