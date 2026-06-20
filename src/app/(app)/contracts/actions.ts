"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { generateContract, sendContract } from "@/lib/services/contracts";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Template management + send are privileged. FUNDER_OPS may operate alongside ADMIN.
function canManage(role?: string | null): boolean {
  return role === "ADMIN" || role === "FUNDER_OPS";
}

// Generate a DRAFT contract from an APPROVED application + template, then jump to
// the new contract. The service freezes a mergedData snapshot matching the decision.
export async function generate(applicationId: string, templateId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!applicationId) throw new Error("An application is required.");
  if (!templateId) throw new Error("A template is required.");

  const contract = await generateContract({ applicationId, templateId, actorId: user?.id });

  revalidatePath("/contracts");
  redirect(`/contracts/${contract.id}`);
}

// Send a DRAFT contract for signature via DigiSigner (DRAFT → SENT). Privileged.
export async function send(contractId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canManage(user?.role)) {
    return { ok: false, error: "Only funding ops or admins can send contracts." };
  }
  try {
    await sendContract(contractId, user?.id);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not send contract." };
  }
}

// Register a ContractTemplate. fieldMapping is entered as JSON and parsed. Admin-only.
export async function createTemplate(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canManage(user?.role)) {
    return { ok: false, error: "Only funding ops or admins can manage templates." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Template name is required." };

  const digisignerTemplateId = String(formData.get("digisignerTemplateId") ?? "").trim() || null;
  const docType = String(formData.get("docType") ?? "").trim() || "MCA_AGREEMENT";
  const isActive = formData.get("isActive") != null;

  const mappingRaw = String(formData.get("fieldMapping") ?? "").trim();
  let fieldMapping: Prisma.InputJsonValue | undefined;
  if (mappingRaw) {
    try {
      fieldMapping = JSON.parse(mappingRaw) as Prisma.InputJsonValue;
    } catch {
      return { ok: false, error: "Field mapping must be valid JSON." };
    }
  }

  try {
    const tpl = await prisma.contractTemplate.create({
      data: { name, digisignerTemplateId, docType, isActive, fieldMapping },
    });
    await writeAudit(prisma, {
      actorId: user?.id,
      entityType: "ContractTemplate",
      entityId: tpl.id,
      action: "CREATE",
      reason: `Template registered — ${name}`,
    });
    revalidatePath("/contracts/templates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not register template." };
  }
}

// Toggle a template active/inactive. Admin-only.
export async function toggleTemplate(id: string, isActive: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canManage(user?.role)) {
    return { ok: false, error: "Only funding ops or admins can manage templates." };
  }
  try {
    await prisma.contractTemplate.update({ where: { id }, data: { isActive } });
    await writeAudit(prisma, {
      actorId: user?.id,
      entityType: "ContractTemplate",
      entityId: id,
      action: "UPDATE",
      toValue: isActive ? "active" : "inactive",
    });
    revalidatePath("/contracts/templates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update template." };
  }
}

// Delete a template (blocked if contracts reference it via FK). Admin-only.
export async function deleteTemplate(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canManage(user?.role)) {
    return { ok: false, error: "Only funding ops or admins can manage templates." };
  }
  try {
    await prisma.contractTemplate.delete({ where: { id } });
    await writeAudit(prisma, {
      actorId: user?.id,
      entityType: "ContractTemplate",
      entityId: id,
      action: "DELETE",
    });
    revalidatePath("/contracts/templates");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Could not delete template — it may be referenced by existing contracts.",
    };
  }
}
