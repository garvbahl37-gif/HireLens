"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

export function KeywordGaps({
  missing,
  matched,
}: {
  missing: string[];
  matched: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
      className="card flex w-full min-w-0 flex-1 flex-col p-6"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium tracking-tight">Keyword gaps</h2>
        <p className="text-sm text-faint">Latest review</p>
      </div>

      {missing.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-good">
          <Check className="h-4 w-4" /> No gaps — you hit every keyword.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            Terms in the job description your resume never says.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {missing.map((k, i) => (
              <motion.span
                key={k}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05, ease: EASE }}
                className="chip border-bad/30 text-bad"
              >
                {k}
              </motion.span>
            ))}
          </div>
        </>
      )}

      {missing.length + matched.length > 0 && (
        <CoverageGauge matched={matched.length} total={missing.length + matched.length} />
      )}

      {matched.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-semibold text-muted">
            Already matched{" "}
            <span className="text-good">{matched.length}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {matched.slice(0, 6).map((k) => (
              <span key={k} className="chip border-good/25 text-good">
                {k}
              </span>
            ))}
            {matched.length > 6 && (
              <span className="chip text-faint">+{matched.length - 6}</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Semicircle gauge of keyword coverage — the share of the job description's
 * keywords the resume already uses — after the reference's match gauge.
 */
function CoverageGauge({ matched, total }: { matched: number; total: number }) {
  const pct = Math.round((matched / total) * 100);
  const r = 70;
  const len = Math.PI * r;

  return (
    <div className="my-auto flex flex-col items-center py-6">
      <svg viewBox="0 0 180 100" className="w-48" aria-hidden>
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="var(--color-ink)"
          strokeOpacity={0.08}
          strokeWidth={14}
          strokeLinecap="round"
        />
        <motion.path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="#2a9d36"
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={len}
          initial={{ strokeDashoffset: len }}
          animate={{ strokeDashoffset: len * (1 - pct / 100) }}
          transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
        />
      </svg>
      <p className="-mt-11 text-3xl font-light tabular-nums">{pct}%</p>
      <p className="mt-4 text-sm text-muted">
        keyword coverage, {matched} of {total}
      </p>
    </div>
  );
}
