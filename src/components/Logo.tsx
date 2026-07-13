"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The lens: an aperture ring around a glass disc, with the score bars the
 * product actually produces rising inside it, plus a specular highlight so
 * the glass reads as glass. Draws itself in on mount; on hover the aperture
 * tightens and the highlight sweeps.
 */
export function LogoMark({
  className,
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <motion.svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn("h-8 w-8", className)}
      aria-hidden
      initial={animate ? "hidden" : false}
      animate="show"
      whileHover="hover"
    >
      <defs>
        {/* Ember-forward: the light sand stop is held to the very top-left so
            the mass of the rim reads as the brand accent, not peach. */}
        <linearGradient id="hl-rim" x1="6" y1="4" x2="30" y2="34">
          <stop offset="0%" stopColor="#ffb877" />
          <stop offset="28%" stopColor="#f2622e" />
          <stop offset="100%" stopColor="#e04a1c" />
        </linearGradient>

        {/* the glass itself — warm, dark, translucent */}
        <radialGradient id="hl-glass" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ff9a4f" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#f2622e" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#100c0a" stopOpacity="0.55" />
        </radialGradient>

        <linearGradient id="hl-spec" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        <clipPath id="hl-clip">
          <circle cx="17" cy="17" r="11.5" />
        </clipPath>
      </defs>

      {/* handle, tucked under the rim */}
      <motion.path
        d="M26.5 26.5 L35 35"
        stroke="url(#hl-rim)"
        strokeWidth="3.4"
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

      {/* glass disc */}
      <motion.circle
        cx="17"
        cy="17"
        r="11.5"
        fill="url(#hl-glass)"
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
            fill="url(#hl-rim)"
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
        stroke="url(#hl-rim)"
        strokeWidth="2.8"
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

      {/* specular highlight — sweeps across on hover */}
      <motion.ellipse
        cx="12.5"
        cy="11.5"
        rx="4.2"
        ry="2.6"
        fill="url(#hl-spec)"
        transform="rotate(-38 12.5 11.5)"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 0.55, transition: { delay: 0.7, duration: 0.4 } },
          hover: {
            opacity: [0.55, 0.95, 0.55],
            x: [0, 9, 0],
            transition: { duration: 0.9, ease: "easeInOut" },
          },
        }}
      />
    </motion.svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-bold tracking-tight">
        Hire<span className="text-gradient">Lens</span>
      </span>
    </Link>
  );
}
