"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Magnet,
  Building2,
  Users,
  FileSearch,
  ClipboardCheck,
  FileSignature,
  Banknote,
  Landmark,
  Scale,
  AlertTriangle,
  PieChart,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  {
    section: "Origination",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/leads", label: "Leads", icon: Magnet },
      { href: "/brokers", label: "Brokers / ISO", icon: Building2 },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/applications", label: "Applications", icon: FileSearch },
    ],
  },
  {
    section: "Deal Flow",
    items: [
      { href: "/underwriting", label: "Underwriting", icon: ClipboardCheck },
      { href: "/contracts", label: "Contracts", icon: FileSignature },
      { href: "/deals", label: "Deals", icon: Banknote },
      { href: "/renewals", label: "Renewals", icon: RefreshCw },
      { href: "/syndication", label: "Syndication", icon: Users2 },
      { href: "/creditors", label: "Creditors", icon: Landmark },
    ],
  },
  {
    section: "Servicing",
    items: [
      { href: "/reconciliation", label: "Reconciliation", icon: Scale },
      { href: "/collections", label: "Collections", icon: AlertTriangle },
      { href: "/accounting", label: "Accounting", icon: PieChart },
    ],
  },
  {
    section: "Admin",
    items: [{ href: "/admin", label: "Admin", icon: ShieldCheck }],
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
          <div className="text-sm font-semibold tracking-tight">Capital Flow</div>
          <div className="text-2xs text-muted-foreground">MCA Operations</div>
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
    </aside>
  );
}
