import type {
  ApplicationStatus,
  CollectionsStatus,
  ContractStatus,
  DealStatus,
  LeadStatus,
} from "@prisma/client";

// Allowed status transitions (CLAUDE.md Phase 3). The transition services are
// the ONLY place status changes — they consult these maps and reject anything
// not listed. Keep ACTIVE/funded promotions system-driven where noted.

export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["CONTACTED", "QUALIFIED", "LOST"],
  CONTACTED: ["QUALIFIED", "LOST"],
  QUALIFIED: ["APPLICATION_STARTED", "LOST"],
  APPLICATION_STARTED: ["CONVERTED", "LOST"],
  CONVERTED: [],
  LOST: [],
};

export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["UNDERWRITING", "DECLINED", "WITHDRAWN"],
  UNDERWRITING: ["APPROVED", "DECLINED", "WITHDRAWN"],
  APPROVED: ["FUNDED", "WITHDRAWN"],
  DECLINED: [],
  FUNDED: [],
  WITHDRAWN: [],
};

export const DEAL_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  PENDING: ["FUNDED"],
  FUNDED: ["COLLECTING"],
  COLLECTING: ["COMPLETED", "DEFAULTED", "RENEWED"],
  COMPLETED: ["RENEWED"],
  DEFAULTED: ["RENEWED"],
  RENEWED: [],
};

export const CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  DRAFT: ["SENT", "VOID"],
  SENT: ["VIEWED", "SIGNED", "DECLINED", "VOID"],
  VIEWED: ["SIGNED", "DECLINED", "VOID"],
  SIGNED: [],
  DECLINED: [],
  VOID: [],
};

export const COLLECTIONS_TRANSITIONS: Record<CollectionsStatus, CollectionsStatus[]> = {
  OPEN: ["IN_PROGRESS", "PAYMENT_PLAN", "RESOLVED", "WRITTEN_OFF"],
  IN_PROGRESS: ["PAYMENT_PLAN", "RESOLVED", "WRITTEN_OFF"],
  PAYMENT_PLAN: ["RESOLVED", "WRITTEN_OFF"],
  RESOLVED: [],
  WRITTEN_OFF: [],
};

export const TRANSITIONS = {
  Lead: LEAD_TRANSITIONS,
  Application: APPLICATION_TRANSITIONS,
  Deal: DEAL_TRANSITIONS,
  Contract: CONTRACT_TRANSITIONS,
  CollectionsCase: COLLECTIONS_TRANSITIONS,
} as const;

export type TransitionEntity = keyof typeof TRANSITIONS;

export function canTransition(entity: TransitionEntity, from: string, to: string): boolean {
  const map = TRANSITIONS[entity] as Record<string, string[]>;
  return (map[from] ?? []).includes(to);
}

export function assertTransition(entity: TransitionEntity, from: string, to: string): void {
  if (!canTransition(entity, from, to)) {
    throw new Error(`Illegal ${entity} transition: ${from} → ${to}`);
  }
}
