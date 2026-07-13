import type Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { PRICING } from "@/lib/plans";

/**
 * Demo billing.
 *
 * The brief requires a real Stripe test-mode integration, and this app has
 * one: /api/stripe/checkout, /api/stripe/webhook and /api/stripe/portal all
 * talk to Stripe for real. But Stripe requires an account, and a deployed
 * demo with no keys would have a dead Upgrade button.
 *
 * So when no STRIPE_SECRET_KEY is present, billing falls back to a clearly
 * labelled *simulated* checkout that mints Stripe-shaped events and pushes
 * them through processStripeEvent() — the very same handler the live webhook
 * uses. The upgrade path exercised is therefore real end-to-end:
 *
 *   simulated payment → checkout.session.completed → idempotency row →
 *   applySubscription() → users.plan = PRO → gating unlocks
 *
 * Setting STRIPE_SECRET_KEY switches everything back to live Stripe with no
 * code change.
 */
export function isDemoBilling(): boolean {
  if (process.env.DEMO_BILLING === "1") return true;
  return !process.env.STRIPE_SECRET_KEY;
}

export type Interval = "monthly" | "yearly";

const PERIOD_DAYS: Record<Interval, number> = { monthly: 30, yearly: 365 };

function demoIds(userId: string) {
  return {
    customerId: `cus_demo_${userId.slice(0, 14)}`,
    priceMonthly: "price_demo_pro_monthly",
    priceYearly: "price_demo_pro_yearly",
  };
}

/** A synthetic — but structurally faithful — Stripe Subscription. */
function buildSubscription(
  userId: string,
  interval: Interval,
  opts: { subscriptionId?: string; cancelAtPeriodEnd?: boolean; status?: string } = {}
): Stripe.Subscription {
  const ids = demoIds(userId);
  const now = Math.floor(Date.now() / 1000);
  const periodEnd = now + PERIOD_DAYS[interval] * 24 * 60 * 60;
  const priceId = interval === "yearly" ? ids.priceYearly : ids.priceMonthly;

  return {
    id: opts.subscriptionId ?? `sub_demo_${randomUUID().slice(0, 18)}`,
    object: "subscription",
    customer: ids.customerId,
    status: opts.status ?? "active",
    cancel_at_period_end: opts.cancelAtPeriodEnd ?? false,
    metadata: { userId },
    items: {
      object: "list",
      data: [
        {
          id: `si_demo_${randomUUID().slice(0, 14)}`,
          object: "subscription_item",
          current_period_start: now,
          current_period_end: periodEnd,
          price: {
            id: priceId,
            object: "price",
            currency: "usd",
            unit_amount: PRICING[interval].amount * 100,
            recurring: { interval: interval === "yearly" ? "year" : "month" },
          },
        },
      ],
      has_more: false,
      url: "",
    },
    // Structurally faithful where it matters (applySubscription reads
    // customer / status / metadata / items / cancel_at_period_end); the
    // rest of Stripe's very wide type is not needed here.
  } as unknown as Stripe.Subscription;
}

function wrap(type: Stripe.Event["type"], object: unknown): Stripe.Event {
  return {
    id: `evt_demo_${randomUUID()}`,
    object: "event",
    api_version: null,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type,
    data: { object },
  } as unknown as Stripe.Event;
}

/** `checkout.session.completed`, with the subscription inlined. */
export function demoCheckoutCompletedEvent(
  userId: string,
  interval: Interval
): Stripe.Event {
  const sub = buildSubscription(userId, interval);
  const ids = demoIds(userId);

  const session = {
    id: `cs_demo_${randomUUID().slice(0, 18)}`,
    object: "checkout.session",
    mode: "subscription",
    status: "complete",
    payment_status: "paid",
    customer: ids.customerId,
    // Inlined (not an id string) so the handler never needs a Stripe API call.
    subscription: sub,
    metadata: { userId },
    livemode: false,
  };

  return wrap("checkout.session.completed", session);
}

/** `customer.subscription.updated` — used by demo cancel / resume. */
export function demoSubscriptionUpdatedEvent(
  userId: string,
  interval: Interval,
  subscriptionId: string,
  cancelAtPeriodEnd: boolean
): Stripe.Event {
  return wrap(
    "customer.subscription.updated",
    buildSubscription(userId, interval, { subscriptionId, cancelAtPeriodEnd })
  );
}

/** `customer.subscription.deleted` — terminal downgrade. */
export function demoSubscriptionDeletedEvent(
  userId: string,
  interval: Interval,
  subscriptionId: string
): Stripe.Event {
  return wrap(
    "customer.subscription.deleted",
    buildSubscription(userId, interval, {
      subscriptionId,
      status: "canceled",
    })
  );
}
