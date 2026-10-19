"use client";

import { AudioLines, Gauge, TrendingUp } from "lucide-react";
import { CountUp, Rise } from "./motion";

/** The reference's three-up figures row: a small icon, a number that counts
 *  up as it arrives, and a plain label. Every figure here is a product fact. */
export function Stats({
  dimensions,
  proQuestions,
}: {
  dimensions: number;
  proQuestions: number;
}) {
  const stats = [
    { icon: Gauge, value: dimensions, prefix: "", suffix: " dimensions", label: "scored on every review" },
    { icon: TrendingUp, value: 30, prefix: "+", suffix: " points", label: "on our own resume, after one pass" },
    { icon: AudioLines, value: proQuestions, prefix: "", suffix: " questions", label: "per Pro mock interview" },
  ];

  return (
    <section className="px-4 pt-32 sm:pt-40">
      <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3">
        {stats.map((s, i) => (
          <Rise key={s.label} y={24} delay={i * 0.08}>
            <s.icon className="h-5 w-5 text-ink/70" strokeWidth={1.75} />
            <p className="mt-4 text-xl font-medium text-ink">
              <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
            </p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </Rise>
        ))}
      </div>
    </section>
  );
}
