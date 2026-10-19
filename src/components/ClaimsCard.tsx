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
  high: "text-bad border-bad/30 bg-bad/10",
  medium: "text-warn border-warn/30 bg-warn/10",
  low: "text-muted border-white/80 bg-white/60",
};

// The rail colour is the same grammar the report's audit uses for verdicts:
// here it's how exposed the claim is; there it's how well it held up. Same
// visual language on both ends of the loop.
const RISK_RAIL: Record<Claim["risk"], string> = {
  high: "bg-bad",
  medium: "bg-warn",
  low: "bg-ink/15",
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
    <section className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-lg font-medium tracking-tight">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70 text-accent">
              <Crosshair className="h-4 w-4" />
            </span>
            The claims a recruiter will make you prove
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            These are pulled verbatim from your resume. In a real screen,
            you&rsquo;ll be asked to back each one up. Here&rsquo;s what
            you&rsquo;ll need — and what&rsquo;s not on the page yet.
          </p>
        </div>
        <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-pill px-2.5 text-sm font-semibold tabular-nums text-white">
          {claims.length}
        </span>
      </div>

      <ul className="mt-5 space-y-2.5">
        {ordered.map((c) => (
          <li
            key={c.text}
            className="flex gap-4 rounded-2xl border border-white/80 bg-white/50 p-4"
          >
            <span
              className={cn("w-1 shrink-0 rounded-full", RISK_RAIL[c.risk])}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip px-2.5 py-0.5 text-xs text-muted">
                  {CLAIM_KIND_LABELS[c.kind]}
                </span>
                <span
                  className={cn(
                    "chip px-2.5 py-0.5 text-xs",
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

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          The interviewer will quote these back at you, by name.
        </p>
        <Link href={launchHref} className="btn btn-primary shrink-0">
          Defend these {claims.length} claims
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
