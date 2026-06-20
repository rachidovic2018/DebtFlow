import { prisma } from "../prisma";
import { epps } from "../epps/client";

// Batch submit (CLAUDE.md Phase 6): flips QUEUED → SUBMITTED only. The ledger
// does NOT move here — it moves on confirmed settlement (see epps-posters).
// EPPS windows are 12:30 / 2:30 PM Central, batch-only.
export async function submitDueBatch(now: Date = new Date()) {
  const due = await prisma.eppsPayment.findMany({
    where: { status: "QUEUED", dueDate: { lte: now } },
  });
  if (due.length === 0) return { submitted: 0 };

  const results = await epps.submitBatch(due.map((p) => ({ paymentId: p.id, amountCents: p.amountCents })));

  let submitted = 0;
  for (const r of results) {
    if (!r.accepted) continue;
    // Idempotent: only flip rows still QUEUED.
    const res = await prisma.eppsPayment.updateMany({
      where: { id: r.paymentId, status: "QUEUED" },
      data: { status: "SUBMITTED", eppsTxnId: r.eppsTxnId, submittedAt: now },
    });
    submitted += res.count;
  }
  return { submitted };
}
