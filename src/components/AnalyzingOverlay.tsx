"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Shown while the analysis is in flight (typically 3–20s). The steps are
 * paced to the real pipeline order, but they are a narration of work that is
 * genuinely happening server-side — not a fake progress bar that completes on
 * a timer. The overlay only clears when the request actually resolves.
 */
const STEPS = [
  "Extracting your resume text",
  "Parsing it the way an ATS would",
  "Matching against the job description",
  "Scoring five dimensions",
  "Writing your prioritized fix list",
];

export function AnalyzingOverlay({ deep }: { deep: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Advance through the narration, but hold on the last step for as long as
    // the request actually takes — never claim to be finished.
    const t = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 px-5 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="card relative w-full max-w-md overflow-hidden p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent)",
          }}
        />

        {/* the lens sweeping a document */}
        <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
          <ScanningLens />
        </div>

        <p className="relative mt-6 text-center text-lg font-bold tracking-tight">
          {deep ? "Running deep analysis" : "Analyzing your resume"}
        </p>
        <p className="relative mt-1 text-center text-sm text-muted">
          This usually takes a few seconds.
        </p>

        {/* step narration */}
        <ul className="relative mt-6 space-y-2.5">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <motion.li
                key={s}
                initial={{ opacity: 0, x: -6 }}
                animate={{
                  opacity: done ? 0.45 : active ? 1 : 0.3,
                  x: 0,
                }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex items-center gap-2.5 text-sm"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <AnimatePresence mode="wait">
                    {done ? (
                      <motion.span
                        key="done"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-good"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </motion.span>
                    ) : active ? (
                      <motion.span
                        key="active"
                        className="h-1.5 w-1.5 rounded-full bg-accent"
                        animate={{ scale: [1, 1.7, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    ) : (
                      <span
                        key="idle"
                        className="h-1.5 w-1.5 rounded-full bg-edge2"
                      />
                    )}
                  </AnimatePresence>
                </span>
                <span className={active ? "font-semibold" : "text-muted"}>
                  {s}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </motion.div>
    </motion.div>
  );
}

/** A lens sweeping across document lines, revealing them as it passes. */
function ScanningLens() {
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32">
      <defs>
        <linearGradient id="scan-rim" x1="0" y1="0" x2="120" y2="120">
          <stop offset="0%" stopColor="#ffb877" />
          <stop offset="55%" stopColor="#f2622e" />
          <stop offset="100%" stopColor="#ff9a4f" />
        </linearGradient>
        <clipPath id="scan-doc">
          <rect x="30" y="22" width="60" height="76" rx="6" />
        </clipPath>
      </defs>

      {/* the document */}
      <rect
        x="30"
        y="22"
        width="60"
        height="76"
        rx="6"
        fill="var(--color-card2)"
        stroke="var(--color-edge2)"
        strokeWidth="1.5"
      />

      {/* its lines */}
      <g clipPath="url(#scan-doc)">
        {Array.from({ length: 9 }).map((_, i) => (
          <rect
            key={i}
            x="38"
            y={32 + i * 8}
            width={i % 3 === 2 ? 26 : 44}
            height="3"
            rx="1.5"
            fill="var(--color-edge2)"
          />
        ))}

        {/* the scan band travelling down the page */}
        <motion.rect
          x="30"
          width="60"
          height="18"
          fill="url(#scan-rim)"
          opacity="0.22"
          animate={{ y: [16, 92, 16] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </g>

      {/* the lens riding the scan */}
      <motion.g
        animate={{ y: [-8, 62, -8] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle
          cx="60"
          cy="34"
          r="15"
          fill="var(--color-accent)"
          fillOpacity="0.08"
          stroke="url(#scan-rim)"
          strokeWidth="2.6"
        />
        <path
          d="M71 45 L79 53"
          stroke="url(#scan-rim)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <ellipse
          cx="54"
          cy="29"
          rx="4.5"
          ry="2.8"
          fill="#fff"
          opacity="0.5"
          transform="rotate(-38 54 29)"
        />
      </motion.g>
    </svg>
  );
}
