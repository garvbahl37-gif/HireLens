"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { GlossyIcon } from "./GlossyIcon";
import { EASE, ScrollWords } from "./motion";

/**
 * The reference's "Trust and safety" moment: a full-width glass panel with
 * light streaking in from the top corners, and a stack of three cards that
 * fans out as it scrolls into view — the two behind tilting away to either
 * side of the one in front.
 */
export function InterviewShowcase({
  authed,
  freeInterviews,
}: {
  authed: boolean;
  freeInterviews: number;
}) {
  const reduce = useReducedMotion();
  const fan = (rotate: number, x: number) =>
    reduce
      ? { style: { rotate, x } }
      : {
          initial: { rotate: 0, x: 0 },
          whileInView: { rotate, x },
          viewport: { once: true, margin: "-15% 0px" },
          transition: { duration: 1.1, delay: 0.15, ease: EASE },
        };

  return (
    <section id="interview" className="scroll-mt-24 px-3 pt-32 sm:px-4 sm:pt-40">
      <div className="panel overflow-hidden px-5 pb-12 pt-20 sm:pt-24">
        <div className="light-streaks" />

        <h2 className="relative text-center font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
          <ScrollWords lines={["Rehearse against", "a real interviewer"]} />
        </h2>

        <div className="relative mx-auto mt-14 w-full max-w-[25rem]">
          {/* the two cards behind */}
          <motion.div
            aria-hidden
            {...fan(-7, -34)}
            className="glass absolute inset-0 origin-bottom rounded-[1.8rem] opacity-80"
          />
          <motion.div
            aria-hidden
            {...fan(7, 34)}
            className="glass absolute inset-0 origin-bottom rounded-[1.8rem] opacity-80"
          />

          {/* the card in front */}
          <motion.div
            initial={reduce ? false : { y: 60, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 1, ease: EASE }}
            className="glass relative flex flex-col items-center rounded-[1.8rem] px-6 pb-6 pt-9 text-center"
          >
            <h3 className="font-display text-2xl font-medium text-ink">Voice mock interview</h3>
            <p className="mt-3 max-w-[17rem] text-sm leading-relaxed text-muted">
              It reads your resume, asks about the claims on it, and pushes back
              when an answer goes vague.
            </p>
            <GlossyIcon kind="bubble" className="my-10 h-28 w-28" />
            <Link
              href={authed ? "/dashboard/interview/new" : "/signup"}
              className="btn-neon w-full"
            >
              Start a mock interview
            </Link>
          </motion.div>
        </div>

        <p className="relative mt-8 text-center text-sm text-muted">
          {freeInterviews === 1 ? "One mock interview" : `${freeInterviews} mock interviews`} a
          month on the free plan
        </p>
      </div>
    </section>
  );
}
