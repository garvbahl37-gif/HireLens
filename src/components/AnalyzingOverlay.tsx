"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  // Portalled to <body>: the route wrapper keeps a transform from its fade-in,
  // and a transformed ancestor turns `position: fixed` into "fixed to that
  // wrapper" — on a long page the card ended up centred off-screen. This only
  // mounts after a submit, so `document` is always there.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 px-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="card relative w-full max-w-md overflow-hidden bg-white/80 p-6 sm:p-8"
      >
        {/* the lens sweeping a document, on a pale glass disc */}
        <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-white/80 bg-white/60 shadow-[0_0_0_8px_rgba(255,255,255,0.35),0_0_50px_-6px_rgba(69,230,36,0.35)]">
          <ScanningLens />
        </div>

        <p className="relative mt-6 text-center text-xl font-medium tracking-tight">
          {deep ? "Running deep analysis" : "Analyzing your resume"}
        </p>
        <p className="relative mt-1 text-center text-sm text-muted">
          This usually takes a few seconds.
        </p>

        {/* step narration */}
        <ul className="relative mt-6 space-y-1.5 rounded-2xl border border-white/80 bg-white/50 p-4">
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
                        className="h-1.5 w-1.5 rounded-full bg-accent2 shadow-[0_0_8px_1px_rgba(69,230,36,0.6)]"
                        animate={{ scale: [1, 1.7, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    ) : (
                      <span
                        key="idle"
                        className="h-1.5 w-1.5 rounded-full bg-ink/20"
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
    </motion.div>,
    document.body
  );
}

/** A lens sweeping across document lines, revealing them as it passes. */
function ScanningLens() {
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32">
      <defs>
        <linearGradient id="scan-rim" x1="0" y1="0" x2="120" y2="120">
          <stop offset="0%" stopColor="#7af55b" />
          <stop offset="55%" stopColor="#2a9d36" />
          <stop offset="100%" stopColor="#17891f" />
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
        fill="#ffffff"
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
