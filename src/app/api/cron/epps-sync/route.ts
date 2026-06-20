import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { syncAndPost } from "@/lib/services/epps-posters";

export const dynamic = "force-dynamic";

// After each batch window: pull statuses; post ledger on CLEARED, open
// collections on RETURNED. The ONLY place the ledger moves.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await syncAndPost();
  return NextResponse.json({ ok: true, ...result });
}
