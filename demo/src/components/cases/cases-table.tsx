"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { caseStageTone } from "@/lib/status";
import { formatCurrency, formatDate, relativeDays } from "@/lib/utils";
import type { CaseStage } from "@/lib/mock";

export interface CaseRow {
  id: string;
  caseNumber: string;
  clientId: string;
  clientName: string;
  clientInitials: string;
  stage: CaseStage;
  agentName: string;
  openedDate: string;
  lastActivity: string;
  value: number;
}

function lastActivityLabel(iso: string): string {
  const d = relativeDays(iso);
  if (d === 0) return "Today";
  if (d === -1) return "Yesterday";
  return `${Math.abs(d)}d ago`;
}

export function CasesTable({
  rows,
  stages,
}: {
  rows: CaseRow[];
  stages: CaseStage[];
}) {
  const [query, setQuery] = React.useState("");
  const [stage, setStage] = React.useState<string>("all");

  const filtered = rows.filter((r) => {
    const matchesStage = stage === "all" || r.stage === stage;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === "" ||
      r.clientName.toLowerCase().includes(q) ||
      r.caseNumber.toLowerCase().includes(q) ||
      r.agentName.toLowerCase().includes(q);
    return matchesStage && matchesQuery;
  });

  return (
    <Card>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative flex-1 sm:min-w-[260px] sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search case, client, or agent…"
            className="pl-9"
          />
        </div>
        <Select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="w-auto min-w-[160px]"
        >
          <option value="all">All stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {rows.length} cases
        </span>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Case #</TH>
            <TH>Client</TH>
            <TH>Stage</TH>
            <TH>Assigned</TH>
            <TH>Opened</TH>
            <TH className="text-right">Value</TH>
            <TH>Last Activity</TH>
          </tr>
        </THead>
        <TBody>
          {filtered.length === 0 && (
            <TR>
              <TD colSpan={7} className="py-8 text-center text-muted-foreground">
                No cases match your filters.
              </TD>
            </TR>
          )}
          {filtered.map((r) => (
            <TR key={r.id}>
              <TD className="font-mono text-xs">{r.caseNumber}</TD>
              <TD>
                <Link
                  href={`/clients/${r.clientId}`}
                  className="inline-flex items-center gap-2.5 font-medium hover:text-accent"
                >
                  <Avatar size="sm" initials={r.clientInitials} seed={r.clientId} />
                  {r.clientName}
                </Link>
              </TD>
              <TD>
                <Badge tone={caseStageTone(r.stage)} dot>
                  {r.stage}
                </Badge>
              </TD>
              <TD className="text-muted-foreground">{r.agentName}</TD>
              <TD className="text-muted-foreground">{formatDate(r.openedDate)}</TD>
              <TD className="text-right font-medium tabular-nums">
                {formatCurrency(r.value)}
              </TD>
              <TD className="text-muted-foreground">
                {lastActivityLabel(r.lastActivity)}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
