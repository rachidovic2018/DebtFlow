import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { writeAudit } from "../audit";

// Syndication (CLAUDE.md Phase 7): participations on a deal + distributions.
export async function addParticipation(params: {
  dealId: string;
  investorName: string;
  participationPct: number; // percent, e.g. 25
  investedAmountCents: bigint;
  actorId?: string | null;
}) {
  const p = await prisma.participation.create({
    data: {
      dealId: params.dealId,
      investorName: params.investorName,
      participationPct: params.participationPct,
      investedAmountCents: params.investedAmountCents,
      status: "COMMITTED",
    },
  });
  await writeAudit(prisma, { actorId: params.actorId, entityType: "Participation", entityId: p.id, action: "CREATE", toValue: `${params.participationPct}%` });
  return p;
}

/** Append a distribution event to a participation's distributions log. */
export async function recordDistribution(participationId: string, amountCents: bigint, actorId?: string | null) {
  const part = await prisma.participation.findUniqueOrThrow({ where: { id: participationId } });
  const prev = Array.isArray(part.distributions) ? (part.distributions as unknown[]) : [];
  const next = [...prev, { amountCents: amountCents.toString(), at: new Date().toISOString() }];
  const updated = await prisma.participation.update({
    where: { id: participationId },
    data: { distributions: next as Prisma.InputJsonValue },
  });
  await writeAudit(prisma, { actorId, entityType: "Participation", entityId: participationId, action: "DISTRIBUTION", toValue: amountCents.toString() });
  return updated;
}
