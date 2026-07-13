import type Stripe from "stripe";
import { db } from "@/lib/db";

/**
 * Statuses that keep Pro features on. `past_due` stays Pro during the
 * grace window — Stripe emits `customer.subscription.updated` /
 * `.deleted` when dunning finally fails, which downgrades here.
 */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Single source of truth for reflecting a Stripe subscription into our
 * database. Called from every webhook that carries a subscription.
 */
export async function applySubscription(
  sub: Stripe.Subscription,
  knownUserId?: string
) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = await findUser(knownUserId ?? sub.metadata?.userId, customerId);
  if (!user) {
    console.warn(
      `[stripe] subscription ${sub.id} has no matching user (customer ${customerId})`
    );
    return;
  }

  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  await db.user.update({
    where: { id: user.id },
    data: {
      plan: ACTIVE_STATUSES.has(sub.status) ? "PRO" : "FREE",
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: item?.price?.id ?? null,
      stripeCurrentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}

/** Terminal downgrade for `customer.subscription.deleted`. */
export async function removeSubscription(sub: Stripe.Subscription) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = await findUser(sub.metadata?.userId, customerId);
  if (!user) return;

  // Only downgrade if this deletion refers to the subscription we're
  // currently tracking. A replayed/out-of-order `deleted` for an OLD
  // subscription must not wipe a newer active one the user just started.
  if (
    user.stripeSubscriptionId &&
    user.stripeSubscriptionId !== sub.id
  ) {
    return;
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });
}

async function findUser(
  userId: string | undefined,
  customerId: string | undefined
) {
  if (userId) {
    const byId = await db.user.findUnique({ where: { id: userId } });
    if (byId) return byId;
  }
  if (customerId) {
    return db.user.findUnique({ where: { stripeCustomerId: customerId } });
  }
  return null;
}
