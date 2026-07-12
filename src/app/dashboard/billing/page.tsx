import type { Metadata } from "next";
import { AlertCircle, BadgeCheck, PartyPopper, Sparkles } from "lucide-react";
import {
  CancelResumeButton,
  PlanRefresher,
  PortalButton,
  UpgradeButtons,
} from "@/components/BillingActions";
import { getCurrentUser } from "@/lib/auth";
import { FREE_MONTHLY_LIMIT, PRICING } from "@/lib/plans";
import { monthlyReviewCount } from "@/lib/usage";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    upgraded?: string;
    checkout?: string;
    intent?: string;
    interval?: string;
  }>;
}) {
  const params = await searchParams;
  const user = (await getCurrentUser())!;
  const used = await monthlyReviewCount(user.id);

  const justUpgraded = params.upgraded === "1";
  const waitingForWebhook = justUpgraded && user.plan === "FREE";
  const highlightInterval =
    params.interval === "yearly" ? ("yearly" as const) : ("monthly" as const);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PlanRefresher active={waitingForWebhook} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Your plan, usage, and subscription.
        </p>
      </div>

      {/* ---------- banners ---------- */}
      {justUpgraded && user.plan === "PRO" && (
        <div className="card flex items-center gap-3 border-good/40 bg-good/5 p-5">
          <PartyPopper className="h-5 w-5 shrink-0 text-good" />
          <div>
            <p className="font-bold text-good">Welcome to Pro!</p>
            <p className="text-sm text-muted">
              Unlimited reviews and the full deep analysis are unlocked.
            </p>
          </div>
        </div>
      )}
      {waitingForWebhook && (
        <div className="card flex items-center gap-3 border-warn/40 bg-warn/5 p-5">
          <AlertCircle className="h-5 w-5 shrink-0 animate-pulse text-warn" />
          <div>
            <p className="font-bold text-warn">Payment received</p>
            <p className="text-sm text-muted">
              Finalizing your upgrade — this page will update automatically in
              a few seconds.
            </p>
          </div>
        </div>
      )}
      {params.checkout === "canceled" && (
        <div className="card flex items-center gap-3 p-5">
          <AlertCircle className="h-5 w-5 shrink-0 text-muted" />
          <p className="text-sm text-muted">
            Checkout canceled — no changes were made.
          </p>
        </div>
      )}

      {/* ---------- current plan ---------- */}
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Current plan
            </p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-extrabold">
              {user.plan === "PRO" ? (
                <>
                  <Sparkles className="h-5 w-5 text-accent" /> Pro
                </>
              ) : (
                "Starter (Free)"
              )}
            </p>
          </div>
          {user.plan === "PRO" && (
            <span
              className={
                user.cancelAtPeriodEnd
                  ? "chip border-warn/40 text-warn"
                  : "chip border-good/40 text-good"
              }
            >
              <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
              {user.cancelAtPeriodEnd ? "Cancels at period end" : "Active"}
            </span>
          )}
        </div>

        {user.plan === "PRO" ? (
          <div className="mt-5 space-y-1.5 text-sm text-muted">
            {user.stripeCurrentPeriodEnd && (
              <p>
                {user.cancelAtPeriodEnd
                  ? "Pro access ends on "
                  : "Renews on "}
                <span className="font-semibold text-ink">
                  {user.stripeCurrentPeriodEnd.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}
            <p>Unlimited reviews · deep analysis on every run</p>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted">Reviews used this month</span>
              <span className="font-bold">
                {Math.min(used, FREE_MONTHLY_LIMIT)}/{FREE_MONTHLY_LIMIT}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-edge">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent2"
                style={{
                  width: `${Math.min(100, (used / FREE_MONTHLY_LIMIT) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ---------- upgrade / manage ---------- */}
      {user.plan === "FREE" ? (
        <div
          className={
            params.intent === "pro"
              ? "card border-accent/60 p-6 shadow-[0_0_50px_-18px_var(--color-accent)] sm:p-8"
              : "card p-6 sm:p-8"
          }
        >
          <h2 className="font-bold">
            {params.intent === "pro"
              ? "Finish upgrading to Pro"
              : "Upgrade to Pro"}
          </h2>
          <p className="mb-6 mt-1 text-sm text-muted">
            Unlimited reviews, line-by-line rewrites, ATS checklist, interview
            prep. ${PRICING.monthly.amount}/month or ${PRICING.yearly.amount}
            /year.
          </p>
          <UpgradeButtons highlight={highlightInterval} />
        </div>
      ) : (
        <div className="card space-y-5 p-6 sm:p-8">
          <h2 className="font-bold">Manage subscription</h2>
          <div className="flex flex-wrap items-center gap-3">
            <CancelResumeButton cancelAtPeriodEnd={user.cancelAtPeriodEnd} />
            <PortalButton />
          </div>
          {user.cancelAtPeriodEnd && (
            <p className="text-sm text-muted">
              You keep Pro until the end of the paid period, then drop to the
              free plan automatically. Changed your mind? Resume any time
              before then.
            </p>
          )}
        </div>
      )}

      <p className="text-center text-xs text-faint">
        All payments run through Stripe in test mode — no real money moves.
      </p>
    </div>
  );
}
