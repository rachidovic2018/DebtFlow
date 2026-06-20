import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { runRemittanceScheduler } from "@/lib/services/epps-scheduler";

export const dynamic = "force-dynamic";

// Daily: queue the next remittance for each active deal.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runRemittanceScheduler();
  return NextResponse.json({ ok: true, ...result });
}
