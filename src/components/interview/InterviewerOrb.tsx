"use client";

import { motion } from "motion/react";

export type OrbState = "idle" | "thinking" | "speaking";

/**
 * The interviewer's presence.
 *
 * The same pearl as the assistant orb (globals.css `.orb`): a bead of white
 * light with a green swirl turning inside it. It reads its own state without a
 * word: it breathes slowly when idle, the swirl quickens and a tight glow pulses
 * while thinking, and while speaking it ripples rings outward and a little
 * white equaliser moves inside it. Giving the AI a body on screen is what turns
 * a chat log into an interview — you feel someone is across the table.
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
  // The swirl's softness scales with the orb so a 30px chip and a 96px hero
  // read as the same object.
  const blur = Math.max(1.5, size * 0.07);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* halo — white light with a neon edge, brightens while active */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgb(255 255 255 / 0.9) 0%, rgb(186 245 166 / 0.55) 45%, rgb(69 230 36 / 0) 72%)",
          filter: `blur(${Math.max(4, size * 0.16)}px)`,
        }}
        animate={{
          opacity: speaking ? [0.55, 0.95, 0.55] : thinking ? [0.45, 0.7, 0.45] : [0.35, 0.5, 0.35],
          scale: speaking ? [1.1, 1.32, 1.1] : [1.05, 1.14, 1.05],
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
            className="absolute inset-0 rounded-full border border-accent2/60"
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut",
            }}
          />
        ))}

      {/* the pearl */}
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          isolation: "isolate",
          // the same white bloom + faint neon as `.orb`, scaled to the size
          boxShadow: `0 0 0 1px rgb(255 255 255 / 0.55), 0 0 ${Math.round(size * 0.36)}px ${Math.round(size * 0.08)}px rgb(255 255 255 / 0.55), 0 0 ${Math.round(size * 0.7)}px ${Math.round(size * 0.06)}px rgb(69 230 36 / 0.22)`,
        }}
        animate={{ scale: speaking ? [1, 1.05, 1] : [1, 1.03, 1] }}
        transition={{
          duration: speaking ? 0.9 : 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* green swirl — turns faster the busier the interviewer is */}
        <motion.div
          className="absolute inset-[6%] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #0b5e14, #45e624, #0e4a12, #7bea5c, #12801c, #b9f5a6, #0b5e14)",
            filter: `blur(${blur}px)`,
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: speaking ? 4 : thinking ? 6 : 12,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* white pearl rim */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0) 50%, rgb(255 255 255 / 0.8) 70%, rgb(255 255 255 / 0.95) 100%)",
          }}
        />

        {/* specular highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 36% 28%, rgb(255 255 255 / 0.9), rgb(255 255 255 / 0) 30%)",
          }}
        />

        {/* the voice: a little equaliser, shown while speaking (and faintly
            while thinking); at rest the orb is just the pearl */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex items-center gap-[2px]"
            style={{ height: size * 0.3, opacity: speaking ? 0.95 : thinking ? 0.5 : 0 }}
          >
            {[0.5, 0.85, 1, 0.7, 0.45].map((base, i) => (
              <motion.span
                key={i}
                className="w-[2px] rounded-full bg-white shadow-[0_0_3px_rgba(11,94,20,0.6)]"
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
      </motion.div>
    </div>
  );
}
