/**
 * Local webhook exerciser — signs a realistic subscription event with
 * STRIPE_WEBHOOK_SECRET and POSTs it to the local webhook endpoint, so
 * the full verify → idempotency → DB-update path runs without a Stripe
 * account. (With real keys, prefer `stripe listen` / `stripe trigger`.)
 *
 *   npm run stripe:simulate -- demo@hirelens.app upgrade
 *   npm run stripe:simulate -- demo@hirelens.app cancel_at_period_end
 *   npm run stripe:simulate -- demo@hirelens.app downgrade
 */
import "dotenv/config";
import Stripe from "stripe";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [email, action = "upgrade"] = process.argv.slice(2);
  if (!email) {
    console.error(
      "Usage: npm run stripe:simulate -- <email> [upgrade|cancel_at_period_end|downgrade]"
    );
    process.exit(1);
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}`);

  const nowSec = Math.floor(Date.now() / 1000);
  const subscription = {
    id: user.stripeSubscriptionId ?? `sub_sim_${user.id.slice(-8)}`,
    object: "subscription",
    status: action === "downgrade" ? "canceled" : "active",
    customer: user.stripeCustomerId ?? `cus_sim_${user.id.slice(-8)}`,
    cancel_at_period_end: action === "cancel_at_period_end",
    metadata: { userId: user.id },
    items: {
      object: "list",
      data: [
        {
          id: "si_sim_1",
          object: "subscription_item",
          current_period_end: nowSec + 30 * 24 * 60 * 60,
          current_period_start: nowSec,
          price: {
            id: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "price_sim_monthly",
            object: "price",
          },
        },
      ],
    },
  };

  const event = {
    id: `evt_sim_${Date.now()}`,
    object: "event",
    api_version: "2025-03-31.basil",
    type:
      action === "downgrade"
        ? "customer.subscription.deleted"
        : "customer.subscription.updated",
    created: nowSec,
    data: { object: subscription },
  };

  const payload = JSON.stringify(event);
  const header = new Stripe("sk_test_dummy").webhooks.generateTestHeaderString({
    payload,
    secret,
  });

  const res = await fetch(`${APP_URL}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": header,
    },
    body: payload,
  });

  console.log(`[simulate] ${event.type} → HTTP ${res.status}`, await res.json());

  const after = await db.user.findUnique({
    where: { id: user.id },
    select: { plan: true, cancelAtPeriodEnd: true, stripeCurrentPeriodEnd: true },
  });
  console.log("[simulate] user state now:", after);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
