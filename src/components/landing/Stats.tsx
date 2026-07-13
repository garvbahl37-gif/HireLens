"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "motion/react";

const STATS = [
  { value: 6, suffix: "s", label: "Average time to a full review", decimals: 0 },
  { value: 5, suffix: "", label: "Scored dimensions per resume", decimals: 0 },
  { value: 75, suffix: "%", label: "Of resumes rejected by ATS filters", decimals: 0 },
  { value: 12, suffix: "", label: "Keyword gaps surfaced per scan", decimals: 0 },
];

function Counter({
  to,
  suffix,
  decimals,
}: {
  to: number;
  suffix: string;
  decimals: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function Stats() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {STATS.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 200px 0px" }}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="card p-6 text-center"
        >
          <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-gradient">
              <Counter to={s.value} suffix={s.suffix} decimals={s.decimals} />
            </span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
