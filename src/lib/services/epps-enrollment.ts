import { prisma } from "../prisma";
import { epps } from "../epps/client";
import { writeAudit } from "../audit";

// Enrollment gate (CLAUDE.md Phase 6): a client must be ENROLLED with EPPS
// before any payment can queue. Handles re-enroll on gateway switch.
export async function ensureEnrolled(clientId: string, actorId?: string | null) {
  const existing = await prisma.eppsEnrollment.findUnique({ where: { clientId } });
  if (existing && existing.status === "ENROLLED") return existing;

  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const { eppsCustomerId } = await epps.enroll({ clientId, legalName: client.legalName });

  const enrollment = await prisma.eppsEnrollment.upsert({
    where: { clientId },
    update: { status: "ENROLLED", eppsCustomerId, enrolledAt: new Date(), gateway: "EPPS" },
    create: { clientId, status: "ENROLLED", eppsCustomerId, enrolledAt: new Date(), gateway: "EPPS" },
  });
  await writeAudit(prisma, { actorId, entityType: "EppsEnrollment", entityId: enrollment.id, action: "ENROLL", toValue: "ENROLLED" });
  return enrollment;
}
