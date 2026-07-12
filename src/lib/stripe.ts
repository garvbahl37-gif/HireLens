import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazy so the app can build/boot without Stripe env configured. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}

export function proPriceId(interval: "monthly" | "yearly"): string {
  const id =
    interval === "yearly"
      ? process.env.STRIPE_PRICE_PRO_YEARLY
      : process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!id) throw new Error(`Stripe price id for ${interval} is not set`);
  return id;
}
