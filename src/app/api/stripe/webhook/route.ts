import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { applySubscription, removeSubscription } from "@/lib/subscription";

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
    event = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_offline").webhooks.constructEvent(
      payload,
      signature,
      secret
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  /* ---- idempotency: each Stripe event is processed exactly once ---- */
  try {
    await db.stripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub =
            typeof session.subscription === "string"
              ? await getStripe().subscriptions.retrieve(session.subscription)
              : session.subscription;
          await applySubscription(sub, session.metadata?.userId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        await removeSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "invoice.paid": {
        // Renewal payments: refresh the period end / plan state.
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.parent?.subscription_details?.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        if (subId) {
          const sub = await getStripe().subscriptions.retrieve(subId);
          await applySubscription(sub);
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged and ignored.
        break;
    }
  } catch (err) {
    console.error(`[stripe] error handling ${event.type}:`, err);
    // Surface a 500 so Stripe retries — but the idempotency row above
    // would block the retry, so release it first.
    await db.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
