import type {
  ApplicationStatus,
  CollectionsStatus,
  ContractStatus,
  DealStatus,
  LeadStatus,
} from "@prisma/client";
import { prisma } from "../prisma";
import { writeAudit, logActivity } from "../audit";
import { assertTransition } from "@/domain/state-machines";

// THE ONLY place status changes. Each validates against the state machine and
// writes an AuditLog + Activity, atomically. Never mutate status elsewhere.

interface Ctx {
  actorId?: string | null;
  reason?: string | null;
}

export function transitionLead(id: string, to: LeadStatus, ctx: Ctx = {}) {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.lead.findUniqueOrThrow({ where: { id }, select: { status: true } });
    assertTransition("Lead", cur.status, to);
    const updated = await tx.lead.update({ where: { id }, data: { status: to } });
    await writeAudit(tx, { actorId: ctx.actorId, entityType: "Lead", entityId: id, action: "STATUS_CHANGE", fromValue: cur.status, toValue: to, reason: ctx.reason });
    await logActivity(tx, { actorId: ctx.actorId, entityType: "Lead", entityId: id, type: "status_change", summary: `Lead ${cur.status} → ${to}` });
    return updated;
  });
}

export function transitionApplication(id: string, to: ApplicationStatus, ctx: Ctx = {}) {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.application.findUniqueOrThrow({ where: { id }, select: { status: true } });
    assertTransition("Application", cur.status, to);
    const updated = await tx.application.update({ where: { id }, data: { status: to } });
    await writeAudit(tx, { actorId: ctx.actorId, entityType: "Application", entityId: id, action: "STATUS_CHANGE", fromValue: cur.status, toValue: to, reason: ctx.reason });
    await logActivity(tx, { actorId: ctx.actorId, entityType: "Application", entityId: id, type: "status_change", summary: `Application ${cur.status} → ${to}` });
    return updated;
  });
}

export function transitionDeal(id: string, to: DealStatus, ctx: Ctx = {}) {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.deal.findUniqueOrThrow({ where: { id }, select: { status: true } });
    assertTransition("Deal", cur.status, to);
    const updated = await tx.deal.update({ where: { id }, data: { status: to } });
    await writeAudit(tx, { actorId: ctx.actorId, entityType: "Deal", entityId: id, action: "STATUS_CHANGE", fromValue: cur.status, toValue: to, reason: ctx.reason });
    await logActivity(tx, { actorId: ctx.actorId, entityType: "Deal", entityId: id, type: "status_change", summary: `Deal ${cur.status} → ${to}` });
    return updated;
  });
}

export function transitionContract(id: string, to: ContractStatus, ctx: Ctx = {}) {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.contract.findUniqueOrThrow({ where: { id }, select: { status: true } });
    assertTransition("Contract", cur.status, to);
    const updated = await tx.contract.update({ where: { id }, data: { status: to } });
    await writeAudit(tx, { actorId: ctx.actorId, entityType: "Contract", entityId: id, action: "STATUS_CHANGE", fromValue: cur.status, toValue: to, reason: ctx.reason });
    await logActivity(tx, { actorId: ctx.actorId, entityType: "Contract", entityId: id, type: "status_change", summary: `Contract ${cur.status} → ${to}` });
    return updated;
  });
}

export function transitionCollectionsCase(id: string, to: CollectionsStatus, ctx: Ctx = {}) {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.collectionsCase.findUniqueOrThrow({ where: { id }, select: { status: true } });
    assertTransition("CollectionsCase", cur.status, to);
    const data = to === "RESOLVED" || to === "WRITTEN_OFF" ? { status: to, resolvedAt: new Date() } : { status: to };
    const updated = await tx.collectionsCase.update({ where: { id }, data });
    await writeAudit(tx, { actorId: ctx.actorId, entityType: "CollectionsCase", entityId: id, action: "STATUS_CHANGE", fromValue: cur.status, toValue: to, reason: ctx.reason });
    await logActivity(tx, { actorId: ctx.actorId, entityType: "CollectionsCase", entityId: id, type: "status_change", summary: `Collections ${cur.status} → ${to}` });
    return updated;
  });
}
