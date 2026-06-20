"use client";

import * as React from "react";
import Link from "next/link";
import { Search, UserPlus, Users, Activity, DollarSign, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { clients, isActiveStage, STAGE_ORDER } from "@/lib/mock";
import { caseStageTone, riskTone } from "@/lib/status";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/utils";

const RISK_OPTIONS = ["Low", "Medium", "High"] as const;

export default function ClientsPage() {
  const [query, setQuery] = React.useState("");
  const [stage, setStage] = React.useState("all");
  const [risk, setRisk] = React.useState("all");

  // Portfolio stats (computed once over the full roster).
  const stats = React.useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => isActiveStage(c.stage)).length;
    const avgDebt = Math.round(clients.reduce((s, c) => s + c.totalDebt, 0) / total);
    const avgReliability = Math.round(
      clients.reduce((s, c) => s + c.paymentReliability, 0) / total,
    );
    return { total, active, avgDebt, avgReliability };
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (stage !== "all" && c.stage !== stage) return false;
      if (risk !== "all" && c.risk !== risk) return false;
      if (q) {
        const haystack = `${c.fullName} ${c.email} ${c.city}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [query, stage, risk]);

  const shown = filtered.slice(0, 60);

  return (
    <div>
      <PageHeader title="Clients" description="Manage enrolled clients and prospects across the pipeline">
        <Button size="sm">
          <UserPlus /> New Client
        </Button>
      </PageHeader>

      {/* Portfolio stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Clients" value={String(stats.total)} icon={Users} accent="indigo" />
        <StatCard label="Active Programs" value={String(stats.active)} icon={Activity} accent="emerald" hint="signed & in program" />
        <StatCard label="Avg. Debt" value={formatCompactCurrency(stats.avgDebt)} icon={DollarSign} accent="violet" hint="per client" />
        <StatCard label="Avg. Reliability" value={formatPercent(stats.avgReliability)} icon={ShieldCheck} accent="amber" hint="payment adherence" />
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or city…"
            className="pl-9"
          />
        </div>
        <Select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="w-auto min-w-[160px]"
          aria-label="Filter by stage"
        >
          <option value="all">All stages</option>
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          className="w-auto min-w-[140px]"
          aria-label="Filter by risk"
        >
          <option value="all">All risk</option>
          {RISK_OPTIONS.map((r) => (
            <option key={r} value={r}>{r} risk</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5">
          <p className="text-sm font-medium">
            {filtered.length} client{filtered.length === 1 ? "" : "s"}
            {filtered.length > shown.length && (
              <span className="text-muted-foreground"> · showing {shown.length}</span>
            )}
          </p>
        </div>
        <Table>
          <THead>
            <tr>
              <TH>Client</TH>
              <TH>Location</TH>
              <TH>Stage</TH>
              <TH>Risk</TH>
              <TH className="text-right">Total Debt</TH>
              <TH>Reliability</TH>
            </tr>
          </THead>
          <TBody>
            {shown.map((c) => (
              <TR key={c.id} className="cursor-pointer">
                <TD>
                  <Link href={`/clients/${c.id}`} className="flex items-center gap-3">
                    <Avatar size="sm" initials={c.initials} seed={c.id} />
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{c.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </Link>
                </TD>
                <TD className="text-muted-foreground">
                  <Link href={`/clients/${c.id}`} className="block">{c.city}, {c.state}</Link>
                </TD>
                <TD>
                  <Link href={`/clients/${c.id}`} className="block">
                    <Badge tone={caseStageTone(c.stage)} dot>{c.stage}</Badge>
                  </Link>
                </TD>
                <TD>
                  <Link href={`/clients/${c.id}`} className="block">
                    <Badge tone={riskTone(c.risk)}>{c.risk}</Badge>
                  </Link>
                </TD>
                <TD className="text-right font-medium tabular-nums">
                  <Link href={`/clients/${c.id}`} className="block">{formatCurrency(c.totalDebt)}</Link>
                </TD>
                <TD>
                  <Link href={`/clients/${c.id}`} className="flex items-center gap-2">
                    <Progress value={c.paymentReliability} className="h-1.5 w-20" />
                    <span className="text-xs tabular-nums text-muted-foreground">{formatPercent(c.paymentReliability)}</span>
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>

        {shown.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Search className="size-5" />
            </span>
            <p className="text-sm font-medium">No clients found</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Try adjusting your search or clearing the stage and risk filters.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
