"use client";

import * as React from "react";
import {
  Zap,
  UserPlus,
  FileSignature,
  Upload,
  Filter,
  ShieldAlert,
  GitBranch,
  MessageSquare,
  Mail,
  CheckSquare,
  Bell,
  ArrowUpRight,
  type LucideIcon,
  GripVertical,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ── Category styling (static maps — JIT-safe) ────────────────────
type Category = "trigger" | "condition" | "action";

const CAT_TILE: Record<Category, string> = {
  trigger: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  condition: "bg-amber-50 text-amber-600 ring-amber-100",
  action: "bg-emerald-50 text-emerald-600 ring-emerald-100",
};
const CAT_CHIP: Record<Category, string> = {
  trigger: "hover:border-indigo-300 hover:bg-indigo-50/40",
  condition: "hover:border-amber-300 hover:bg-amber-50/40",
  action: "hover:border-emerald-300 hover:bg-emerald-50/40",
};
const CAT_DOT: Record<Category, string> = {
  trigger: "bg-indigo-500",
  condition: "bg-amber-500",
  action: "bg-emerald-500",
};
const CAT_LABEL: Record<Category, string> = {
  trigger: "Trigger",
  condition: "Condition",
  action: "Action",
};
const CAT_RING: Record<Category, string> = {
  trigger: "ring-indigo-400 border-indigo-300",
  condition: "ring-amber-400 border-amber-300",
  action: "ring-emerald-400 border-emerald-300",
};

interface PaletteItem {
  icon: LucideIcon;
  label: string;
}
const PALETTE: { category: Category; title: string; items: PaletteItem[] }[] = [
  {
    category: "trigger",
    title: "Triggers",
    items: [
      { icon: Zap, label: "Payment Failed" },
      { icon: UserPlus, label: "New Enrollment" },
      { icon: FileSignature, label: "Contract Signed" },
      { icon: Upload, label: "Document Uploaded" },
    ],
  },
  {
    category: "condition",
    title: "Conditions",
    items: [
      { icon: Filter, label: "Amount > X" },
      { icon: ShieldAlert, label: "Risk = High" },
      { icon: GitBranch, label: "Stage is..." },
    ],
  },
  {
    category: "action",
    title: "Actions",
    items: [
      { icon: MessageSquare, label: "Send SMS" },
      { icon: Mail, label: "Send Email" },
      { icon: CheckSquare, label: "Create Task" },
      { icon: Bell, label: "Notify Team" },
      { icon: ArrowUpRight, label: "Update Stage" },
    ],
  },
];

// ── The example flow rendered on the canvas ──────────────────────
interface FlowNode {
  id: string;
  category: Category;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  config: { label: string; value: string }[];
  meta: string;
}

const FLOW: FlowNode[] = [
  {
    id: "trigger",
    category: "trigger",
    icon: Zap,
    title: "Payment Failed",
    subtitle: "When an ACH draft is returned",
    meta: "Trigger",
    config: [
      { label: "Event", value: "payment.failed" },
      { label: "Source", value: "ACH / Bank draft" },
      { label: "Return codes", value: "R01, R02, R09" },
      { label: "Debounce", value: "Once per draft" },
    ],
  },
  {
    id: "sms",
    category: "action",
    icon: MessageSquare,
    title: "Send SMS",
    subtitle: "Notify client of the failed draft",
    meta: "Step 1",
    config: [
      { label: "Template", value: "Payment retry — soft" },
      { label: "To", value: "Client mobile" },
      { label: "Send window", value: "9am – 7pm local" },
      { label: "Provider", value: "Twilio" },
    ],
  },
  {
    id: "task",
    category: "action",
    icon: CheckSquare,
    title: "Create Task",
    subtitle: "Assign retry follow-up to agent",
    meta: "Step 2",
    config: [
      { label: "Queue", value: "Collections" },
      { label: "Assignee", value: "Case owner" },
      { label: "Due", value: "+1 business day" },
      { label: "Priority", value: "High" },
    ],
  },
  {
    id: "notify",
    category: "action",
    icon: Bell,
    title: "Notify Accounting",
    subtitle: "Post to #accounting channel",
    meta: "Step 3",
    config: [
      { label: "Channel", value: "#accounting" },
      { label: "Include", value: "Amount, client, code" },
      { label: "Mention", value: "On-call reviewer" },
      { label: "Escalate after", value: "2 failures" },
    ],
  },
];

function NodeCard({
  node,
  selected,
  onSelect,
}: {
  node: FlowNode;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = node.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-[300px] rounded-xl border bg-card p-4 text-left transition-all",
        selected
          ? cn("ring-2 shadow-sm", CAT_RING[node.category])
          : "border-border hover:border-slate-300 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
            CAT_TILE[node.category],
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("size-1.5 rounded-full", CAT_DOT[node.category])} />
            <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              {node.meta}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold tracking-tight">{node.title}</p>
          <p className="truncate text-xs text-muted-foreground">{node.subtitle}</p>
        </div>
      </div>
      {/* connector port dots */}
      <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-card bg-slate-300" />
      <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-card bg-slate-300" />
    </button>
  );
}

