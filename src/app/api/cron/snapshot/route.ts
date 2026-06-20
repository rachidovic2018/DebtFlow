import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { computeDashboardSnapshot } from "@/lib/services/snapshots";

export const dynamic = "force-dynamic";

// Precompute dashboard rankings into the Snapshot table (CLAUDE.md Phase 9).
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await computeDashboardSnapshot();
  return NextResponse.json({ ok: true, computedAt: snap.computedAt });
}
