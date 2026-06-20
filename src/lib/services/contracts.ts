import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { writeAudit, logActivity } from "../audit";
import { transitionContract } from "./transitions";
import { digisigner } from "../digisigner";

// Contracts (CLAUDE.md Phase 5). Prefill from the APPROVED UnderwritingDecision —
// the prefilled terms MUST match the decision; mergedData is the audit snapshot.
// No loan/interest fields.

/** Create a DRAFT contract with a frozen mergedData snapshot from the decision. */
export async function generateContract(
  params: { applicationId: string; templateId: string; actorId?: string | null },
) {
  const app = await prisma.application.findUniqueOrThrow({
    where: { id: params.applicationId },
    include: { client: true, decisions: { orderBy: { version: "desc" } } },
  });
  const decision = app.decisions.find((d) => d.outcome === "APPROVED");
  if (!decision) throw new Error("No approved underwriting decision to contract");
  if (!decision.approvedAmountCents || !decision.factorRate) {
    throw new Error("Approved decision is missing terms");
  }

  // Audit snapshot — exact prefilled terms (receivables purchase, not a loan).
  const mergedData: Prisma.InputJsonValue = {
    client_name: app.client.legalName,
    advance_amount_cents: decision.approvedAmountCents.toString(),
    purchased_amount_cents: (decision.paybackAmountCents ?? 0n).toString(),
    factor_rate: Number(decision.factorRate),
    holdback_pct: Number(decision.holdbackPct ?? 0),
    remittance_frequency: decision.remittanceFrequency ?? "DAILY",
    estimated_term_days: decision.estimatedTermDays ?? null,
  };

  const contract = await prisma.contract.create({
    data: {
      clientId: app.clientId,
      applicationId: app.id,
      underwritingDecisionId: decision.id,
      templateId: params.templateId,
      status: "DRAFT",
      mergedData,
    },
  });
  await writeAudit(prisma, { actorId: params.actorId, entityType: "Contract", entityId: contract.id, action: "CREATE", toValue: "DRAFT" });
  await logActivity(prisma, { actorId: params.actorId, entityType: "Application", entityId: app.id, type: "contract_drafted", summary: `Contract drafted for ${app.client.legalName}` });
  return contract;
}

/** Send a DRAFT contract for signature via DigiSigner; advances to SENT. */
export async function sendContract(contractId: string, actorId?: string | null) {
  const contract = await prisma.contract.findUniqueOrThrow({
    where: { id: contractId },
    include: { template: true, client: true },
  });
  if (!contract.client.email) throw new Error("Client has no signer email");

  const { requestId } = await digisigner.sendFromTemplate({
    templateId: contract.template?.digisignerTemplateId ?? contract.templateId ?? "tpl_default",
    signerEmail: contract.client.email,
    signerName: contract.client.legalName,
    fields: (contract.mergedData as Record<string, unknown>) ?? {},
  });

  await prisma.contract.update({
    where: { id: contractId },
    data: { digisignerRequestId: requestId, sentAt: new Date() },
  });
  await transitionContract(contractId, "SENT", { actorId, reason: "Sent for signature" });
  return { requestId };
}

/** Webhook handler core: a viewed event advances SENT→VIEWED. */
export async function markContractViewed(requestId: string, actorId?: string | null) {
  const contract = await prisma.contract.findFirst({ where: { digisignerRequestId: requestId } });
  if (!contract || contract.status !== "SENT") return;
  await transitionContract(contract.id, "VIEWED", { actorId, reason: "Viewed by signer" });
}

/**
 * On signature completion: store the signed PDF, advance Contract → SIGNED, and
 * CREATE the Deal from the frozen decision terms (CLAUDE.md Phase 5). Idempotent.
 */
export async function markContractSigned(requestId: string, actorId?: string | null) {
  const contract = await prisma.contract.findFirst({
    where: { digisignerRequestId: requestId },
    include: { underwritingDecision: true },
  });
  if (!contract) throw new Error("Contract not found for request");
  if (contract.status === "SIGNED") return { alreadySigned: true, dealId: contract.dealId };

  const decision = contract.underwritingDecision;
  if (!decision?.approvedAmountCents || !decision.factorRate) {
    throw new Error("Cannot fund: decision terms missing");
  }
  const { url } = await digisigner.getSignedDocument(requestId);

  const dealId = await prisma.$transaction(async (tx) => {
    // One deal per application — reuse if present.
    let deal = contract.applicationId
      ? await tx.deal.findFirst({ where: { applicationId: contract.applicationId } })
      : null;
    if (!deal) {
      deal = await tx.deal.create({
        data: {
          clientId: contract.clientId,
          applicationId: contract.applicationId,
          status: "PENDING",
          advanceAmountCents: decision.approvedAmountCents!,
          purchasedAmountCents: decision.paybackAmountCents ?? decision.approvedAmountCents!,
          factorRate: decision.factorRate!,
          holdbackPct: decision.holdbackPct ?? 0,
          remittanceFrequency: decision.remittanceFrequency ?? "DAILY",
          estimatedTermDays: decision.estimatedTermDays ?? 180,
        },
      });
      await writeAudit(tx, { actorId, entityType: "Deal", entityId: deal.id, action: "CREATE", toValue: "PENDING", reason: "Created from signed contract" });
    }
    await tx.contract.update({
      where: { id: contract.id },
      data: { signedDocumentUrl: url, signedAt: new Date(), dealId: deal.id },
    });
    return deal.id;
  });

  // Advance contract status through the audited transition service.
  await transitionContract(contract.id, "SIGNED", { actorId, reason: "Signature completed" });
  await logActivity(prisma, { actorId, entityType: "Deal", entityId: dealId, type: "deal_created", summary: "Deal created from signed contract — ready to fund" });
  return { alreadySigned: false, dealId };
}
