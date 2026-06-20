import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { submitDueBatch } from "@/lib/services/epps-batch";

export const dynamic = "force-dynamic";

// EPPS batch windows (12:30 / 2:30 PM Central): submit QUEUED → SUBMITTED.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await submitDueBatch();
  return NextResponse.json({ ok: true, ...result });
}
