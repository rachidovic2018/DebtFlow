import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/session";
import { markContractSigned, markContractViewed } from "@/lib/services/contracts";

// DEV-ONLY: drive DigiSigner status events locally (no real provider).
const SIMULATED = process.env.USE_SIMULATED_PROVIDERS !== "false";

export async function POST(req: Request) {
  if (!SIMULATED) return NextResponse.json({ error: "Simulator disabled" }, { status: 403 });
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { contractId?: string; event?: string };
  if (!body.contractId) return NextResponse.json({ error: "contractId required" }, { status: 400 });

  const contract = await prisma.contract.findUnique({ where: { id: body.contractId } });
  if (!contract?.digisignerRequestId) {
    return NextResponse.json({ error: "Contract not sent yet" }, { status: 400 });
  }
  const event = (body.event ?? "signed").toLowerCase();
  if (event === "viewed") {
    await markContractViewed(contract.digisignerRequestId, user.id);
    return NextResponse.json({ ok: true, status: "VIEWED" });
  }
  const r = await markContractSigned(contract.digisignerRequestId, user.id);
  return NextResponse.json({ ok: true, status: "SIGNED", ...r });
}
