import { NextResponse } from "next/server";
import crypto from "crypto";
import { digisigner } from "@/lib/digisigner";
import { markContractSigned, markContractViewed } from "@/lib/services/contracts";

// Inbound DigiSigner webhook (CLAUDE.md Phase 5). Verify signature, then advance
// the contract. Idempotent on the signed path (creates the Deal once).
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-digisigner-signature");
  const expected = digisigner.sign(raw);
  const ok =
    !!sig &&
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let body: { requestId?: string; event?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.requestId || !body.event) {
    return NextResponse.json({ error: "Missing requestId/event" }, { status: 400 });
  }

  const event = body.event.toLowerCase();
  try {
    if (event === "signed" || event === "completed") {
      const r = await markContractSigned(body.requestId);
      return NextResponse.json({ ok: true, ...r });
    }
    if (event === "viewed") {
      await markContractViewed(body.requestId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: true, ignored: event });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 422 });
  }
}
