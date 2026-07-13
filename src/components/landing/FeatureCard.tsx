"use client";

import { useRef, useState, type ComponentType } from "react";
import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

export function FeatureCard({
  icon: Icon,
  title,
  body,
  pro,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  pro?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: 50, y: 50, on: false });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setGlow({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
      on: true,
    });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setGlow((g) => ({ ...g, on: false }))}
      variants={{
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
      }}
      className={`gradient-border group relative overflow-hidden card p-6 transition-transform duration-300 hover:-translate-y-1 ${className ?? ""}`}
    >
      {/* cursor-follow glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: glow.on ? 1 : 0,
          background: `radial-gradient(280px circle at ${glow.x}% ${glow.y}%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 70%)`,
        }}
      />
      <div className="relative">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-edge bg-card2 transition-colors group-hover:border-accent/50">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <h3 className="mt-4 flex items-center gap-2 font-bold">
          {title}
          {pro && (
            <span className="chip border-accent/40 px-2 py-0 text-[10px] text-accent">
              PRO
            </span>
          )}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </motion.div>
  );
}
