import { Plus, Zap, UserPlus, FileSignature, Upload, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { AutomationBuilder } from "@/components/automations/builder";
import { formatNumber } from "@/lib/utils";
import { Workflow, PlayCircle, PauseCircle, Activity } from "lucide-react";

interface AutomationRow {
  name: string;
  trigger: string;
  triggerIcon: LucideIcon;
  actions: number;
  runs: number;
  successRate: number;
  status: "Active" | "Paused";
}

const AUTOMATIONS: AutomationRow[] = [
  { name: "Payment Recovery Flow", trigger: "Payment Failed", triggerIcon: Zap, actions: 3, runs: 1284, successRate: 96, status: "Active" },
  { name: "New Enrollment Onboarding", trigger: "New Enrollment", triggerIcon: UserPlus, actions: 5, runs: 642, successRate: 99, status: "Active" },
  { name: "Contract Signed → Activate", trigger: "Contract Signed", triggerIcon: FileSignature, actions: 4, runs: 489, successRate: 98, status: "Active" },
  { name: "Document Intake Review", trigger: "Document Uploaded", triggerIcon: Upload, actions: 2, runs: 2310, successRate: 94, status: "Active" },
  { name: "High-Risk Retention Outreach", trigger: "Risk = High", triggerIcon: RefreshCw, actions: 4, runs: 173, successRate: 88, status: "Paused" },
];

export default function AutomationsPage() {
  const active = AUTOMATIONS.filter((a) => a.status === "Active").length;
  const totalRuns = AUTOMATIONS.reduce((s, a) => s + a.runs, 0);
  const avgSuccess = Math.round(
    AUTOMATIONS.reduce((s, a) => s + a.successRate, 0) / AUTOMATIONS.length,
  );

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Build no-code workflows that run across your operations"
      >
        <Button variant="outline" size="sm">
          Templates
        </Button>
        <Button size="sm">
          <Plus />
          New Automation
        </Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Workflows" value={String(active)} icon={Workflow} accent="indigo" hint={`${AUTOMATIONS.length} total`} />
        <StatCard label="Runs (30d)" value={formatNumber(totalRuns)} icon={Activity} accent="sky" delta={{ value: "14%", direction: "up" }} hint="vs prior" />
        <StatCard label="Avg Success Rate" value={`${avgSuccess}%`} icon={PlayCircle} accent="emerald" hint="across flows" />
        <StatCard label="Paused" value={String(AUTOMATIONS.length - active)} icon={PauseCircle} accent="amber" hint="needs review" />
      </div>

      <AutomationBuilder />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Your Automations</CardTitle>
          <Button variant="ghost" size="sm">
            Manage
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
          <Table>
            <THead>
              <TR>
                <TH>Automation</TH>
                <TH>Trigger</TH>
                <TH className="text-right">Actions</TH>
                <TH className="text-right">Runs (30d)</TH>
                <TH className="text-right">Success</TH>
                <TH className="text-right">Status</TH>
              </TR>
            </THead>
            <TBody>
              {AUTOMATIONS.map((a) => {
                const TIcon = a.triggerIcon;
                return (
                  <TR key={a.name}>
                    <TD className="font-medium">{a.name}</TD>
                    <TD>
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <TIcon className="size-4 text-slate-400" />
                        {a.trigger}
                      </span>
                    </TD>
                    <TD className="text-right tabular-nums">{a.actions}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(a.runs)}</TD>
                    <TD className="text-right tabular-nums">{a.successRate}%</TD>
                    <TD className="text-right">
                      <Badge tone={a.status === "Active" ? "emerald" : "slate"} dot>
                        {a.status}
                      </Badge>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
