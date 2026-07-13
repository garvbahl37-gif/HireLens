"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Target } from "lucide-react";
import { ScoreBar, scoreGrade } from "@/components/ScoreRing";
import { AnimatedScoreRing } from "./AnimatedScoreRing";

const EASE = [0.16, 1, 0.3, 1] as const;

export type SpotlightData = {
  id: string;
  jobTitle: string;
  company: string | null;
  overallScore: number;
  verdict: string;
  date: string;
  dimensions: { label: string; score: number }[];
  topFix: { issue: string; fix: string } | null;
};

export function Spotlight({ data }: { data: SpotlightData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="card relative overflow-hidden p-6 lg:p-7"
    >
      {/* ambient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-accent), transparent)",
        }}
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <AnimatedScoreRing score={data.overallScore} />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Latest review
          </p>
          <h2 className="mt-2 truncate text-xl font-bold tracking-tight">
            {data.jobTitle}
            {data.company && (
              <span className="font-normal text-muted"> · {data.company}</span>
            )}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {data.verdict}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="chip border-accent/30 text-accent">
              {scoreGrade(data.overallScore)}
            </span>
            <span className="text-xs text-faint">{data.date}</span>
          </div>
        </div>
      </div>

      {/* dimension bars */}
      <div className="relative mt-7 grid gap-4 sm:grid-cols-2 lg:gap-x-8">
        {data.dimensions.map((d, i) => (
          <motion.div
            key={d.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.07, ease: EASE }}
          >
            <ScoreBar label={d.label} score={d.score} />
          </motion.div>
        ))}
      </div>

      {/* top fix */}
      {data.topFix && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65, ease: EASE }}
          className="relative mt-6 rounded-xl border border-edge bg-card2 p-4"
        >
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-warn">
            <Target className="h-3.5 w-3.5" /> Fix this first
          </p>
          <p className="mt-2 text-sm font-semibold">{data.topFix.issue}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {data.topFix.fix}
          </p>
        </motion.div>
      )}

      <Link
        href={`/dashboard/reviews/${data.id}`}
        className="btn btn-ghost group relative mt-6 w-full"
      >
        View full breakdown
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
