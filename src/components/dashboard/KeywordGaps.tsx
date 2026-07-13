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
      className="card flex flex-1 flex-col p-6"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">Keyword gaps</h2>
        <p className="text-xs text-faint">latest review</p>
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

      {matched.length > 0 && (
        <div className="mt-auto pt-5">
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
