"use server";

import { revalidatePath } from "next/cache";
import type { DecisionOutcome, RemittanceFrequency } from "@prisma/client";
import { getCurrentUser } from "@/lib/session";
import { toCents } from "@/lib/money";
import { transitionApplication } from "@/lib/services/transitions";
import {
  analyzeStatements,
  createUnderwritingDecision,
  type DecisionInput,
} from "@/lib/services/underwriting";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidate(id: string) {
  revalidatePath("/underwriting");
  revalidatePath(`/underwriting/${id}`);
}

// Move UNDER_REVIEW → UNDERWRITING so an APPROVED decision becomes a legal move.
// The transition service validates against the state machine + writes audit.
export async function beginUnderwriting(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  try {
    await transitionApplication(id, "UNDERWRITING", {
      actorId: user?.id,
      reason: "Begin underwriting",
    });
    revalidate(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not begin underwriting." };
  }
}

// Run the (simulated) statement-ingestion job, which writes computed features.
export async function runAnalysis(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  try {
    await analyzeStatements(id, user?.id);
    revalidate(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not analyze statements." };
  }
}

// Parse the decision form → DecisionInput → versioned UnderwritingDecision.
// Dollar inputs → BigInt cents; percent inputs → fractions; factor stays as entered.
export async function submitDecision(id: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();

  const outcome = String(formData.get("outcome") ?? "") as DecisionOutcome;
  if (!["APPROVED", "DECLINED", "COUNTER"].includes(outcome)) {
    return { ok: false, error: "A valid outcome is required." };
  }

  const num = (key: string): number | null => {
    const raw = String(formData.get(key) ?? "").replace(/[$,%\s]/g, "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const approvedDollars = num("approvedAmount");
  const factorRate = num("factorRate");
  const holdbackPercent = num("holdbackPct");
  const estimatedTermDays = num("estimatedTermDays");

  const freqRaw = String(formData.get("remittanceFrequency") ?? "").trim();
  const remittanceFrequency =
    freqRaw && ["DAILY", "WEEKLY", "MONTHLY"].includes(freqRaw)
      ? (freqRaw as RemittanceFrequency)
      : null;

  const conditionsRaw = String(formData.get("conditions") ?? "").trim();

  const input: DecisionInput = {
    outcome,
    approvedAmountCents:
      approvedDollars != null && approvedDollars > 0 ? toCents(approvedDollars) : null,
    factorRate: factorRate != null ? factorRate : null,
    // Percent UI input (e.g. 12) → fraction (0.12).
    holdbackPct: holdbackPercent != null ? holdbackPercent / 100 : null,
    remittanceFrequency,
    estimatedTermDays:
      estimatedTermDays != null ? Math.round(estimatedTermDays) : null,
    conditions: conditionsRaw || null,
  };

  try {
    await createUnderwritingDecision(id, input, user?.id);
    revalidate(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not record decision." };
  }
}
