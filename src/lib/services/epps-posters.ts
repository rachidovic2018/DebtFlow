import { prisma } from "../prisma";
import { epps } from "../epps/client";
import { writeAudit, logActivity } from "../audit";
import { transitionDeal } from "./transitions";

// EPPS posters (CLAUDE.md Phase 6 — the spine). The ledger + accounting entries
// post ONLY on confirmed CLEARED settlement. The first cleared payment promotes
// the client to ACTIVE_CLIENT. Returns open a collections case. Fully idempotent
// (each step re-checks the row is still SUBMITTED inside its transaction).
export async function syncAndPost(now: Date = new Date()) {
  const submitted = await prisma.eppsPayment.findMany({
    where: { status: "SUBMITTED", eppsTxnId: { not: null } },
    include: { deal: { include: { client: { select: { status: true } } } } },
  });
  if (submitted.length === 0) return { cleared: 0, returned: 0, promoted: 0, casesOpened: 0, completed: 0 };

  const statuses = await epps.fetchStatuses(submitted.map((p) => p.eppsTxnId!));
  const byTxn = new Map(statuses.map((s) => [s.eppsTxnId, s]));

  let cleared = 0;
  let returned = 0;
  let promoted = 0;
  let casesOpened = 0;
  let completed = 0;

  for (const p of submitted) {
    const s = byTxn.get(p.eppsTxnId!);
    if (!s) continue;

    if (s.status === "CLEARED") {
      const didPromote = await prisma.$transaction(async (tx) => {
        const fresh = await tx.eppsPayment.findUnique({ where: { id: p.id }, select: { status: true } });
        if (fresh?.status !== "SUBMITTED") return false; // already processed
        await tx.eppsPayment.update({ where: { id: p.id }, data: { status: "CLEARED", clearedAt: now } });
        // Ledger moves here, and only here.
        await tx.ledgerEntry.create({ data: { dealId: p.dealId, type: "PAYBACK_COLLECTION", amountCents: p.amountCents, eppsPaymentId: p.id, occurredAt: now } });
        await tx.transaction.create({ data: { type: "CLIENT_PAYMENT", status: "CLEARED", amountCents: p.amountCents, clientId: p.clientId, dealId: p.dealId, eppsPaymentId: p.id, occurredAt: now } });
        await writeAudit(tx, { entityType: "LedgerEntry", entityId: p.id, action: "PAYBACK_COLLECTION", toValue: p.amountCents.toString() });
        // First cleared payment → ACTIVE_CLIENT.
        if (p.deal.client.status !== "ACTIVE_CLIENT") {
          await tx.client.update({ where: { id: p.clientId }, data: { status: "ACTIVE_CLIENT" } });
          await writeAudit(tx, { entityType: "Client", entityId: p.clientId, action: "STATUS_CHANGE", fromValue: p.deal.client.status, toValue: "ACTIVE_CLIENT", reason: "First cleared EPPS payment" });
          return true;
        }
        return false;
      });
      cleared++;
      if (didPromote) promoted++;

      // Fully collected → COMPLETED (outside the posting txn).
      const agg = await prisma.ledgerEntry.aggregate({ where: { dealId: p.dealId, type: "PAYBACK_COLLECTION" }, _sum: { amountCents: true } });
      if ((agg._sum.amountCents ?? 0n) >= p.deal.purchasedAmountCents && p.deal.status === "COLLECTING") {
        await transitionDeal(p.dealId, "COMPLETED", { reason: "Fully collected" });
        completed++;
      }
    } else if (s.status === "RETURNED") {
      const opened = await prisma.$transaction(async (tx) => {
        const fresh = await tx.eppsPayment.findUnique({ where: { id: p.id }, select: { status: true } });
        if (fresh?.status !== "SUBMITTED") return false;
        await tx.eppsPayment.update({ where: { id: p.id }, data: { status: "RETURNED", returnedAt: now, returnCode: s.returnCode ?? "R01" } });
        const open = await tx.collectionsCase.findFirst({ where: { dealId: p.dealId, status: { notIn: ["RESOLVED", "WRITTEN_OFF"] } } });
        if (!open) {
          await tx.collectionsCase.create({ data: { dealId: p.dealId, clientId: p.clientId, status: "OPEN", bucket: "DPD_1_15", openedFromEppsPaymentId: p.id, balanceAtOpenCents: p.amountCents } });
          await logActivity(tx, { entityType: "CollectionsCase", entityId: p.dealId, type: "collections_opened", summary: `Returned payment (${s.returnCode ?? "R01"}) — collections opened` });
          return true;
        }
        return false;
      });
      returned++;
      if (opened) casesOpened++;
    }
  }
  return { cleared, returned, promoted, casesOpened, completed };
}