function Connector() {
  return (
    <div className="relative flex h-10 w-[300px] items-center justify-center">
      <svg width="2" height="40" viewBox="0 0 2 40" className="overflow-visible">
        <line x1="1" y1="0" x2="1" y2="40" stroke="#CBD5E1" strokeWidth="2" />
      </svg>
      {/* arrowhead */}
      <svg
        width="12"
        height="8"
        viewBox="0 0 12 8"
        className="absolute bottom-0.5 left-1/2 -translate-x-1/2"
      >
        <path d="M6 8 L0 0 L12 0 Z" fill="#CBD5E1" />
      </svg>
    </div>
  );
}

const DOTTED_BG: React.CSSProperties = {
  backgroundImage: "radial-gradient(#E2E8F0 1px, transparent 1px)",
  backgroundSize: "18px 18px",
  backgroundPosition: "-9px -9px",
};

export function AutomationBuilder() {
  const [selectedId, setSelectedId] = React.useState<string>("trigger");
  const selected = FLOW.find((n) => n.id === selectedId) ?? FLOW[0];
  const SelIcon = selected.icon;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
      {/* ── LEFT palette ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold tracking-tight">Node Library</p>
          <p className="text-xs text-muted-foreground">Drag a block onto the canvas</p>
        </div>
        <div className="space-y-5 p-4">
          {PALETTE.map((group) => (
            <div key={group.category}>
              <div className="mb-2 flex items-center gap-2">
                <span className={cn("size-1.5 rounded-full", CAT_DOT[group.category])} />
                <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </p>
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "flex cursor-grab items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors active:cursor-grabbing",
                        CAT_CHIP[group.category],
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md",
                          CAT_TILE[group.category],
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <GripVertical className="size-3.5 text-slate-300" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CENTER canvas ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold tracking-tight">Payment Recovery Flow</p>
            <Badge tone="emerald" dot>
              Active
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">4 nodes</span>
            <span className="text-slate-300">·</span>
            <span className="tabular-nums">3 actions</span>
          </div>
        </div>
        <div className="relative min-h-[520px] px-6 py-10" style={DOTTED_BG}>
          <div className="flex flex-col items-center">
            {FLOW.map((node, i) => (
              <React.Fragment key={node.id}>
                {i > 0 && <Connector />}
                <NodeCard
                  node={node}
                  selected={node.id === selectedId}
                  onSelect={() => setSelectedId(node.id)}
                />
              </React.Fragment>
            ))}
            {/* end cap */}
            <Connector />
            <div className="flex w-[300px] items-center justify-center rounded-xl border border-dashed border-border bg-card/60 py-3 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-base leading-none">+</span> Add step
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT inspector ──────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Settings2 className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold tracking-tight">Inspector</p>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
                CAT_TILE[selected.category],
              )}
            >
              <SelIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{selected.title}</p>
              <p className="text-xs text-muted-foreground">{CAT_LABEL[selected.category]}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Configuration
            </p>
            {selected.config.map((row) => (
              <div key={row.label} className="space-y-1">
                <label className="text-xs text-muted-foreground">{row.label}</label>
                <div className="flex h-9 items-center rounded-lg border border-input bg-muted/30 px-3 text-sm">
                  {row.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button size="sm" className="w-full">
              Save node
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              Test step
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
