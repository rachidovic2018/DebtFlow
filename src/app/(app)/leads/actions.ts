"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { toCents } from "@/lib/money";
import { transitionLead } from "@/lib/services/transitions";
import { convertLeadToClient } from "@/lib/services/leads";
import { writeAudit, logActivity } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Move a lead one stage along the funnel. The transition service validates
// against the state machine and rejects illegal moves — we surface that error.
export async function moveLead(id: string, toStatus: LeadStatus): Promise<ActionResult> {
  const user = await getCurrentUser();
  try {
    await transitionLead(id, toStatus, { actorId: user?.id });
    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not move lead." };
  }
}

// Convert a qualified lead into a Client account, then redirect to the client.
// On the happy path this throws the Next.js redirect (do not catch it).
export async function convertLead(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  let newClientId: string;
  try {
    const client = await convertLeadToClient(id, user?.id);
    newClientId = client.id;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not convert lead." };
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/clients/${newClientId}`);
}

// Create a new Lead from the New Lead form. Dollars → BigInt cents at the edge.
export async function createLead(formData: FormData): Promise<void> {
  const user = await getCurrentUser();

  const businessName = String(formData.get("businessName") ?? "").trim();
  if (!businessName) throw new Error("Business name is required.");

  const contactName = String(formData.get("contactName") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const source = String(formData.get("source") ?? "").trim() || null;

  const requestedRaw = String(formData.get("requestedAmount") ?? "").trim();
  const requestedDollars = requestedRaw ? Number(requestedRaw.replace(/[$,]/g, "")) : NaN;
  const requestedAmountCents =
    Number.isFinite(requestedDollars) && requestedDollars > 0 ? toCents(requestedDollars) : null;

  const lead = await prisma.lead.create({
    data: {
      businessName,
      contactName,
      email,
      phone,
      source,
      requestedAmountCents,
      ownerId: user?.id ?? null,
    },
  });

  await writeAudit(prisma, {
    actorId: user?.id,
    entityType: "Lead",
    entityId: lead.id,
    action: "CREATE",
    toValue: "NEW",
    reason: "Lead created",
  });
  await logActivity(prisma, {
    actorId: user?.id,
    entityType: "Lead",
    entityId: lead.id,
    type: "created",
    summary: `Lead created — ${businessName}`,
  });

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}
