import { prisma } from "../prisma";
import { writeAudit, logActivity } from "../audit";

// Reconciliation (CLAUDE.md Phase 7 — compliance-critical). A merchant submits
// ACTUAL receipts for a period; we recompute the owed remittance (holdback % ×
// receipts), compare to what was actually collected, and CREDIT any
// over-collection by LOWERING upcoming QUEUED debits. Every step is audited; a
// denial requires a stored reason; an SLA timer is set.

const SLA_DAYS = 3;

export async function createReconciliation(params: {
  dealId: string;
  periodStart: Date;
  periodEnd: Date;
  reportedReceiptsCents: bigint;
  actorId?: string | null;
}) {
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: params.dealId } });

  // Owed remittance for the period = holdback % × reported receipts.
  const recomputed = BigInt(
    Math.round(Number(params.reportedReceiptsCents) * Number(deal.holdbackPct)),
  );
  // What we actually collected (cleared) in the window.
  const collectedAgg = await prisma.ledgerEntry.aggregate({
    where: {
      dealId: params.dealId,
      type: "PAYBACK_COLLECTION",
      occurredAt: { gte: params.periodStart, lte: params.periodEnd },
    },
    _sum: { amountCents: true },
  });
  const collected = collectedAgg._sum.amountCents ?? 0n;
  const overCollection = collected > recomputed ? collected - recomputed : 0n;

  const slaDueAt = new Date();
  slaDueAt.setDate(slaDueAt.getDate() + SLA_DAYS);

  const rec = await prisma.reconciliation.create({
    data: {
      dealId: params.dealId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      reportedReceiptsCents: params.reportedReceiptsCents,
      recomputedRemittanceCents: recomputed,
      overCollectionCreditCents: overCollection,
      status: "PENDING",
      slaDueAt,
    },
  });
  await writeAudit(prisma, { actorId: params.actorId, entityType: "Reconciliation", entityId: rec.id, action: "CREATE", toValue: "PENDING" });
  await logActivity(prisma, { actorId: params.actorId, entityType: "Deal", entityId: params.dealId, type: "reconciliation_submitted", summary: `Reconciliation submitted — over-collection ${(Number(overCollection) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}` });
  return rec;
}

/** Approve: apply the credit by lowering/cancelling upcoming QUEUED debits. */
export async function approveReconciliation(id: string, actorId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const rec = await tx.reconciliation.findUniqueOrThrow({ where: { id } });
    if (rec.status !== "PENDING" && rec.status !== "RECOMPUTED") {
      throw new Error(`Reconciliation is ${rec.status}`);
    }
    let credit = rec.overCollectionCreditCents ?? 0n;

    if (credit > 0n) {
      const queued = await tx.eppsPayment.findMany({
        where: { dealId: rec.dealId, status: "QUEUED" },
        orderBy: { dueDate: "asc" },
      });
      for (const q of queued) {
        if (credit <= 0n) break;
        const reduce = credit < q.amountCents ? credit : q.amountCents;
        const remaining = q.amountCents - reduce;
        if (remaining <= 0n) {
          await tx.eppsPayment.update({ where: { id: q.id }, data: { status: "CANCELLED", amountCents: 0n } });
        } else {
          await tx.eppsPayment.update({ where: { id: q.id }, data: { amountCents: remaining } });
        }
        await writeAudit(tx, { actorId, entityType: "EppsPayment", entityId: q.id, action: "CREDIT_APPLIED", fromValue: q.amountCents.toString(), toValue: remaining.toString(), reason: `Reconciliation ${id}` });
        credit -= reduce;
      }
    }

    const updated = await tx.reconciliation.update({ where: { id }, data: { status: "CREDITED" } });
    await writeAudit(tx, { actorId, entityType: "Reconciliation", entityId: id, action: "STATUS_CHANGE", fromValue: rec.status, toValue: "CREDITED", reason: "Over-collection credited" });
    return updated;
  });
}

/** Deny: a stored reason is REQUIRED. */
export async function denyReconciliation(id: string, reason: string, actorId?: string | null) {
  if (!reason?.trim()) throw new Error("A denial reason is required");
  const updated = await prisma.reconciliation.update({ where: { id }, data: { status: "DENIED", denialReason: reason.trim() } });
  await writeAudit(prisma, { actorId, entityType: "Reconciliation", entityId: id, action: "STATUS_CHANGE", toValue: "DENIED", reason: reason.trim() });
  return updated;
}
