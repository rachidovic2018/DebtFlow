import Link from "next/link";
import { ArrowRight, Briefcase, DollarSign, Layers, Target } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  clients,
  getAgent,
  getClientCase,
  stageCounts,
  isActiveStage,
  STAGE_ORDER,
} from "@/lib/mock";
import { caseStageTone, riskTone } from "@/lib/status";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/utils";

const MAX_CARDS = 6;

export default function PipelinePage() {
  const counts = stageCounts();
  const byStage = new Map(counts.map((c) => [c.stage, c]));

  const totalValue = counts.reduce((s, c) => s + c.value, 0);
  const totalCases = counts.reduce((s, c) => s + c.count, 0);
  const activeCases = clients.filter((c) => isActiveStage(c.stage)).length;
  const won = byStage.get("Completed")?.count ?? 0;
  const conversion = totalCases ? Math.round((won / totalCases) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Drag-free Kanban across the 8 case stages"
      >
        <Button variant="outline" size="sm">Export</Button>
        <Button size="sm">
          New Case
          <ArrowRight />
        </Button>
      </PageHeader>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pipeline Value"
          value={formatCompactCurrency(totalValue)}
          icon={DollarSign}
          accent="indigo"
          hint="enrolled debt across stages"
        />
        <StatCard
          label="Total Cases"
          value={String(totalCases)}
          icon={Layers}
          accent="violet"
          hint="all stages"
        />
        <StatCard
          label="Active Cases"
          value={String(activeCases)}
          icon={Briefcase}
          accent="sky"
          hint="signed · active · settlement"
        />
        <StatCard
          label="Conversion"
          value={formatPercent(conversion)}
          icon={Target}
          accent="emerald"
          hint={`${won} completed`}
        />
      </div>

      {/* Kanban board */}
      <div className="mt-5 overflow-x-auto pb-4">
        <div className="flex gap-4">
          {STAGE_ORDER.map((stage) => {
            const meta = byStage.get(stage)!;
            const stageClients = clients.filter((c) => c.stage === stage);
            const shown = stageClients.slice(0, MAX_CARDS);
            const overflow = stageClients.length - shown.length;

            return (
              <div
                key={stage}
                className="flex w-[280px] shrink-0 flex-col rounded-xl bg-muted/40 p-3"
              >
                {/* Column header */}
                <div className="mb-3 px-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={caseStageTone(stage)} dot>
                      {stage}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                      {meta.count}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {formatCompactCurrency(meta.value)} value
                  </p>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2.5">
                  {shown.map((client) => {
                    const agent = getAgent(client.agentId);
                    const kase = getClientCase(client.id);
                    return (
                      <Link
                        key={client.id}
                        href={`/clients/${client.id}`}
                        className="group block rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent/40 hover:bg-accent/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight group-hover:text-accent">
                            {client.fullName}
                          </p>
                          <Badge tone={riskTone(client.risk)}>{client.risk}</Badge>
                        </div>
                        {kase && (
                          <p className="mt-1 font-mono text-2xs text-muted-foreground">
                            {kase.caseNumber}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatCurrency(client.totalDebt)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
                            <Avatar
                              size="sm"
                              initials={agent?.initials ?? "··"}
                              seed={agent?.id}
                            />
                            {agent?.firstName}
                          </span>
                        </div>
                      </Link>
                    );
                  })}

                  {overflow > 0 && (
                    <p className="px-1 pt-1 text-xs font-medium text-muted-foreground">
                      +{overflow} more
                    </p>
                  )}

                  {stageClients.length === 0 && (
                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                      No cases
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
