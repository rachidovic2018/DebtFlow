import type { Deal } from "@prisma/client";
import { prisma } from "../prisma";
import { transitionDeal } from "./transitions";
import { ensureEnrolled } from "./epps-enrollment";

// Remittance scheduler (CLAUDE.md Phase 6 — the upstream half). For each active
// deal, queue the next remittance based on holdback/frequency. Daily Vercel Cron.
// Receipts-based estimate: purchased / estimatedTermDays, scaled by frequency.

export function remittanceCents(deal: Pick<Deal, "purchasedAmountCents" | "estimatedTermDays" | "remittanceFrequency">): bigint {
  const daily = Number(deal.purchasedAmountCents) / Math.max(1, deal.estimatedTermDays);
  const mult = deal.remittanceFrequency === "WEEKLY" ? 5 : deal.remittanceFrequency === "MONTHLY" ? 21 : 1;
  return BigInt(Math.max(1, Math.round(daily * mult)));
}

async function collectedCents(dealId: string): Promise<bigint> {
  const agg = await prisma.ledgerEntry.aggregate({
    where: { dealId, type: "PAYBACK_COLLECTION" },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0n;
}

export async function runRemittanceScheduler(now: Date = new Date()) {
  const deals = await prisma.deal.findMany({ where: { status: { in: ["FUNDED", "COLLECTING"] } } });
  let queued = 0;
  let completed = 0;

  for (const deal of deals) {
    await ensureEnrolled(deal.clientId);

    const collected = await collectedCents(deal.id);
    const remaining = deal.purchasedAmountCents - collected;
    if (remaining <= 0n) {
      if (deal.status !== "COMPLETED") {
        await transitionDeal(deal.id, "COMPLETED", { reason: "Fully collected" });
        completed++;
      }
      continue;
    }

    // One in-flight remittance per deal at a time (idempotent scheduling).
    const pending = await prisma.eppsPayment.count({
      where: { dealId: deal.id, status: { in: ["QUEUED", "SUBMITTED"] } },
    });
    if (pending > 0) continue;

    const base = remittanceCents(deal);
    const amount = base < remaining ? base : remaining;

    await prisma.eppsPayment.create({
      data: {
        dealId: deal.id,
        clientId: deal.clientId,
        status: "QUEUED",
        amountCents: amount,
        dueDate: now,
        batchWindow: "12:30CT",
      },
    });
    if (deal.status === "FUNDED") {
      await transitionDeal(deal.id, "COLLECTING", { reason: "First remittance scheduled" });
    }
    queued++;
  }
  return { queued, completed, dealsConsidered: deals.length };
}
