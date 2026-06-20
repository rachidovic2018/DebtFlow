import Link from "next/link";
import { ListTodo, Loader, AlertTriangle, CalendarClock, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { tasks, getClient, getAgent } from "@/lib/mock";
import { formatDate } from "@/lib/utils";
import type { Task } from "@/lib/mock";

const TODAY = "2026-06-12";

type Status = "To Do" | "In Progress" | "Done";
type Priority = Task["priority"];

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  Urgent: "rose",
  High: "amber",
  Medium: "slate",
  Low: "slate",
};

const COLUMNS: { status: Status; accent: string }[] = [
  { status: "To Do", accent: "bg-slate-400" },
  { status: "In Progress", accent: "bg-sky-500" },
  { status: "Done", accent: "bg-emerald-500" },
];

export default function TasksPage() {
  const open = tasks.filter((t) => t.status !== "Done").length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const urgent = tasks.filter((t) => t.priority === "Urgent" && t.status !== "Done").length;
  const dueToday = tasks.filter((t) => t.dueDate === TODAY && t.status !== "Done").length;

  return (
    <div>
      <PageHeader title="Tasks" description="Coordinate follow-ups, negotiations, and compliance work across the team">
        <Button size="sm">
          <Plus /> New Task
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open Tasks" value={String(open)} icon={ListTodo} accent="indigo" hint="not yet done" />
        <StatCard label="In Progress" value={String(inProgress)} icon={Loader} accent="sky" hint="being worked" />
        <StatCard label="Urgent" value={String(urgent)} icon={AlertTriangle} accent="rose" hint="needs attention" />
        <StatCard label="Due Today" value={String(dueToday)} icon={CalendarClock} accent="amber" hint="June 12, 2026" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="rounded-xl bg-muted/40 p-3">
              <div className="flex items-center justify-between px-1 py-1.5">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${col.accent}`} />
                  <h2 className="text-sm font-semibold">{col.status}</h2>
                </div>
                <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>

              <div className="mt-1 space-y-2.5">
                {colTasks.map((t) => (
                  <TaskCard key={t.id} task={t} done={col.status === "Done"} />
                ))}
                {colTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({ task, done }: { task: Task; done: boolean }) {
  const client = task.clientId ? getClient(task.clientId) : undefined;
  const agent = getAgent(task.agentId);
  const overdue = !done && task.dueDate < TODAY;
  const dueToday = !done && task.dueDate === TODAY;

  return (
    <Card className="p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium leading-snug ${done ? "text-muted-foreground line-through" : ""}`}>
          {task.title}
        </p>
        <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
      </div>

      {client && (
        <Link
          href={`/clients/${client.id}`}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
        >
          <Avatar size="sm" initials={client.initials} seed={client.id} className="size-5 text-[9px]" />
          {client.fullName}
        </Link>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <span
          className={`inline-flex items-center gap-1 text-xs tabular-nums ${
            overdue ? "font-medium text-rose-600" : dueToday ? "font-medium text-amber-600" : "text-muted-foreground"
          }`}
        >
          <CalendarClock className="size-3.5" />
          {formatDate(task.dueDate)}
          {overdue && " · overdue"}
        </span>
        {agent && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar size="sm" initials={agent.initials} seed={agent.id} className="size-6 text-[9px]" />
          </span>
        )}
      </div>
    </Card>
  );
}
