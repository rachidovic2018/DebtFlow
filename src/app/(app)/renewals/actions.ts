"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { createRenewalApplication } from "@/lib/services/renewals";

/**
 * Start a renewal: spawn a new Application linked to the prior deal (the service
 * runs the >=50%-collected eligibility + stacking check), then redirect to the
 * newly created application.
 */
export async function startRenewal(dealId: string) {
  const user = await getCurrentUser(); // actor (auth gate)
  const app = await createRenewalApplication(dealId, user?.id ?? null);

  revalidatePath("/renewals");
  revalidatePath("/applications");

  redirect(`/applications/${app.id}`);
}
