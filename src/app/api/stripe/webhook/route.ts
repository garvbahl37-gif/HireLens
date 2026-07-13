import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { DuplicateEvent, processStripeEvent } from "@/lib/stripe-events";

export const runtime = "nodejs";

/**
 * Stripe webhook — the single place where payment state becomes
 * application state. A payment that doesn't land here never upgrades
 * anyone: the UI success page is cosmetic only.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    // Signature verification is pure HMAC — no API key involved, so
    // don't route it through getStripe() (which requires one).
    event = new Stripe(
      process.env.STRIPE_SECRET_KEY || "sk_offline"
    ).webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await processStripeEvent(event);
  } catch (err) {
    if (err instanceof DuplicateEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error(`[stripe] error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
