/**
 * One-shot Stripe bootstrap: creates the HireLens Pro product and its
 * monthly/yearly prices in your TEST-MODE account, then prints the env
 * lines to paste into .env / Vercel.
 *
 *   npm run stripe:setup
 *
 * Idempotent — re-running finds the existing product/prices.
 */
import "dotenv/config";
import Stripe from "stripe";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Set STRIPE_SECRET_KEY in .env first");
  if (!key.startsWith("sk_test_")) {
    throw new Error(
      "Refusing to run: STRIPE_SECRET_KEY is not a test-mode key (sk_test_...)"
    );
  }

  const stripe = new Stripe(key);

  const search = await stripe.products.search({
    query: "metadata['app']:'hirelens' AND active:'true'",
  });
  const product =
    search.data[0] ??
    (await stripe.products.create({
      name: "HireLens Pro",
      description:
        "Unlimited resume reviews with line-by-line rewrites, ATS optimization checklist, and interview prep.",
      metadata: { app: "hirelens" },
    }));
  console.log(`Product: ${product.name} (${product.id})`);

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });

  const monthly =
    prices.data.find((p) => p.recurring?.interval === "month") ??
    (await stripe.prices.create({
      product: product.id,
      unit_amount: 1200,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: "Pro Monthly",
    }));

  const yearly =
    prices.data.find((p) => p.recurring?.interval === "year") ??
    (await stripe.prices.create({
      product: product.id,
      unit_amount: 9600,
      currency: "usd",
      recurring: { interval: "year" },
      nickname: "Pro Yearly",
    }));

  console.log(`\nAdd these to .env (and Vercel → Project → Env Vars):\n`);
  console.log(`STRIPE_PRICE_PRO_MONTHLY="${monthly.id}"`);
  console.log(`STRIPE_PRICE_PRO_YEARLY="${yearly.id}"`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
