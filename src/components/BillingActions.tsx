"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { PRICING } from "@/lib/plans";

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

/* ------------------------------------------------------------------ */

export function UpgradeButtons({
  highlight,
}: {
  highlight?: "monthly" | "yearly";
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upgrade(interval: "monthly" | "yearly") {
    setPending(interval);
    setError(null);
    try {
      const { url } = await post("/api/stripe/checkout", { interval });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setPending(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => upgrade("monthly")}
          disabled={pending !== null}
          className={
            highlight !== "yearly" ? "btn btn-primary flex-1" : "btn btn-ghost flex-1"
          }
        >
          {pending === "monthly" && <Loader2 className="h-4 w-4 animate-spin" />}
          Pro Monthly — ${PRICING.monthly.amount}/mo
        </button>
        <button
          onClick={() => upgrade("yearly")}
          disabled={pending !== null}
          className={
            highlight === "yearly" ? "btn btn-primary flex-1" : "btn btn-ghost flex-1"
          }
        >
          {pending === "yearly" && <Loader2 className="h-4 w-4 animate-spin" />}
          Pro Yearly — ${PRICING.yearly.amount}/yr
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <p className="mt-3 text-xs text-faint">
        Test mode — use card 4242 4242 4242 4242, any future expiry, any CVC.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function CancelResumeButton({
  cancelAtPeriodEnd,
}: {
  cancelAtPeriodEnd: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function run(action: "cancel" | "resume") {
    setPending(true);
    setError(null);
    try {
      await post("/api/stripe/subscription", { action });
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  if (cancelAtPeriodEnd) {
    return (
      <div>
        <button
          onClick={() => run("resume")}
          disabled={pending}
          className="btn btn-primary"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Resume subscription
        </button>
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">
            Keep Pro until the period ends, then downgrade?
          </span>
          <button
            onClick={() => run("cancel")}
            disabled={pending}
            className="btn btn-danger"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Yes, cancel
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="btn btn-ghost"
          >
            Keep Pro
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="btn btn-danger">
          Cancel subscription
        </button>
      )}
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function PortalButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setPending(true);
    setError(null);
    try {
      const { url } = await post("/api/stripe/portal");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setPending(false);
    }
  }

  return (
    <div>
      <button onClick={open} disabled={pending} className="btn btn-ghost">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        Invoices & payment method
      </button>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * After returning from Stripe Checkout the webhook may land a second
 * or two later than the redirect. While the plan is still FREE, poll
 * by refreshing the server components a few times.
 */
export function PlanRefresher({ active }: { active: boolean }) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > 15) {
        clearInterval(id);
        return;
      }
      router.refresh();
    }, 2000);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
