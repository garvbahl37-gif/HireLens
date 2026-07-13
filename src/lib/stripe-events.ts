import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { applySubscription, removeSubscription } from "@/lib/subscription";

/** Prisma unique-constraint violation code — a genuine duplicate event. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

export class DuplicateEvent extends Error {}

/**
 * The single place a Stripe event becomes application state.
 *
 * Both the live Stripe webhook and the demo-billing checkout funnel
 * through here, so demo mode exercises the real upgrade path (event →
 * idempotency row → applySubscription → plan change) rather than
 * writing `plan = PRO` behind the system's back.
 *
 * Throws DuplicateEvent if this event id was already processed.
 * Any other throw means the caller should return 5xx so Stripe retries.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  /* ---- idempotency: each event is processed exactly once ---- */
  try {
    await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    // P2002 means we've already handled this event. ANY other error
    // (pool timeout, dropped connection, missing table) must NOT be
    // mistaken for a duplicate — rethrow so the caller 500s and Stripe
    // retries, instead of silently dropping a paid upgrade.
    if (isUniqueViolation(err)) throw new DuplicateEvent();
    throw err;
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
          await applySubscription(await getStripe().subscriptions.retrieve(subId));
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged and ignored.
        break;
    }
  } catch (err) {
    // Release the idempotency row so the retry isn't blocked by it.
    await db.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    throw err;
  }
}
