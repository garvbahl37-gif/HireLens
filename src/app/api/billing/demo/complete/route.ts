import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  demoCheckoutCompletedEvent,
  isDemoBilling,
} from "@/lib/demo-billing";
import { DuplicateEvent, processStripeEvent } from "@/lib/stripe-events";

export const runtime = "nodejs";

const bodySchema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

/**
 * Completes the *simulated* checkout: mints a Stripe-shaped
 * `checkout.session.completed` event and runs it through the SAME
 * processStripeEvent() handler the live webhook uses. Nothing here writes
 * `plan = PRO` directly — the upgrade happens because the event handler
 * applied a subscription, exactly as it would in production.
 */
export async function POST(req: NextRequest) {
  if (!isDemoBilling()) {
    return NextResponse.json(
      { error: "Demo billing is off — Stripe is configured." },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.plan === "PRO") {
    return NextResponse.json({ error: "Already on Pro." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const event = demoCheckoutCompletedEvent(user.id, parsed.data.interval);

  try {
    await processStripeEvent(event);
  } catch (err) {
    if (err instanceof DuplicateEvent) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[demo-billing] checkout completion failed:", err);
    return NextResponse.json(
      { error: "Couldn't complete the demo checkout." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
