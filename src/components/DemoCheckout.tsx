"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { CreditCard, Loader2, Lock, ShieldAlert } from "lucide-react";
import { PRICING } from "@/lib/plans";

const EASE = [0.16, 1, 0.3, 1] as const;

export function DemoCheckout({ interval }: { interval: "monthly" | "yearly" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = PRICING[interval];

  async function pay() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/demo/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setPending(false);
        return;
      }
      // The plan is already PRO in the DB — the event handler did it.
      router.push("/dashboard/billing?upgraded=1");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mx-auto max-w-md"
    >
      {/* honesty banner — this is a simulation, say so plainly */}
      <div className="mb-5 flex gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
        <div className="text-sm">
          <p className="font-bold text-warn">Simulated checkout</p>
          <p className="mt-1 leading-relaxed text-muted">
            No Stripe account is connected to this deployment, so this page
            stands in for Stripe Checkout. Nothing is charged and no card
            details are collected or sent anywhere. Completing it emits a{" "}
            <code className="rounded bg-card2 px-1 py-0.5 text-xs">
              checkout.session.completed
            </code>{" "}
            event through the same webhook handler the live Stripe integration
            uses.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* order summary */}
        <div className="border-b border-edge bg-card2 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Subscribing to
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-lg font-bold">HireLens Pro</p>
            <p className="text-2xl font-extrabold">
              ${price.amount}
              <span className="text-sm font-medium text-muted">
                /{price.per}
              </span>
            </p>
          </div>
          <p className="mt-2 text-sm text-muted">
            Unlimited reviews, line-by-line rewrites, ATS checklist, and
            interview prep.
          </p>
        </div>

        {/* inert card form — decorative, nothing is read from it */}
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              Card number
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-edge bg-card2 px-3 py-2.5">
              <CreditCard className="h-4 w-4 text-faint" />
              <span className="font-mono text-sm tracking-wider text-muted">
                4242 4242 4242 4242
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                Expiry
              </label>
              <div className="rounded-xl border border-edge bg-card2 px-3 py-2.5 font-mono text-sm text-muted">
                12 / 34
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                CVC
              </label>
              <div className="rounded-xl border border-edge bg-card2 px-3 py-2.5 font-mono text-sm text-muted">
                123
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          )}

          <button
            onClick={pay}
            disabled={pending}
            className="btn btn-primary btn-sheen w-full py-3 text-base disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Pay ${price.amount}
              </>
            )}
          </button>

          <Link
            href="/dashboard/billing?checkout=canceled"
            className="block text-center text-sm text-muted transition-colors hover:text-ink"
          >
            Cancel and go back
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
