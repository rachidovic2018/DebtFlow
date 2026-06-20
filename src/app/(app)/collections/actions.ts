"use server";

import type { CollectionsStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { transitionCollectionsCase } from "@/lib/services/transitions";
import { setReceiptsBasedPlan, assignCollectionsCase } from "@/lib/services/collections";

// Collections mutations route through the services (never set status directly).
// Actor is the authenticated user; revalidate the board and the case detail.

export async function transition(id: string, to: CollectionsStatus, reason?: string) {
  const user = await getCurrentUser();
  await transitionCollectionsCase(id, to, { actorId: user?.id ?? null, reason: reason ?? null });
  revalidatePath("/collections");
  revalidatePath(`/collections/${id}`);
}

export async function setPlan(
  id: string,
  plan: { holdbackPct: number; reviewCadenceDays: number; note?: string },
) {
  const user = await getCurrentUser();
  await setReceiptsBasedPlan(id, plan, user?.id ?? null);
  revalidatePath("/collections");
  revalidatePath(`/collections/${id}`);
}

export async function assign(id: string, userId: string) {
  const user = await getCurrentUser();
  await assignCollectionsCase(id, userId, user?.id ?? null);
  revalidatePath("/collections");
  revalidatePath(`/collections/${id}`);
}
