"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { fundDeal } from "@/lib/services/epps-funding";
import { runRemittanceScheduler } from "@/lib/services/epps-scheduler";
import { submitDueBatch } from "@/lib/services/epps-batch";
import { syncAndPost } from "@/lib/services/epps-posters";

// Fund a PENDING deal via the service (never set status directly). The service
// disburses the advance, enrolls the client, and transitions PENDING → FUNDED.
export async function fund(dealId: string) {
  const user = await getCurrentUser();
  await fundDeal(dealId, user?.id ?? null);
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}

export interface CycleResult {
  scheduled: number;
  batched: number;
  posted: number;
}

// Run the full EPPS cycle (schedule → batch → sync/post) locally. Cleared
// payments move the ledger and promote the first-payment client to ACTIVE_CLIENT.
export async function runCycle(): Promise<CycleResult> {
  // Authenticated actor required.
  await getCurrentUser();

  const scheduled = await runRemittanceScheduler();
  const batched = await submitDueBatch();
  const posted = await syncAndPost();

  revalidatePath("/deals");

  return {
    scheduled: scheduled.queued,
    batched: batched.submitted,
    posted: posted.cleared,
  };
}
