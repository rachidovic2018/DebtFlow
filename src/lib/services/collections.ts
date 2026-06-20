import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { writeAudit, logActivity } from "../audit";
import { transitionCollectionsCase } from "./transitions";

// Collections (CLAUDE.md Phase 7). Cases auto-open from EPPS returns (posters).
// Payment plans must stay RECEIPTS-BASED — never a fixed loan schedule.
export interface ReceiptsBasedPlan {
  holdbackPct: number; // continue holdback against receipts
  note?: string;
  reviewCadenceDays: number;
}

export async function setReceiptsBasedPlan(caseId: string, plan: ReceiptsBasedPlan, actorId?: string | null) {
  await prisma.collectionsCase.update({
    where: { id: caseId },
    data: { paymentPlan: plan as unknown as Prisma.InputJsonValue },
  });
  // Advance the case to PAYMENT_PLAN via the audited transition service.
  await transitionCollectionsCase(caseId, "PAYMENT_PLAN", { actorId, reason: "Receipts-based plan set" });
  await logActivity(prisma, { actorId, entityType: "CollectionsCase", entityId: caseId, type: "payment_plan", summary: "Receipts-based payment plan established" });
}

export async function assignCollectionsCase(caseId: string, userId: string, actorId?: string | null) {
  await prisma.collectionsCase.update({ where: { id: caseId }, data: { assignedToId: userId } });
  await writeAudit(prisma, { actorId, entityType: "CollectionsCase", entityId: caseId, action: "ASSIGN", toValue: userId });
}
