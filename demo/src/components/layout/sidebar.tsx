"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Briefcase,
  CreditCard,
  FileText,
  CheckSquare,
  Workflow,
  BarChart3,
  ShieldCheck,
  Settings,
  Calculator,
  FileSignature,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  {
    section: "Operations",
    items: [
      { href: "/", label: "Home", icon: LayoutDashboard },
      { href: "/pipeline", label: "Pipeline", icon: GitBranch },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/cases", label: "Cases", icon: Briefcase },
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/documents", label: "Documents", icon: FileText },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
    ],
  },
  {
    section: "Tools",
    items: [
      { href: "/calculator", label: "Calculator", icon: Calculator },
      { href: "/contracts", label: "Contracts", icon: FileSignature },
      { href: "/automations", label: "Automations", icon: Workflow },
    ],
  },
  {
    section: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin", label: "Admin", icon: ShieldCheck },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-[18px]" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">DebtFlow</div>
          <div className="text-2xs text-muted-foreground">Operations Platform</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => (
          <div key={group.section} className="mb-5">
            <div className="px-3 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            OB
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium">Olivia Bennett</div>
            <div className="truncate text-2xs text-muted-foreground">Sales Manager</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
