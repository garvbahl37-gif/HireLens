"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, FileSearch } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="card relative flex flex-col items-center overflow-hidden px-6 py-20 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[520px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-accent), transparent)",
        }}
      />

      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 18 }}
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-edge2 bg-card2 shadow-[0_0_40px_-8px_var(--color-accent)]"
      >
        <FileSearch className="h-7 w-7 text-accent" />
      </motion.span>

      <h2 className="relative mt-6 text-xl font-bold tracking-tight">
        Your first review is one upload away
      </h2>
      <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-muted">
        Drop in your resume and the job description you&apos;re targeting.
        You&apos;ll get a score, the keywords you&apos;re missing, and a
        prioritized fix list in about a minute.
      </p>
      <Link href="/dashboard/new" className="btn btn-primary btn-sheen relative mt-7">
        Run my first review <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  );
}
