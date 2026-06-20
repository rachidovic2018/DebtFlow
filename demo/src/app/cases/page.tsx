import { Briefcase, Layers, Handshake, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { CasesTable, type CaseRow } from "@/components/cases/cases-table";
import {
  cases,
  getClient,
  getAgent,
  isActiveStage,
  STAGE_ORDER,
} from "@/lib/mock";

export default function CasesPage() {
  const total = cases.length;
  const active = cases.filter((c) => isActiveStage(c.stage)).length;
  const inSettlement = cases.filter((c) => c.stage === "Settlement").length;
  const completed = cases.filter((c) => c.stage === "Completed").length;

  const rows: CaseRow[] = cases.slice(0, 30).map((c) => {
    const client = getClient(c.clientId);
    const agent = getAgent(c.agentId);
    return {
      id: c.id,
      caseNumber: c.caseNumber,
      clientId: c.clientId,
      clientName: client?.fullName ?? "Unknown",
      clientInitials: client?.initials ?? "··",
      stage: c.stage,
      agentName: agent ? `${agent.firstName} ${agent.lastName}` : "Unassigned",
      openedDate: c.openedDate,
      lastActivity: c.lastActivity,
      value: c.value,
    };
  });

  return (
    <div>
      <PageHeader
        title="Cases"
        description="All debt-settlement cases across the operation"
      >
        <Button variant="outline" size="sm">Export</Button>
        <Button size="sm">New Case</Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Cases" value={String(total)} icon={Layers} accent="indigo" hint="all stages" />
        <StatCard label="Active Cases" value={String(active)} icon={Briefcase} accent="sky" hint="signed · active · settlement" />
        <StatCard label="In Settlement" value={String(inSettlement)} icon={Handshake} accent="amber" hint="negotiating payoffs" />
        <StatCard label="Completed" value={String(completed)} icon={CheckCircle2} accent="emerald" hint="program graduated" />
      </div>

      <div className="mt-5">
        <CasesTable rows={rows} stages={STAGE_ORDER} />
      </div>
    </div>
  );
}
