import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Minus, ArrowLeft } from "lucide-react";
import type { RescoreDelta } from "@/lib/rescore";
import { cn } from "@/lib/cn";

/**
 * The before/after headline on a re-scored review: parent score → this score,
 * with the real, measured delta and the concrete things that moved it.
 *
 * When the two runs aren't comparable (a different model or prompt version ran
 * between them), we say so plainly rather than show a delta that would be
 * noise — the whole product refuses to present a number it can't stand behind.
 */
export function RescoreBanner({
  delta,
  parentReviewId,
}: {
  delta: RescoreDelta;
  parentReviewId: string;
}) {
  const up = delta.scoreDelta > 0;
  const flat = delta.scoreDelta === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const tone = flat ? "text-muted" : up ? "text-good" : "text-bad";

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-extrabold tabular-nums text-faint">
              {delta.from}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-faint">
              before
            </p>
          </div>
          <Icon className={cn("h-6 w-6 shrink-0", tone)} />
          <div className="text-center">
            <p className="text-3xl font-extrabold tabular-nums text-ink">
              {delta.to}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-faint">
              after
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {delta.comparable ? (
            <>
              <p className="font-bold">
                <span className={tone}>
                  {up ? "+" : ""}
                  {delta.scoreDelta}
                </span>{" "}
                {flat
                  ? "— same score"
                  : up
                    ? "on the same job"
                    : "— that edit cost you"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {[
                  delta.keywordsResolved.length > 0 &&
                    `${delta.keywordsResolved.length} missing keyword${
                      delta.keywordsResolved.length === 1 ? "" : "s"
                    } resolved`,
                  delta.dimensions.filter((d) => d.to > d.from).length > 0 &&
                    `${
                      delta.dimensions.filter((d) => d.to > d.from).length
                    } dimension${
                      delta.dimensions.filter((d) => d.to > d.from).length === 1
                        ? ""
                        : "s"
                    } up`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "The measurable signals held steady."}
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              Re-scored on a different model or prompt version, so this
              isn&rsquo;t directly comparable to the original — we won&rsquo;t
              show a delta we can&rsquo;t stand behind.
            </p>
          )}
        </div>

        <Link
          href={`/dashboard/reviews/${parentReviewId}`}
          className="btn btn-ghost shrink-0"
        >
          <ArrowLeft className="h-4 w-4" /> Original
        </Link>
      </div>

      {delta.comparable && delta.keywordsResolved.length > 0 && (
        <div className="border-t border-edge px-6 py-4 sm:px-8">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-faint">
            Now matched
          </p>
          <div className="flex flex-wrap gap-2">
            {delta.keywordsResolved.map((k) => (
              <span key={k} className="chip border-good/30 text-good">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
