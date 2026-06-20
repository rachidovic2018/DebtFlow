import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/session";
import { runRemittanceScheduler } from "@/lib/services/epps-scheduler";
import { submitDueBatch } from "@/lib/services/epps-batch";
import { syncAndPost } from "@/lib/services/epps-posters";

// DEV-ONLY: run the full EPPS cycle (schedule → batch → sync/post) in one call
// so the flow is testable locally without waiting for the crons.
const SIMULATED = process.env.EPPS_MODE !== "live";

export async function POST(req: Request) {
  if (!SIMULATED) return NextResponse.json({ error: "Disabled in live mode" }, { status: 403 });
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scheduled = await runRemittanceScheduler();
  const batched = await submitDueBatch();
  const posted = await syncAndPost();
  return NextResponse.json({ ok: true, scheduled, batched, posted });
}
