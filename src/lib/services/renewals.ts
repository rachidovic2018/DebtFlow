import { prisma } from "../prisma";
import { writeAudit, logActivity } from "../audit";

// Renewals (CLAUDE.md Phase 7): a deal that's >50% collected can spawn a NEW
// Application linked to the prior deal. Includes a stacking check.
export const RENEWAL_THRESHOLD = 0.5;

export async function renewalProgress(dealId: string) {
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  const agg = await prisma.ledgerEntry.aggregate({
    where: { dealId, type: "PAYBACK_COLLECTION" },
    _sum: { amountCents: true },
  });
  const collected = agg._sum.amountCents ?? 0n;
  const pct = Number(deal.purchasedAmountCents) > 0 ? Number(collected) / Number(deal.purchasedAmountCents) : 0;
  return { collected, purchased: deal.purchasedAmountCents, pct, eligible: pct >= RENEWAL_THRESHOLD };
}

export async function createRenewalApplication(dealId: string, actorId?: string | null) {
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  const { eligible, pct } = await renewalProgress(dealId);
  if (!eligible) throw new Error(`Not eligible for renewal (${Math.round(pct * 100)}% collected, need ${RENEWAL_THRESHOLD * 100}%)`);

  // Stacking check: other active deals on the same client.
  const otherActive = await prisma.deal.count({
    where: { clientId: deal.clientId, status: { in: ["FUNDED", "COLLECTING"] }, id: { not: dealId } },
  });

  const app = await prisma.application.create({
    data: {
      clientId: deal.clientId,
      status: "SUBMITTED",
      requestedAmountCents: deal.advanceAmountCents,
      useOfFunds: "Renewal",
      priorDealId: dealId,
      hasStacking: otherActive > 0,
    },
  });
  await writeAudit(prisma, { actorId, entityType: "Application", entityId: app.id, action: "CREATE", toValue: "SUBMITTED", reason: `Renewal of deal ${dealId}` });
  await logActivity(prisma, { actorId, entityType: "Deal", entityId: dealId, type: "renewal_started", summary: `Renewal application created${otherActive > 0 ? " (stacking flagged)" : ""}` });
  return app;
}
