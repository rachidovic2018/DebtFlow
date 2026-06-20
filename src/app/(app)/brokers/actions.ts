"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * Create a Broker / ISO. commissionPct arrives from the form as a percent
 * (e.g. "3" for 3%) and is stored as a fraction Decimal (0.0300).
 */
export async function createBroker(formData: FormData) {
  await getCurrentUser(); // actor (auth gate)

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  const pctRaw = String(formData.get("commissionPct") ?? "").trim();
  const pctNum = pctRaw === "" ? 0 : Number(pctRaw);
  // Form value is a percent; store as a fraction (3 -> 0.03). Clamp to schema scale.
  const commissionPct =
    Number.isFinite(pctNum) && pctNum > 0 ? (pctNum / 100).toFixed(4) : "0";

  await prisma.broker.create({
    data: { name, email, phone, commissionPct },
  });

  revalidatePath("/brokers");
}
