import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";

export const ROLES = [
  "ADMIN",
  "SALES_REP",
  "BROKER_MANAGER",
  "UNDERWRITER",
  "FUNDER_OPS",
  "COLLECTIONS",
  "SYNDICATION_MANAGER",
  "AUDITOR_READONLY",
] as const;

export type Role = (typeof ROLES)[number];

export interface SessionUser {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
}

/** AUDITOR_READONLY can read everywhere but mutate nothing. */
export function isReadOnly(user: { role: string }): boolean {
  return user.role === "AUDITOR_READONLY";
}

export function hasRole(user: { role: string }, ...roles: Role[]): boolean {
  return roles.includes(user.role as Role);
}

/** Server-side page guard: redirect to /login if unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Server-side role guard: redirect home if the role isn't permitted. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) redirect("/");
  return user;
}

/**
 * Coarse capability check. Mutations are denied for AUDITOR_READONLY.
 * Extend per-resource as phases land.
 */
export function can(
  user: { role: string },
  action: "read" | "write",
  _resource?: string,
): boolean {
  if (action === "write" && isReadOnly(user)) return false;
  return true;
}
