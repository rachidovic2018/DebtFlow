import { prisma } from "../prisma";
import { writeAudit, logActivity } from "../audit";
import { transitionDeal, transitionApplication } from "./transitions";
import { ensureEnrolled } from "./epps-enrollment";

// Fund a signed deal (CLAUDE.md Phase 6): disburse the advance to the merchant,
// record the company-books outflow, advance Deal PENDING→FUNDED and the
// Application → FUNDED. Enrollment is required before any remittance can queue.
export async function fundDeal(dealId: string, actorId?: string | null) {
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  if (deal.status !== "PENDING") throw new Error(`Deal is ${deal.status}, not fundable`);

  await ensureEnrolled(deal.clientId, actorId);

  await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: { type: "FUNDING_OUTFLOW", status: "CLEARED", amountCents: deal.advanceAmountCents, clientId: deal.clientId, dealId: deal.id },
    });
    await tx.deal.update({ where: { id: deal.id }, data: { fundedAt: new Date() } });
    await writeAudit(tx, { actorId, entityType: "Transaction", entityId: deal.id, action: "FUNDING_OUTFLOW", toValue: deal.advanceAmountCents.toString() });
  });

  await transitionDeal(deal.id, "FUNDED", { actorId, reason: "Advance disbursed" });
  if (deal.applicationId) {
    // Application APPROVED → FUNDED (validated by the state machine).
    try {
      await transitionApplication(deal.applicationId, "FUNDED", { actorId, reason: "Deal funded" });
    } catch {
      /* application may already be FUNDED */
    }
  }
  await logActivity(prisma, { actorId, entityType: "Deal", entityId: deal.id, type: "funded", summary: "Deal funded — remittances will be scheduled" });
  return deal;
}
