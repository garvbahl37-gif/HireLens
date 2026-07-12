"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { FREE_FEATURES, PRO_FEATURES, PRICING } from "@/lib/plans";

export function PricingCards({
  authed,
  plan,
}: {
  authed: boolean;
  plan: "FREE" | "PRO" | null;
}) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const price = PRICING[interval];

  const proHref = !authed
    ? `/signup?intent=pro&interval=${interval}`
    : plan === "PRO"
      ? "/dashboard/billing"
      : `/dashboard/billing?intent=pro&interval=${interval}`;

  const freeHref = authed ? "/dashboard" : "/signup";

  return (
    <div className="mx-auto max-w-4xl">
      {/* interval toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-full border border-edge bg-card p-1">
          {(["monthly", "yearly"] as const).map((i) => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className={cn(
                "rounded-full px-5 py-1.5 text-sm font-semibold transition-all",
                interval === i
                  ? "bg-gradient-to-r from-accent to-accent2 text-white shadow"
                  : "text-muted hover:text-ink"
              )}
            >
              {i === "monthly" ? "Monthly" : "Yearly"}
              {i === "yearly" && (
                <span
                  className={cn(
                    "ml-1.5 text-xs",
                    interval === "yearly" ? "text-white/80" : "text-good"
                  )}
                >
                  −17%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Free */}
        <div className="card p-8 flex flex-col">
          <h3 className="text-lg font-bold">Starter</h3>
          <p className="mt-1 text-sm text-muted">
            Kick the tires on a real review.
          </p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold">$0</span>
            <span className="text-muted text-sm">forever</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5 text-muted" />
                <span className="text-muted">{f}</span>
              </li>
            ))}
          </ul>
          <Link href={freeHref} className="btn btn-ghost mt-8 w-full">
            {authed ? "Go to dashboard" : "Start free"}
          </Link>
        </div>

        {/* Pro */}
        <div className="relative card p-8 flex flex-col border-accent/60 shadow-[0_0_60px_-18px_var(--color-accent)]">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-accent to-accent2 px-3 py-0.5 text-xs font-bold text-white">
            MOST POPULAR
          </span>
          <h3 className="text-lg font-bold">Pro</h3>
          <p className="mt-1 text-sm text-muted">
            Every application, fully optimized.
          </p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold">${price.amount}</span>
            <span className="text-muted text-sm">/{price.per}</span>
            {price.savings && (
              <span className="ml-2 chip text-good border-good/30">
                {price.savings}
              </span>
            )}
          </div>
          <ul className="mt-6 space-y-3 text-sm flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link href={proHref} className="btn btn-primary mt-8 w-full">
            {plan === "PRO" ? "Manage subscription" : "Upgrade to Pro"}
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-faint">
        Payments run through Stripe in test mode — try card{" "}
        <code className="font-mono">4242 4242 4242 4242</code>, any future date,
        any CVC.
      </p>
    </div>
  );
}
