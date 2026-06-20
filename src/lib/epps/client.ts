import type { EppsPaymentStatus } from "@prisma/client";

// EPPS ACH gateway adapter (CLAUDE.md Phase 6). Code against the interface;
// isolate the vendor wire format. EPPS is BATCH-ONLY (no real-time) with fixed
// windows at 12:30 / 2:30 PM Central. When EPPS_MODE !== "live" a deterministic
// FAKE client is used so the whole flow runs locally with no credentials.

const LIVE = process.env.EPPS_MODE === "live";

export interface EnrollParams {
  clientId: string;
  legalName: string;
  bankName?: string | null;
}
export interface SubmitItem {
  paymentId: string;
  amountCents: bigint;
}
export interface SubmitResult {
  paymentId: string;
  eppsTxnId: string;
  accepted: boolean;
}
export interface StatusResult {
  eppsTxnId: string;
  status: EppsPaymentStatus; // normalized
  returnCode?: string | null;
}

export interface EppsGateway {
  enroll(p: EnrollParams): Promise<{ eppsCustomerId: string }>;
  submitBatch(items: SubmitItem[]): Promise<SubmitResult[]>;
  fetchStatuses(eppsTxnIds: string[]): Promise<StatusResult[]>;
  normalizeStatus(raw: string): EppsPaymentStatus;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Deterministic fake: ~88% clear, ~12% return — keyed off the txn id so a given
// payment always resolves the same way (idempotent under retries).
class FakeEpps implements EppsGateway {
  async enroll(p: EnrollParams) {
    return { eppsCustomerId: `epps_cust_${p.clientId.slice(-8)}` };
  }
  async submitBatch(items: SubmitItem[]): Promise<SubmitResult[]> {
    return items.map((it) => ({
      paymentId: it.paymentId,
      eppsTxnId: `epps_txn_${it.paymentId}`,
      accepted: true,
    }));
  }
  async fetchStatuses(ids: string[]): Promise<StatusResult[]> {
    return ids.map((id) => {
      const returned = hash(id) % 100 < 12;
      return returned
        ? { eppsTxnId: id, status: "RETURNED" as EppsPaymentStatus, returnCode: "R01" }
        : { eppsTxnId: id, status: "CLEARED" as EppsPaymentStatus, returnCode: null };
    });
  }
  normalizeStatus(raw: string): EppsPaymentStatus {
    return this.mapStatus(raw);
  }
  // shared mapping (also used by live)
  private mapStatus(raw: string): EppsPaymentStatus {
    const r = raw.toUpperCase();
    if (["CLEARED", "SETTLED", "PAID", "COMPLETE"].includes(r)) return "CLEARED";
    if (["RETURN", "RETURNED", "NSF", "R01", "R02", "R03"].some((c) => r.includes(c))) return "RETURNED";
    if (["SUBMITTED", "PENDING", "PROCESSING"].includes(r)) return "SUBMITTED";
    if (["CANCELLED", "VOID"].includes(r)) return "CANCELLED";
    return "SUBMITTED";
  }
}

class LiveEpps implements EppsGateway {
  // >>> FILL IN <<< real EPPS request/response shapes (EPPS_BASE_URL,
  // EPPS_API_USER, EPPS_API_PASSWORD). Adjust normalizeStatus() to their codes.
  async enroll(): Promise<{ eppsCustomerId: string }> {
    throw new Error("EPPS live mode not configured");
  }
  async submitBatch(): Promise<SubmitResult[]> {
    throw new Error("EPPS live mode not configured");
  }
  async fetchStatuses(): Promise<StatusResult[]> {
    throw new Error("EPPS live mode not configured");
  }
  normalizeStatus(raw: string): EppsPaymentStatus {
    const r = raw.toUpperCase();
    if (r.startsWith("R")) return "RETURNED";
    if (r === "C" || r === "CLEARED") return "CLEARED";
    return "SUBMITTED";
  }
}

export const epps: EppsGateway = LIVE ? new LiveEpps() : new FakeEpps();
