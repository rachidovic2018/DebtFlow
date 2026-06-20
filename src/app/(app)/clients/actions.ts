"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { writeAudit, logActivity } from "@/lib/audit";

/**
 * Add an owner / guarantor Contact to a Client. Ownership % arrives from the
 * form as a percent (e.g. "51" for 51%) and is stored on the Decimal(5,2)
 * column as-is. guaranteeType defaults to PERFORMANCE_VALIDITY (NOT absolute
 * repayment) per MCA rules.
 */
export async function addContact(clientId: string, formData: FormData): Promise<void> {
  const user = await getCurrentUser();

  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) throw new Error("Full name is required.");

  const email = String(formData.get("email") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim() || null;
  const isGuarantor = formData.get("isGuarantor") != null;

  const pctRaw = String(formData.get("ownershipPct") ?? "").trim();
  const pctNum = pctRaw === "" ? NaN : Number(pctRaw.replace(/[%]/g, ""));
  const ownershipPct =
    Number.isFinite(pctNum) && pctNum >= 0 ? pctNum.toFixed(2) : null;

  const contact = await prisma.contact.create({
    data: {
      clientId,
      fullName,
      email,
      title,
      ownershipPct,
      isGuarantor,
      // Default guarantee posture for MCA — performance/validity, not absolute.
      guaranteeType: "PERFORMANCE_VALIDITY",
    },
  });

  await writeAudit(prisma, {
    actorId: user?.id,
    entityType: "Client",
    entityId: clientId,
    action: "ADD_CONTACT",
    toValue: fullName,
    reason: "Contact added",
  });
  await logActivity(prisma, {
    actorId: user?.id,
    entityType: "Client",
    entityId: clientId,
    type: "contact_added",
    summary: `Contact added — ${fullName}${isGuarantor ? " (guarantor)" : ""}`,
    metadata: { contactId: contact.id },
  });

  revalidatePath(`/clients/${clientId}`);
}

/**
 * Update a Client's profile fields (business info + contact). Does NOT change
 * status — status transitions are handled by the dedicated transition service.
 */
export async function updateClient(clientId: string, formData: FormData): Promise<void> {
  const user = await getCurrentUser();

  const legalName = String(formData.get("legalName") ?? "").trim();
  if (!legalName) throw new Error("Legal name is required.");

  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  await prisma.client.update({
    where: { id: clientId },
    data: {
      legalName,
      dba: get("dba"),
      sector: get("sector"),
      businessType: get("businessType"),
      ein: get("ein"),
      phone: get("phone"),
      email: get("email"),
      addressLine1: get("addressLine1"),
      addressLine2: get("addressLine2"),
      city: get("city"),
      state: get("state"),
      postalCode: get("postalCode"),
    },
  });

  await writeAudit(prisma, {
    actorId: user?.id,
    entityType: "Client",
    entityId: clientId,
    action: "UPDATE_PROFILE",
    toValue: legalName,
    reason: "Client profile updated",
  });
  await logActivity(prisma, {
    actorId: user?.id,
    entityType: "Client",
    entityId: clientId,
    type: "profile_updated",
    summary: `Profile updated — ${legalName}`,
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}
