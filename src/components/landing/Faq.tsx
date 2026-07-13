"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

export type FaqItem = { q: string; a: string };

export function Faq({ items }: { items: FaqItem[] }) {
  // Accordion, not independent toggles: one answer at a time keeps the column
  // from growing into a wall of text.
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <motion.div
            key={item.q}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px 160px 0px" }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
          >
            <div
              className={`group relative overflow-hidden rounded-2xl border transition-colors duration-300 ${
                isOpen
                  ? "border-accent/40 bg-card"
                  : "border-edge bg-card/60 hover:border-edge2"
              }`}
            >
              {/* ember wash behind the open item */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.16 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute -left-10 -top-16 h-40 w-64 rounded-full blur-3xl"
                    style={{
                      background:
                        "radial-gradient(closest-side, var(--color-accent), transparent)",
                    }}
                  />
                )}
              </AnimatePresence>

              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="relative flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
              >
                <span
                  className={`font-mono text-xs tabular-nums transition-colors ${
                    isOpen ? "text-accent" : "text-faint"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="flex-1 font-semibold tracking-tight">
                  {item.q}
                </span>

                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isOpen
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-edge text-muted group-hover:border-edge2 group-hover:text-ink"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="relative overflow-hidden"
                  >
                    <div className="px-5 pb-5 pl-[3.4rem] sm:px-6 sm:pb-6 sm:pl-[4.1rem]">
                      <div className="mb-3 h-px w-full bg-gradient-to-r from-edge2 to-transparent" />
                      <p className="text-sm leading-relaxed text-muted">
                        {item.a}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
