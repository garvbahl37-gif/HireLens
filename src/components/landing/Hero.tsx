"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { CreditCard, Gauge, Gift } from "lucide-react";
import { GlossyIcon, type GlossyKind } from "./GlossyIcon";
import { BlurWords, EASE } from "./motion";

const CARDS: { title: [string, string]; icon: GlossyKind; href: string; cta: string }[] = [
  { title: ["Resume", "Score"], icon: "score", href: "/dashboard/new", cta: "Score it" },
  { title: ["Keyword", "Gaps"], icon: "lens", href: "/dashboard/new", cta: "Find them" },
  { title: ["Mock", "Interview"], icon: "mic", href: "/dashboard/interview/new", cta: "Rehearse" },
  { title: ["Job", "Tracker"], icon: "case", href: "/dashboard/tracker", cta: "Track jobs" },
];

/**
 * The reference's hero: a tall glass panel, a centred two-line headline that
 * rises word by word out of a blur, two 3D pills, then four glass cards that
 * cascade up — each one starting lower and later than the last — and settle
 * into a row.
 */
export function Hero({
  authed,
  freeLimit,
  dimensions,
}: {
  authed: boolean;
  freeLimit: number;
  dimensions: number;
}) {
  const reduce = useReducedMotion();
  const go = (href: string) => (authed ? href : "/signup");

  return (
    <section className="px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="panel overflow-hidden px-5 pb-10 pt-32 sm:pt-40">
        <div className="light-streaks" />

        <div className="relative mx-auto max-w-5xl text-center">
          <h1 className="font-display text-[2.35rem] font-medium leading-[1.06] text-ink sm:text-[3.4rem] sm:[&_.block]:whitespace-nowrap lg:text-[4.2rem]">
            <BlurWords lines={["Know exactly why your", "resume gets rejected"]} delay={0.35} />
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 1.1, ease: EASE }}
            className="mx-auto mt-6 max-w-xl text-base text-muted sm:text-lg"
          >
            Score it against the job. Fix what&apos;s weak. Rehearse the interview.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.25, ease: EASE }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href={go("/dashboard/new")} className="btn-neon">
              Review my resume
            </Link>
            <a href="#how" className="btn-stone">
              See how it works
            </a>
          </motion.div>
        </div>

        {/* the cascade */}
        <div className="relative mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-3 sm:mt-20 sm:gap-4 lg:grid-cols-4">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.icon}
              initial={reduce ? false : { opacity: 0, y: 140 + i * 70 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.25, delay: 1.3 + i * 0.14, ease: EASE }}
            >
              <Link
                href={go(c.href)}
                className="glass group flex h-full flex-col items-center rounded-[1.6rem] px-4 pb-5 pt-6 text-center transition-transform duration-300 hover:-translate-y-1 sm:pt-8"
              >
                <span className="font-display text-lg font-medium leading-tight text-ink sm:text-[1.35rem]">
                  {c.title[0]}
                  <br />
                  {c.title[1]}
                </span>
                <GlossyIcon
                  kind={c.icon}
                  className="my-6 h-16 w-16 transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-4deg] sm:my-9 sm:h-20 sm:w-20"
                />
                <span className={i === 2 ? "btn-neon px-3.5 py-1.5 text-xs" : "btn-stone px-3.5 py-1.5 text-xs"}>
                  {c.cta}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* the fact row under the cards */}
        <motion.ul
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2.2 }}
          className="relative mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted"
        >
          <li className="flex items-center gap-2">
            <Gift className="h-4 w-4" /> {freeLimit} free reviews a month
          </li>
          <li className="flex items-center gap-2">
            <Gauge className="h-4 w-4" /> {dimensions} dimensions scored
          </li>
          <li className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> No card required
          </li>
        </motion.ul>
      </div>
    </section>
  );
}
