"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/cn";

export const EASE = [0.16, 1, 0.3, 1] as const;

/* Words don't rise from one shared baseline in the reference — each starts at
   its own height, so the line settles like type dropped into place. */
const OFFSETS = [22, 34, 14, 28, 40, 18, 30, 12, 26, 36];

/**
 * Load-time headline reveal: every word rises out of a blur, staggered.
 * `lines` are rendered as separate block rows.
 */
export function BlurWords({
  lines,
  delay = 0,
  className,
}: {
  lines: string[];
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  let n = 0;
  return (
    <span className={className}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(" ").map((w, wi, arr) => {
            const i = n++;
            return (
              <motion.span
                key={wi}
                className="inline-block"
                initial={
                  reduce ? false : { opacity: 0, y: OFFSETS[i % OFFSETS.length], filter: "blur(10px)" }
                }
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.95, delay: delay + i * 0.085, ease: EASE }}
              >
                {w}
                {wi < arr.length - 1 ? " " : ""}
              </motion.span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

/**
 * Scroll-scrubbed heading reveal: as the heading travels up the viewport each
 * word goes from faint and dropped to solid and seated, one after another.
 * Scrolling back reverses it, exactly as in the reference.
 */
export function ScrollWords({
  lines,
  className,
}: {
  lines: string[];
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.95", "start 0.42"],
  });

  const total = lines.reduce((s, l) => s + l.split(" ").length, 0);
  let n = 0;

  return (
    <span ref={ref} className={className}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(" ").map((w, wi, arr) => {
            const i = n++;
            return (
              <ScrollWord
                key={wi}
                progress={scrollYProgress}
                start={i / total}
                end={Math.min(1, (i + 1.6) / total)}
                offset={OFFSETS[i % OFFSETS.length] * 0.6}
                still={!!reduce}
              >
                {w}
                {wi < arr.length - 1 ? " " : ""}
              </ScrollWord>
            );
          })}
        </span>
      ))}
    </span>
  );
}

function ScrollWord({
  children,
  progress,
  start,
  end,
  offset,
  still,
}: {
  children: ReactNode;
  progress: MotionValue<number>;
  start: number;
  end: number;
  offset: number;
  still: boolean;
}) {
  const opacity = useTransform(progress, [start, end], [0.14, 1]);
  const y = useTransform(progress, [start, end], [offset, 0]);
  return (
    <motion.span className="inline-block" style={still ? undefined : { opacity, y }}>
      {children}
    </motion.span>
  );
}

/** Rises into place the first time it scrolls into view. */
export function Rise({
  children,
  y = 48,
  delay = 0,
  duration = 0.9,
  className,
}: {
  children: ReactNode;
  y?: number;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Counts up to `to` the first time it scrolls into view. */
export function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.8,
      ease: EASE,
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}
