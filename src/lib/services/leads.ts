import { prisma } from "../prisma";
import { writeAudit, logActivity } from "../audit";

// Convert a qualified Lead into a Client account (CLAUDE.md Phase 3.2).
// Idempotent: refuses if the lead is already converted. Writes audit + activity.
export async function convertLeadToClient(leadId: string, actorId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId } });
    if (lead.convertedClientId) {
      throw new Error("Lead already converted");
    }
    if (lead.status === "LOST") {
      throw new Error("Cannot convert a lost lead");
    }

    const client = await tx.client.create({
      data: {
        legalName: lead.businessName,
        email: lead.email,
        phone: lead.phone,
        ownerId: lead.ownerId,
        brokerId: lead.brokerId,
        status: "PROSPECT",
      },
    });

    await tx.lead.update({
      where: { id: leadId },
      data: { status: "CONVERTED", convertedClientId: client.id },
    });

    await writeAudit(tx, { actorId, entityType: "Lead", entityId: leadId, action: "STATUS_CHANGE", fromValue: lead.status, toValue: "CONVERTED", reason: "Converted to client" });
    await writeAudit(tx, { actorId, entityType: "Client", entityId: client.id, action: "CREATE", toValue: "PROSPECT", reason: `Converted from lead ${leadId}` });
    await logActivity(tx, { actorId, entityType: "Client", entityId: client.id, type: "created", summary: `Client created from lead ${lead.businessName}` });

    return client;
  });
}
