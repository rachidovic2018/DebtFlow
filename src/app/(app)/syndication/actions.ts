"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { addParticipation, recordDistribution } from "@/lib/services/syndication";
import { toCents } from "@/lib/money";

/**
 * Create a syndication participation on a deal. The participation % arrives as a
 * percent number (e.g. "25" for 25%); the invested amount arrives in dollars and
 * is converted to BigInt cents at the edge.
 */
export async function createParticipation(formData: FormData) {
  const user = await getCurrentUser(); // actor (auth gate)

  const dealId = String(formData.get("dealId") ?? "").trim();
  const investorName = String(formData.get("investorName") ?? "").trim();
  if (!dealId || !investorName) return;

  const pctNum = Number(String(formData.get("participationPct") ?? "").trim());
  const amountNum = Number(String(formData.get("investedAmount") ?? "").trim());
  if (!Number.isFinite(pctNum) || pctNum <= 0) return;
  if (!Number.isFinite(amountNum) || amountNum <= 0) return;

  await addParticipation({
    dealId,
    investorName,
    participationPct: pctNum,
    investedAmountCents: toCents(amountNum),
    actorId: user?.id ?? null,
  });

  revalidatePath("/syndication");
}

/**
 * Record a distribution against a participation. Amount arrives in dollars and is
 * converted to BigInt cents.
 */
export async function distribute(participationId: string, formData: FormData) {
  const user = await getCurrentUser(); // actor (auth gate)

  const amountNum = Number(String(formData.get("amount") ?? "").trim());
  if (!Number.isFinite(amountNum) || amountNum <= 0) return;

  await recordDistribution(participationId, toCents(amountNum), user?.id ?? null);

  revalidatePath("/syndication");
}
