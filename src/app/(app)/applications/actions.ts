"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ApplicationStatus, StipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { toCents } from "@/lib/money";
import { transitionApplication } from "@/lib/services/transitions";
import { writeAudit, logActivity } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Advance an application one stage. The transition service validates against the
// state machine (APPLICATION_TRANSITIONS) and writes audit + activity — illegal
// moves throw and we surface the message to the UI.
export async function advanceApplication(
  id: string,
  toStatus: ApplicationStatus,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  try {
    await transitionApplication(id, toStatus, { actorId: user?.id });
    revalidatePath("/applications");
    revalidatePath(`/applications/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not advance application." };
  }
}

// Add a stip (stipulation) to an application. Stips are a checklist — not a state
// machine — so this is a direct write, still via a Server Action + audit trail.
export async function addStip(applicationId: string, name: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Stip name is required." };
  try {
    const stip = await prisma.stip.create({
      data: { applicationId, name: trimmed, status: "REQUESTED" },
    });
    await logActivity(prisma, {
      actorId: user?.id,
      entityType: "Application",
      entityId: applicationId,
      type: "stip_added",
      summary: `Stip requested — ${trimmed}`,
    });
    await writeAudit(prisma, {
      actorId: user?.id,
      entityType: "Stip",
      entityId: stip.id,
      action: "CREATE",
      toValue: "REQUESTED",
      reason: `Stip added to application ${applicationId}`,
    });
    revalidatePath(`/applications/${applicationId}`);
    revalidatePath("/applications");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add stip." };
  }
}

// Set a stip's status directly (REQUESTED ↔ RECEIVED, or WAIVED/REJECTED).
// Toggling to RECEIVED stamps receivedAt; clearing it back nulls it out.
export async function setStipStatus(stipId: string, status: StipStatus): Promise<ActionResult> {
  const user = await getCurrentUser();
  try {
    const cur = await prisma.stip.findUniqueOrThrow({
      where: { id: stipId },
      select: { status: true, name: true, applicationId: true },
    });
    const updated = await prisma.stip.update({
      where: { id: stipId },
      data: {
        status,
        receivedAt: status === "RECEIVED" ? new Date() : null,
      },
    });
    await logActivity(prisma, {
      actorId: user?.id,
      entityType: "Application",
      entityId: cur.applicationId,
      type: "stip_status_change",
      summary: `Stip ${cur.name}: ${cur.status} → ${status}`,
    });
    await writeAudit(prisma, {
      actorId: user?.id,
      entityType: "Stip",
      entityId: stipId,
      action: "STATUS_CHANGE",
      fromValue: cur.status,
      toValue: status,
    });
    revalidatePath(`/applications/${updated.applicationId}`);
    revalidatePath("/applications");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update stip." };
  }
}

// Create a new Application for a client. Requested amount is entered in dollars
// and converted to BigInt cents at the edge. Redirects to the new detail page.
export async function createApplication(clientId: string, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!clientId) throw new Error("A client is required.");

  const requestedRaw = String(formData.get("requestedAmount") ?? "").trim();
  const requestedDollars = requestedRaw ? Number(requestedRaw.replace(/[$,]/g, "")) : NaN;
  const requestedAmountCents =
    Number.isFinite(requestedDollars) && requestedDollars > 0 ? toCents(requestedDollars) : null;

  const useOfFunds = String(formData.get("useOfFunds") ?? "").trim() || null;

  const app = await prisma.application.create({
    data: {
      clientId,
      requestedAmountCents,
      useOfFunds,
      ownerId: user?.id ?? null,
      status: "SUBMITTED",
    },
  });

  await writeAudit(prisma, {
    actorId: user?.id,
    entityType: "Application",
    entityId: app.id,
    action: "CREATE",
    toValue: "SUBMITTED",
    reason: "Application created",
  });
  await logActivity(prisma, {
    actorId: user?.id,
    entityType: "Application",
    entityId: app.id,
    type: "created",
    summary: "Application submitted",
  });

  revalidatePath("/applications");
  redirect(`/applications/${app.id}`);
}
