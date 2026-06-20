import type { DecisionOutcome, RemittanceFrequency } from "@prisma/client";
import { prisma } from "../prisma";
import { writeAudit, logActivity } from "../audit";
import { transitionApplication } from "./transitions";

// Underwriting (CLAUDE.md Phase 4). Feature computation is a PURE function so it
// is testable; in production statement ingestion runs as a BACKGROUND JOB
// (Inngest/QStash) — here `analyzeStatements` simulates that job and writes
// features back to the Application.

export interface MonthlyBankSummary {
  depositsCents: number;
  avgBalanceCents: number;
  negativeDays: number;
  existingMcaDebits: number; // count of competing daily/weekly debits
}

export interface UnderwritingFeatures {
  avgMonthlyRevenueCents: bigint;
  depositVolatility: number; // coefficient of variation (0..1+)
  negativeDays: number;
  avgDailyBalanceCents: bigint;
  hasStacking: boolean;
  revenueTrend: "UP" | "FLAT" | "DOWN";
}

/** Pure feature extraction from bank/processor monthly summaries. */
export function computeFeatures(months: MonthlyBankSummary[]): UnderwritingFeatures {
  if (months.length === 0) {
    return {
      avgMonthlyRevenueCents: 0n,
      depositVolatility: 0,
      negativeDays: 0,
      avgDailyBalanceCents: 0n,
      hasStacking: false,
      revenueTrend: "FLAT",
    };
  }
  const deposits = months.map((m) => m.depositsCents);
  const mean = deposits.reduce((s, d) => s + d, 0) / deposits.length;
  const variance = deposits.reduce((s, d) => s + (d - mean) ** 2, 0) / deposits.length;
  const std = Math.sqrt(variance);
  const volatility = mean > 0 ? std / mean : 0;

  // Trend: compare first third vs last third of the window.
  const k = Math.max(1, Math.floor(deposits.length / 3));
  const early = deposits.slice(0, k).reduce((s, d) => s + d, 0) / k;
  const late = deposits.slice(-k).reduce((s, d) => s + d, 0) / k;
  const ratio = early > 0 ? late / early : 1;
  const revenueTrend = ratio > 1.08 ? "UP" : ratio < 0.92 ? "DOWN" : "FLAT";

  const avgBalance = months.reduce((s, m) => s + m.avgBalanceCents, 0) / months.length;

  return {
    avgMonthlyRevenueCents: BigInt(Math.round(mean)),
    depositVolatility: Number(volatility.toFixed(4)),
    negativeDays: months.reduce((s, m) => s + m.negativeDays, 0),
    avgDailyBalanceCents: BigInt(Math.round(avgBalance)),
    hasStacking: months.some((m) => m.existingMcaDebits > 0),
    revenueTrend,
  };
}

/**
 * Simulated statement-ingestion job. In production this is queued off the upload
 * request (slow/external). Here we synthesize plausible monthly summaries from
 * the application's requested amount and write computed features back.
 */
export async function analyzeStatements(applicationId: string, actorId?: string | null) {
  const app = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
  const base = Number(app.requestedAmountCents ?? 3_000_000n);
  // Deterministic-ish synthetic 6-month window derived from the id.
  const seed = app.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const months: MonthlyBankSummary[] = Array.from({ length: 6 }, (_, i) => {
    const wobble = 1 + (((seed + i * 7) % 30) - 15) / 100; // ±15%
    return {
      depositsCents: Math.round(base * 1.6 * wobble),
      avgBalanceCents: Math.round(base * 0.18 * wobble),
      negativeDays: (seed + i) % 5,
      existingMcaDebits: seed % 4 === 0 && i > 3 ? 1 : 0,
    };
  });
  const f = computeFeatures(months);

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      avgMonthlyRevenueCents: f.avgMonthlyRevenueCents,
      depositVolatility: f.depositVolatility,
      negativeDays: f.negativeDays,
      avgDailyBalanceCents: f.avgDailyBalanceCents,
      hasStacking: f.hasStacking,
      revenueTrend: f.revenueTrend,
    },
  });
  await logActivity(prisma, {
    actorId,
    entityType: "Application",
    entityId: applicationId,
    type: "statements_analyzed",
    summary: `Statement analysis complete — avg revenue ${(Number(f.avgMonthlyRevenueCents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}/mo${f.hasStacking ? ", stacking detected" : ""}`,
  });
  return f;
}

export interface DecisionInput {
  outcome: DecisionOutcome;
  approvedAmountCents?: bigint | null;
  factorRate?: number | null;
  holdbackPct?: number | null;
  remittanceFrequency?: RemittanceFrequency | null;
  estimatedTermDays?: number | null;
  conditions?: string | null;
}

/**
 * Persist a VERSIONED UnderwritingDecision (CLAUDE.md Phase 4). On APPROVED,
 * advances the Application to APPROVED via the transition service (which audits).
 * paybackAmount = approvedAmount × factorRate (purchased receivables).
 */
export async function createUnderwritingDecision(
  applicationId: string,
  input: DecisionInput,
  actorId?: string | null,
) {
  const last = await prisma.underwritingDecision.findFirst({
    where: { applicationId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (last?.version ?? 0) + 1;

  const payback =
    input.approvedAmountCents && input.factorRate
      ? BigInt(Math.round(Number(input.approvedAmountCents) * input.factorRate))
      : null;

  const decision = await prisma.underwritingDecision.create({
    data: {
      applicationId,
      underwriterId: actorId ?? null,
      version,
      outcome: input.outcome,
      approvedAmountCents: input.approvedAmountCents ?? null,
      factorRate: input.factorRate ?? null,
      holdbackPct: input.holdbackPct ?? null,
      remittanceFrequency: input.remittanceFrequency ?? null,
      estimatedTermDays: input.estimatedTermDays ?? null,
      paybackAmountCents: payback,
      conditions: input.conditions ?? null,
    },
  });

  await writeAudit(prisma, {
    actorId,
    entityType: "UnderwritingDecision",
    entityId: decision.id,
    action: "CREATE",
    toValue: `${input.outcome} v${version}`,
    reason: input.conditions ?? null,
  });

  // Advance the application to match the decision (validated by the state machine).
  if (input.outcome === "APPROVED") {
    await transitionApplication(applicationId, "APPROVED", { actorId, reason: "Underwriting approved" });
  } else if (input.outcome === "DECLINED") {
    await transitionApplication(applicationId, "DECLINED", { actorId, reason: "Underwriting declined" });
  }

  return decision;
}
