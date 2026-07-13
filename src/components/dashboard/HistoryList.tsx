"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { ScoreRing, scoreGrade } from "@/components/ScoreRing";

export type HistoryItem = {
  id: string;
  jobTitle: string;
  company: string | null;
  overallScore: number;
  verdict: string;
  deep: boolean;
  date: string;
};

export function HistoryList({ items }: { items: HistoryItem[] }) {
  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-3"
    >
      {items.map((r) => (
        <motion.li
          key={r.id}
          variants={{
            hidden: { opacity: 0, y: 14 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            },
          }}
        >
          <Link
            href={`/dashboard/reviews/${r.id}`}
            className="card gradient-border group flex items-center gap-5 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-16px_rgba(242,98,46,0.5)]"
          >
            <ScoreRing score={r.overallScore} size={54} stroke={5} />

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-semibold">
                <span className="truncate">
                  {r.jobTitle}
                  {r.company && (
                    <span className="font-normal text-muted">
                      {" "}
                      · {r.company}
                    </span>
                  )}
                </span>
                {r.deep && (
                  <span className="chip shrink-0 gap-1 border-accent/30 text-accent">
                    <Sparkles className="h-3 w-3" /> Deep
                  </span>
                )}
              </p>
              <p className="mt-1 truncate text-sm text-muted">{r.verdict}</p>
            </div>

            <div className="hidden shrink-0 text-right sm:block">
              <p className="text-xs font-semibold">
                {scoreGrade(r.overallScore)}
              </p>
              <p className="mt-0.5 text-xs text-faint">{r.date}</p>
            </div>

            <ArrowRight className="h-4 w-4 shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}
