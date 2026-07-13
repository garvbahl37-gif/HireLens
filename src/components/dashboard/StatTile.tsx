"use client";

import { motion } from "motion/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";

// Icons are resolved here, not passed in: a server component can't hand a
// function (a React component) across the RSC boundary.
const ICONS = {
  file: FileText,
  trend: TrendingUp,
  trophy: Trophy,
  target: Target,
} as const;

export type StatIcon = keyof typeof ICONS;

export function StatTile({
  icon,
  label,
  value,
  suffix = "",
  delta,
  index = 0,
}: {
  icon: StatIcon;
  label: string;
  value: number | null;
  suffix?: string;
  /** change vs the previous review — rendered with an arrow + sign, never color alone */
  delta?: number | null;
  index?: number;
}) {
  const Icon = ICONS[icon];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="card gradient-border group relative overflow-hidden p-5"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-edge bg-card2 text-accent transition-colors group-hover:border-accent/40">
          <Icon className="h-4.5 w-4.5" strokeWidth={2} />
        </span>
        {delta != null && delta !== 0 && (
          <span
            className={`chip gap-1 ${
              delta > 0
                ? "border-good/30 text-good"
                : "border-bad/30 text-bad"
            }`}
          >
            {delta > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight tabular-nums">
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
    </motion.div>
  );
}
