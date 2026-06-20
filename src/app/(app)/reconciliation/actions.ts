"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { toCents } from "@/lib/money";
import {
  createReconciliation,
  approveReconciliation,
  denyReconciliation,
} from "@/lib/services/reconciliation";

// Reconciliation is compliance-critical. All mutations go through the service
// (never set status directly); actor is the authenticated user; revalidate.

export async function create(input: {
  dealId: string;
  periodStart: string;
  periodEnd: string;
  reportedReceipts: number;
}) {
  const user = await getCurrentUser();
  await createReconciliation({
    dealId: input.dealId,
    periodStart: new Date(input.periodStart),
    periodEnd: new Date(input.periodEnd),
    reportedReceiptsCents: toCents(input.reportedReceipts),
    actorId: user?.id ?? null,
  });
  revalidatePath("/reconciliation");
}

export async function approve(id: string) {
  const user = await getCurrentUser();
  await approveReconciliation(id, user?.id ?? null);
  revalidatePath("/reconciliation");
}

export async function deny(id: string, reason: string) {
  const user = await getCurrentUser();
  await denyReconciliation(id, reason, user?.id ?? null);
  revalidatePath("/reconciliation");
}
