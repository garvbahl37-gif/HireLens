"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The lens, set in forest green on a glowing neon tile: an aperture ring with
 * the score bars the product actually produces rising inside it. Draws itself
 * in on mount; on hover the aperture tightens and the bars lift.
 */
export function LogoMark({
  className,
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <span className={cn("logo-tile h-9 w-9 shrink-0", className)}>
      <motion.svg
        viewBox="0 0 40 40"
        fill="none"
        className="h-[70%] w-[70%]"
        aria-hidden
        initial={animate ? "hidden" : false}
        animate="show"
        whileHover="hover"
      >
        <defs>
          <clipPath id="hl-clip">
            <circle cx="17" cy="17" r="11.5" />
          </clipPath>
        </defs>

        {/* handle, tucked under the rim */}
        <motion.path
          d="M26.5 26.5 L35 35"
          stroke="#0c2a12"
          strokeWidth="3.6"
          strokeLinecap="round"
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            show: {
              pathLength: 1,
              opacity: 1,
              transition: { duration: 0.5, delay: 0.45, ease: EASE },
            },
          }}
        />

        {/* glass disc — a pale pane so the bars read against it */}
        <motion.circle
          cx="17"
          cy="17"
          r="11.5"
          fill="#ffffff"
          fillOpacity="0.55"
          variants={{
            hidden: { opacity: 0, scale: 0.6 },
            show: {
              opacity: 1,
              scale: 1,
              transition: { duration: 0.5, delay: 0.25, ease: EASE },
            },
          }}
          style={{ transformOrigin: "17px 17px" }}
        />

        {/* the score bars — the thing the lens actually reveals */}
        <g clipPath="url(#hl-clip)">
          {[
            { x: 12, h: 5 },
            { x: 15.6, h: 8.5 },
            { x: 19.2, h: 12 },
          ].map((b, i) => (
            <motion.rect
              key={b.x}
              x={b.x}
              width="2.4"
              rx="1.2"
              fill="#0c2a12"
              variants={{
                hidden: { height: 0, y: 23 },
                show: {
                  height: b.h,
                  y: 23 - b.h,
                  transition: { duration: 0.5, delay: 0.5 + i * 0.08, ease: EASE },
                },
                hover: {
                  height: b.h + 1.6,
                  y: 23 - b.h - 1.6,
                  transition: { duration: 0.28, ease: EASE },
                },
              }}
            />
          ))}
        </g>

        {/* aperture rim */}
        <motion.circle
          cx="17"
          cy="17"
          r="11.5"
          stroke="#0c2a12"
          strokeWidth="3"
          strokeLinecap="round"
          variants={{
            hidden: { pathLength: 0, rotate: -90 },
            show: {
              pathLength: 1,
              rotate: 0,
              transition: { duration: 0.9, ease: EASE },
            },
            hover: { scale: 0.94, transition: { duration: 0.3, ease: EASE } },
          }}
          style={{ transformOrigin: "17px 17px" }}
        />
      </motion.svg>
    </span>
  );
}

export function Logo({
  href = "/",
  tone = "ink",
}: {
  href?: string;
  /** "light" for use on the forest frame or the canopy. */
  tone?: "ink" | "light";
}) {
  return (
    <Link href={href} className="group -my-1.5 flex items-center gap-2.5 py-1.5">
      <LogoMark />
      <span
        className={cn(
          "text-lg font-bold tracking-tight",
          tone === "light" ? "text-white" : "text-ink"
        )}
      >
        HireLens
      </span>
    </Link>
  );
}
