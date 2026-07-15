"use client";

import { type ReactNode } from "react";
import { motion } from "motion/react";
import {
  FileSearch,
  Gauge,
  History,
  MessageSquareText,
  PenLine,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Bento, not a uniform 3×2: the two features that carry the product (scoring
 * and the ATS keyword gap) get the space, the rest fill in around them.
 */
const FEATURES: {
  icon: LucideIcon;
  title: string;
  body: string;
  pro?: boolean;
  span: string;
  visual?: ReactNode;
}[] = [
  {
    icon: Gauge,
    title: "Recruiter-calibrated scoring",
    body: "An overall verdict plus five dimensions — job match, ATS readiness, impact, clarity, structure — scored the way screeners actually think, not by a grammar rulebook.",
    span: "sm:col-span-2",
    visual: <DimensionBars />,
  },
  {
    icon: ScanSearch,
    title: "ATS keyword gap",
    body: "The hard requirements in the job description your resume never says — surfaced before a keyword filter bins you.",
    span: "",
    visual: <KeywordChips />,
  },
  {
    icon: FileSearch,
    title: "Section-by-section grades",
    body: "Summary, Experience, Projects, Skills, Education — each graded A–F with specific feedback.",
    span: "",
  },
  {
    icon: PenLine,
    title: "Line-by-line rewrites",
    body: "Your weakest bullets, quoted verbatim and rewritten into quantified, achievement-driven lines.",
    pro: true,
    span: "",
  },
  {
    icon: MessageSquareText,
    title: "Interview prep",
    body: "The questions your gaps will provoke — so the hole in your story becomes a rehearsed answer.",
    pro: true,
    span: "",
  },
  {
    icon: History,
    title: "History & tracking",
    body: "Every review saved. Iterate and watch the score climb between versions.",
    span: "",
  },
];

export function FeaturesGrid() {
  return (
    <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f, i) => (
        <Card key={f.title} {...f} index={i} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Card({
  icon: Icon,
  title,
  body,
  pro,
  span,
  visual,
  index,
}: (typeof FEATURES)[number] & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 140px 0px" }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: EASE }}
      className={cn(
        "card group relative flex flex-col overflow-hidden p-6 transition-colors duration-300 hover:border-edge2",
        span
      )}
    >
      <div className="relative flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-edge bg-card2 text-accent transition-colors group-hover:border-accent/40">
          <Icon className="h-4.5 w-4.5" strokeWidth={2} />
        </span>
        {pro && (
          <span className="chip gap-1 border-accent/30 text-accent">
            <Sparkles className="h-3 w-3" /> Pro
          </span>
        )}
      </div>

      <h3 className="relative mt-5 font-bold tracking-tight">{title}</h3>
      <p className="relative mt-2 flex-1 text-sm leading-relaxed text-muted">
        {body}
      </p>

      {visual && <div className="relative mt-5">{visual}</div>}
    </motion.div>
  );
}

/* ---- small inline visuals, so the big tiles aren't just text ---- */

function DimensionBars() {
  const rows = [
    { label: "Job match", v: 71 },
    { label: "ATS readiness", v: 62 },
    { label: "Impact & results", v: 55 },
    { label: "Clarity", v: 84 },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted">{r.label}</span>
            <span className="text-xs font-bold tabular-nums text-faint">
              {r.v}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-edge">
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  r.v >= 75
                    ? "var(--color-good)"
                    : r.v >= 55
                      ? "var(--color-warn)"
                      : "var(--color-bad)",
              }}
              initial={{ width: 0 }}
              whileInView={{ width: `${r.v}%` }}
              viewport={{ once: true, margin: "0px 0px 120px 0px" }}
              transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: EASE }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function KeywordChips() {
  const missing = ["Kubernetes", "GraphQL", "CI/CD"];
  const matched = ["React", "TypeScript"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {missing.map((k, i) => (
        <motion.span
          key={k}
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "0px 0px 120px 0px" }}
          transition={{ delay: 0.2 + i * 0.07, type: "spring", stiffness: 420, damping: 20 }}
          className="chip border-bad/30 text-bad"
        >
          {k}
        </motion.span>
      ))}
      {matched.map((k, i) => (
        <motion.span
          key={k}
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "0px 0px 120px 0px" }}
          transition={{ delay: 0.4 + i * 0.07, type: "spring", stiffness: 420, damping: 20 }}
          className="chip border-good/25 text-good"
        >
          {k}
        </motion.span>
      ))}
    </div>
  );
}
