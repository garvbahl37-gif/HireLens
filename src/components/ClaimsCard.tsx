import Link from "next/link";
import { Crosshair, Quote, ArrowRight } from "lucide-react";
import type { Claim } from "@/lib/ai";
import { CLAIM_KIND_LABELS } from "@/lib/ai";
import { cn } from "@/lib/cn";

/**
 * The claims a recruiter will make the candidate prove.
 *
 * This is the hinge of the whole product: the resume review and the mock
 * interview stop being two separate tools the moment these appear on the review
 * page with a button that carries them into an interview. It is deliberately
 * valuable on its own — "here are the six sentences you will be asked to defend"
 * is worth screenshotting even if the interview is never started — which is why
 * it renders for every plan, not behind the Pro wall.
 *
 * `whatsMissing` is framed as the evidence a recruiter will ask for, never as
 * an accusation that the claim is false. The distinction is the feature: this
 * is the only tool that tells you what is missing *behind* your own numbers.
 */

const RISK_RANK: Record<Claim["risk"], number> = { high: 0, medium: 1, low: 2 };

const RISK_STYLES: Record<Claim["risk"], string> = {
  high: "text-bad border-bad/40 bg-bad/10",
  medium: "text-warn border-warn/40 bg-warn/10",
  low: "text-muted border-edge bg-card2",
};

// The rail colour is the same grammar the report's audit uses for verdicts:
// here it's how exposed the claim is; there it's how well it held up. Same
// visual language on both ends of the loop.
const RISK_RAIL: Record<Claim["risk"], string> = {
  high: "bg-bad",
  medium: "bg-warn",
  low: "bg-edge2",
};

const RISK_LABEL: Record<Claim["risk"], string> = {
  high: "They will ask",
  medium: "Likely asked",
  low: "Stands on its own",
};

export function ClaimsCard({
  claims,
  reviewId,
}: {
  claims: Claim[];
  /** When present, the CTA launches an interview pre-aimed at this review. */
  reviewId?: string;
}) {
  if (claims.length === 0) return null;

  // Riskiest first — the ones a recruiter is most likely to corner them on.
  const ordered = [...claims].sort(
    (a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk]
  );

  const launchHref = reviewId
    ? `/dashboard/interview/new?reviewId=${encodeURIComponent(reviewId)}`
    : "/dashboard/interview/new";

  return (
    <div className="card relative overflow-hidden border-accent/40 p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full opacity-[0.15] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-accent), transparent)",
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <Crosshair className="h-4 w-4 text-accent" />
              The claims a recruiter will make you prove
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
              These are pulled verbatim from your resume. In a real screen,
              you&rsquo;ll be asked to back each one up. Here&rsquo;s what
              you&rsquo;ll need — and what&rsquo;s not on the page yet.
            </p>
          </div>
          <span className="chip shrink-0 border-accent/30 text-accent">
            {claims.length}
          </span>
        </div>

        <ul className="mt-6 space-y-3">
          {ordered.map((c) => (
            <li
              key={c.text}
              className="flex gap-4 rounded-xl border border-edge bg-surface p-4"
            >
              <span
                className={cn(
                  "mt-0.5 w-1 shrink-0 rounded-full",
                  RISK_RAIL[c.risk]
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip border-edge2 px-2 py-0 text-[10px] uppercase tracking-wider text-faint">
                    {CLAIM_KIND_LABELS[c.kind]}
                  </span>
                  <span
                    className={cn(
                      "chip px-2 py-0 text-[10px] uppercase tracking-wider",
                      RISK_STYLES[c.risk]
                    )}
                  >
                    {RISK_LABEL[c.risk]}
                  </span>
                </div>

                <p className="mt-2.5 flex gap-2 text-sm font-medium leading-relaxed text-ink">
                  <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
                  <span>{c.text}</span>
                </p>

                {c.whatsMissing && (
                  <p className="mt-2 pl-[1.375rem] text-xs leading-relaxed text-muted">
                    <span className="font-semibold text-warn">
                      What&rsquo;s missing:
                    </span>{" "}
                    {c.whatsMissing}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-faint">
            The interviewer will quote these back at you, by name.
          </p>
          <Link href={launchHref} className="btn btn-primary shrink-0">
            Defend these {claims.length} claims
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
