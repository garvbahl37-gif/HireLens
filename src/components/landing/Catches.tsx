"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  AlignLeft,
  BarChart3,
  Eye,
  KeyRound,
  LayoutList,
  MessageCircleQuestion,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE, ScrollWords } from "./motion";

type Catch = {
  label: string;
  title: string;
  icon: LucideIcon;
  tint: string;
  /** how hard it hits the score, out of five */
  weight: number;
  gain: string;
};

/* Illustrative flags of the kind a review raises — the "tasks others got
   done" grid from the reference, recast as fixes. */
const CATCHES: Catch[] = [
  { label: "Impact", title: "Bullets with no numbers", icon: BarChart3, tint: "#f6c6cc", weight: 5, gain: "+9 pts" },
  { label: "Keywords", title: "Terraform never mentioned", icon: KeyRound, tint: "#bfe3a8", weight: 4, gain: "+6 pts" },
  { label: "Recruiter skim", title: "Summary buries the lead", icon: Eye, tint: "#f5d98b", weight: 4, gain: "+5 pts" },
  { label: "Clarity", title: "Duty-shaped, passive verbs", icon: AlignLeft, tint: "#9fd8cb", weight: 3, gain: "+4 pts" },
  { label: "Structure", title: "Skills listed twice", icon: LayoutList, tint: "#cfd6f5", weight: 2, gain: "+3 pts" },
  { label: "Interview", title: "A claim you can't defend yet", icon: MessageCircleQuestion, tint: "#f3c9a5", weight: 3, gain: "Prep it" },
];

export function Catches() {
  const reduce = useReducedMotion();

  return (
    <section id="features" className="scroll-mt-28 px-4 pt-32 sm:pt-40">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
          <ScrollWords lines={["See what a review", "actually catches"]} />
        </h2>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {CATCHES.map((c, i) => {
            const col = i % 3;
            return (
              <motion.div
                key={c.title}
                // each column starts a little lower than the one before it
                initial={reduce ? false : { opacity: 0, y: 60 + col * 45 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -6% 0px" }}
                transition={{ duration: 1.05, delay: col * 0.1 + Math.floor(i / 3) * 0.12, ease: EASE }}
                className={cn(
                  "flex flex-col rounded-[1.4rem] p-5",
                  i === 1 ? "glass-green" : "glass"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink/75 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.75)]"
                    style={{ background: c.tint }}
                  >
                    <c.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] uppercase tracking-[0.08em] text-faint">
                      {c.label}
                    </span>
                    <span className="mt-0.5 block font-semibold text-ink">{c.title}</span>
                  </span>
                </div>
                <div className="mt-7 flex items-center justify-between">
                  <span className="flex gap-1" aria-label={`Weight ${c.weight} of 5`}>
                    {Array.from({ length: 5 }, (_, k) => (
                      <span
                        key={k}
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          k < c.weight
                            ? "bg-[linear-gradient(180deg,#8ef06f,#2fbf1c)] shadow-[0_0_6px_rgba(69,230,36,0.5)]"
                            : "bg-ink/10"
                        )}
                      />
                    ))}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-ink">{c.gain}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
