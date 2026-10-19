"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { EASE } from "./motion";

export type FaqItem = { q: string; a: string };

/**
 * The reference's FAQ: a narrow centred column of glass rows, each with a
 * plus that turns into a minus as the answer slides open.
 */
export function Faq({ items }: { items: FaqItem[] }) {
  // Accordion, not independent toggles: one answer at a time keeps the column
  // from growing into a wall of text.
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        const id = `faq-${i}`;
        return (
          <motion.div
            key={item.q}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px 120px 0px" }}
            transition={{ duration: 0.6, delay: i * 0.05, ease: EASE }}
            className="glass overflow-hidden rounded-2xl"
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={id}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <span className="flex-1 text-sm font-medium text-ink">{item.q}</span>
              {isOpen ? (
                <Minus className="h-4 w-4 shrink-0 text-ink" />
              ) : (
                <Plus className="h-4 w-4 shrink-0 text-ink" />
              )}
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="answer"
                  id={id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
