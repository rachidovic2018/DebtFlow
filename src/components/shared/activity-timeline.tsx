import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ActivityItem {
  id: string;
  type: string;
  summary: string;
  actorName?: string | null;
  createdAt: Date | string;
}

function fmt(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Reusable activity timeline (CLAUDE.md Phase 3.7) — drop on any record detail.
export function ActivityTimeline({ items, title = "Activity" }: { items: ActivityItem[]; title?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="relative ml-3 border-l border-border">
            {items.map((a) => (
              <li key={a.id} className="mb-5 ml-5">
                <span className="absolute -left-[7px] mt-1 size-3.5 rounded-full border-2 border-card bg-indigo-500" />
                <p className="text-sm font-medium">{a.summary}</p>
                <p className="text-2xs text-muted-foreground">
                  {a.actorName ? `${a.actorName} · ` : ""}
                  {fmt(a.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
