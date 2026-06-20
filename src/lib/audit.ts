import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Immutable audit + activity writers (CLAUDE.md Phase 10: every status change +
// money movement writes an AuditLog). Prefer passing a transaction client.

type Db = Prisma.TransactionClient | typeof prisma;

export async function writeAudit(
  db: Db,
  params: {
    actorId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    fromValue?: string | null;
    toValue?: string | null;
    reason?: string | null;
  },
) {
  return db.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      fromValue: params.fromValue ?? null,
      toValue: params.toValue ?? null,
      reason: params.reason ?? null,
    },
  });
}

export async function logActivity(
  db: Db,
  params: {
    actorId?: string | null;
    entityType: string;
    entityId: string;
    type: string;
    summary: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return db.activity.create({
    data: {
      actorId: params.actorId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      type: params.type,
      summary: params.summary,
      metadata: params.metadata,
    },
  });
}
