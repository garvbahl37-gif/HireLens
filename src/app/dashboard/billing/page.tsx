import type { Metadata } from "next";
import {
  AlertCircle,
  BadgeCheck,
  PartyPopper,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  CancelResumeButton,
  PlanRefresher,
  PortalButton,
  UpgradeButtons,
} from "@/components/BillingActions";
import { requireUser } from "@/lib/auth";
import { isDemoBilling } from "@/lib/demo-billing";
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
  const user = await requireUser();
  const used = await monthlyReviewCount(user.id);
  const demoBilling = isDemoBilling();

  const justUpgraded = params.upgraded === "1";
  const waitingForWebhook = justUpgraded && user.plan === "FREE";
  const highlightInterval =
    params.interval === "yearly" ? ("yearly" as const) : ("monthly" as const);

  const isPro = user.plan === "PRO";
  const periodEnd = user.stripeCurrentPeriodEnd?.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <PlanRefresher active={waitingForWebhook} />

      {/* ---------- current plan: Pro gets the forest card ---------- */}
      {isPro ? (
        <section className="card-forest p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">Current plan</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-light tracking-tight">
                <Sparkles className="h-5 w-5 text-neon" /> Pro
              </p>
            </div>
            <span className="chip gap-1.5 border-white/20 bg-white/10 px-3 py-1 text-sm text-white">
              {user.cancelAtPeriodEnd ? (
                <AlertCircle className="h-3.5 w-3.5 text-white" />
              ) : (
                <BadgeCheck className="h-3.5 w-3.5 text-neon" />
              )}
              {user.cancelAtPeriodEnd ? "Cancels at period end" : "Active"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 border-t border-white/15 pt-5 sm:grid-cols-2">
            {periodEnd && (
              <div>
                <p className="text-sm text-white/70">
                  {user.cancelAtPeriodEnd ? "Pro access ends on" : "Renews on"}
                </p>
                <p className="mt-1 font-medium">{periodEnd}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-white/70">Included</p>
              <p className="mt-1 font-medium">Unlimited reviews · deep analysis on every run</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="card p-6 sm:p-7">
          <p className="text-sm text-muted">Current plan</p>
          <p className="mt-1 text-3xl font-light tracking-tight">Starter (Free)</p>
          <div className="mt-6">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted">Reviews used this month</span>
              <span className="font-semibold tabular-nums">
                {Math.min(used, FREE_MONTHLY_LIMIT)}/{FREE_MONTHLY_LIMIT}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent2"
                style={{
                  width: `${Math.min(100, (used / FREE_MONTHLY_LIMIT) * 100)}%`,
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* ---------- banners ---------- */}
      {justUpgraded && isPro && (
        <Notice icon={<PartyPopper className="h-4 w-4 text-good" />} title="Welcome to Pro!">
          Unlimited reviews and the full deep analysis are unlocked.
        </Notice>
      )}
      {waitingForWebhook && (
        <Notice
          icon={<AlertCircle className="h-4 w-4 animate-pulse text-warn" />}
          title="Payment received"
        >
          Finalizing your upgrade — this page will update automatically in a few
          seconds.
        </Notice>
      )}
      {params.checkout === "canceled" && (
        <Notice icon={<AlertCircle className="h-4 w-4 text-muted" />}>
          Checkout canceled — no changes were made.
        </Notice>
      )}

      {/* said plainly before any checkout button */}
      {demoBilling && (
        <Notice
          icon={<ShieldAlert className="h-4 w-4 text-warn" />}
          title="Billing is in demo mode"
        >
          No Stripe account is connected to this deployment, so checkout is
          simulated and nothing is ever charged. The upgrade still runs through
          the real path: a <Code>checkout.session.completed</Code> event goes
          through the same webhook handler, which is what flips your plan to Pro
          in the database. Set <Code>STRIPE_SECRET_KEY</Code> to switch to live
          Stripe test mode with no code change.
        </Notice>
      )}

      {/* ---------- upgrade / manage ---------- */}
      {!isPro ? (
        <section
          className={
            params.intent === "pro"
              ? "card p-6 ring-2 ring-accent2/50 sm:p-7"
              : "card p-6 sm:p-7"
          }
        >
          <h2 className="text-lg font-medium tracking-tight">
            {params.intent === "pro"
              ? "Finish upgrading to Pro"
              : "Upgrade to Pro"}
          </h2>
          <p className="mb-6 mt-1 text-sm text-muted">
            Unlimited reviews, line-by-line rewrites, ATS checklist, interview
            prep. ${PRICING.monthly.amount}/month or ${PRICING.yearly.amount}
            /year.
          </p>
          <UpgradeButtons highlight={highlightInterval} demo={demoBilling} />
        </section>
      ) : (
        <section className="card space-y-5 p-6 sm:p-7">
          <h2 className="text-lg font-medium tracking-tight">Manage subscription</h2>
          <div className="flex flex-wrap items-center gap-3">
            <CancelResumeButton cancelAtPeriodEnd={user.cancelAtPeriodEnd} />
            {/* The hosted Stripe portal only exists with a real Stripe account. */}
            {!demoBilling && <PortalButton />}
          </div>
          {user.cancelAtPeriodEnd && (
            <p className="text-sm text-muted">
              You keep Pro until the end of the paid period, then drop to the
              free plan automatically. Changed your mind? Resume any time
              before then.
            </p>
          )}
        </section>
      )}

      <p className="pt-2 text-center text-xs text-faint">
        All payments run through Stripe in test mode — no real money moves.
      </p>
    </div>
  );
}

/** A glass notice row: a round icon, an optional title, a line or two of text. */
function Notice({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex items-start gap-3.5 p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70">
        {icon}
      </span>
      <div className="min-w-0 text-sm">
        {title && <p className="font-semibold text-ink">{title}</p>}
        <p className={title ? "mt-1 leading-relaxed text-muted" : "mt-2 leading-relaxed text-muted"}>
          {children}
        </p>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-white/80 bg-white/70 px-1.5 py-0.5 text-xs text-ink">
      {children}
    </code>
  );
}
