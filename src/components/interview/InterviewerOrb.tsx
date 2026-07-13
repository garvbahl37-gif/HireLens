"use client";

import { motion } from "motion/react";

export type OrbState = "idle" | "thinking" | "speaking";

/**
 * The interviewer's presence.
 *
 * A calm ember orb that reads its own state without a word: it breathes when
 * idle, ripples concentric rings while speaking, and pulses a tight core while
 * thinking. Giving the AI a body on screen is what turns a chat log into an
 * interview — you feel someone is across the table.
 */
export function InterviewerOrb({
  state = "idle",
  size = 44,
}: {
  state?: OrbState;
  size?: number;
}) {
  const speaking = state === "speaking";
  const thinking = state === "thinking";

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* soft ember glow — brightens while active */}
      <motion.div
        className="absolute inset-0 rounded-full blur-md"
        style={{ background: "var(--color-accent)" }}
        animate={{
          opacity: speaking ? [0.35, 0.6, 0.35] : thinking ? [0.3, 0.45, 0.3] : [0.18, 0.3, 0.18],
          scale: speaking ? [1, 1.18, 1] : [1, 1.06, 1],
        }}
        transition={{
          duration: speaking ? 1.1 : thinking ? 1.4 : 3.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* concentric ripples while speaking */}
      {speaking &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border border-accent/50"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut",
            }}
          />
        ))}

      {/* rotating conic rim */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, var(--color-accent), var(--color-accent2), var(--color-accent))",
          padding: 1.5,
          WebkitMask:
            "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px))",
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: speaking ? 4 : thinking ? 6 : 14,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* glass core */}
      <div
        className="absolute inset-[3px] flex items-center justify-center rounded-full border border-accent/20"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-accent) 30%, transparent), color-mix(in srgb, var(--color-bg) 92%, transparent))",
        }}
      >
        {/* the voice: a little equaliser that only moves while speaking */}
        <div
          className="flex items-center gap-[2px]"
          style={{ height: size * 0.32 }}
        >
          {[0.5, 0.85, 1, 0.7, 0.45].map((base, i) => (
            <motion.span
              key={i}
              className="w-[2px] rounded-full bg-accent"
              style={{ height: "100%" }}
              animate={
                speaking
                  ? { scaleY: [base * 0.3, base, base * 0.4, base * 0.9, base * 0.3] }
                  : thinking
                    ? { scaleY: [0.25, 0.25, 0.25] }
                    : { scaleY: [0.28, 0.42, 0.28] }
              }
              transition={{
                duration: speaking ? 0.7 : 2.6,
                repeat: Infinity,
                delay: i * (speaking ? 0.08 : 0.12),
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
