"use client";

import { signOut } from "next-auth/react";
import { LogOut, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export function Topbar({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-canvas/80 px-8 backdrop-blur">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search leads, clients, payments…"
          className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar size="sm" initials={initials} seed={name} />
          <div className="hidden text-right text-xs leading-tight sm:block">
            <div className="font-medium text-foreground">{name}</div>
            <div className="text-muted-foreground">{role}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
          title="Sign out"
        >
          <LogOut className="size-[18px]" />
        </button>
      </div>
    </header>
  );
}
