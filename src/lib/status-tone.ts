import type { BadgeTone } from "@/components/ui/badge";

// Maps MCA status enums → Badge tones. Single source so modules stay consistent.
const MAP: Record<string, BadgeTone> = {
  // Lead
  NEW: "slate",
  CONTACTED: "sky",
  QUALIFIED: "indigo",
  APPLICATION_STARTED: "violet",
  CONVERTED: "emerald",
  LOST: "rose",
  // Client
  PROSPECT: "slate",
  ACTIVE_CLIENT: "emerald",
  DELINQUENT: "rose",
  COMPLETED: "indigo",
  DEFAULTED: "rose",
  RENEWED: "violet",
  // Application
  SUBMITTED: "slate",
  UNDER_REVIEW: "sky",
  UNDERWRITING: "amber",
  APPROVED: "emerald",
  DECLINED: "rose",
  FUNDED: "indigo",
  WITHDRAWN: "slate",
  // Deal
  PENDING: "slate",
  COLLECTING: "sky",
  // Contract
  DRAFT: "slate",
  SENT: "sky",
  VIEWED: "amber",
  SIGNED: "emerald",
  VOID: "rose",
  // Collections
  OPEN: "rose",
  IN_PROGRESS: "amber",
  PAYMENT_PLAN: "sky",
  RESOLVED: "emerald",
  WRITTEN_OFF: "slate",
  // EPPS / Transaction
  QUEUED: "slate",
  SUBMITTED_EPPS: "sky",
  CLEARED: "emerald",
  RETURNED: "rose",
  CANCELLED: "slate",
  ENROLLED: "emerald",
  RECONCILED: "indigo",
  FAILED: "rose",
};

export function statusTone(status: string): BadgeTone {
  return MAP[status] ?? "slate";
}
