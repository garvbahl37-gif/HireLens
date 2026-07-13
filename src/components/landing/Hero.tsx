"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { ScoreBar, ScoreRing } from "@/components/ScoreRing";

const EASE = [0.16, 1, 0.3, 1] as const;

const HEADLINE_1 = "Know exactly why your";
const HEADLINE_2 = "resume gets rejected —";

export function Hero({
  authed,
  freeLimit,
}: {
  authed: boolean;
  freeLimit: number;
}) {
  const ctaHref = authed ? "/dashboard/new" : "/signup";

  return (
    <section className="relative overflow-hidden pt-36 pb-24 sm:pt-40">
      {/* animated aurora + grid backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora" />
        <div className="aurora-3" />
        <div className="absolute inset-0 hero-grid" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ---- copy ---- */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <span className="chip gap-2 border-accent/40 text-accent">
              <span className="relative flex h-1.5 w-1.5">
                <span className="pulse-dot inline-flex h-1.5 w-1.5 rounded-full bg-good" />
              </span>
              Recruiter-calibrated AI review
            </span>
          </motion.div>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            <StaggerWords text={HEADLINE_1} />
            <br />
            <StaggerWords text={HEADLINE_2} startAt={HEADLINE_1.split(" ").length} />
            <br />
            <motion.span
              className="text-gradient-animate"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
            >
              and fix it.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65, ease: EASE }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted"
          >
            Upload your resume, paste the job description, and get a scored,
            section-by-section review in seconds: keyword gaps the ATS will
            punish, weak bullets rewritten, and the interview questions your gaps
            will trigger.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.78, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              href={ctaHref}
              className="btn btn-primary btn-sheen px-6 py-3 text-base"
            >
              Review my resume free <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how" className="btn btn-ghost px-6 py-3 text-base">
              See how it works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.95 }}
            className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-faint"
          >
            <span className="flex items-center gap-1.5">
              <span className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-warn text-warn" />
                ))}
              </span>
              Loved by job-seekers
            </span>
            <span className="h-4 w-px bg-edge" />
            <span>Free plan · {freeLimit} reviews a month · no card required</span>
          </motion.div>
        </div>

        {/* ---- floating tilt card ---- */}
        <TiltCard />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function StaggerWords({ text, startAt = 0 }: { text: string; startAt?: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block"
          initial={{ opacity: 0, y: 26, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.6,
            delay: 0.1 + (startAt + i) * 0.06,
            ease: EASE,
          }}
        >
          {word}
          {i < text.split(" ").length - 1 ? " " : ""}
        </motion.span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */

function TiltCard() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const parallax = useTransform(scrollY, [0, 500], [0, -40]);

  const rx = useSpring(useMotionValue(0), { stiffness: 150, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 150, damping: 18 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 12);
    rx.set(-py * 12);
  }
  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      style={{ y: parallax }}
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
      className="relative [perspective:1400px]"
    >
      {/* glow behind card */}
      <div
        className="absolute -inset-6 rounded-[2rem] opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 60% at 60% 30%, var(--color-accent), transparent)",
        }}
      />
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="float-y relative card p-6 shadow-2xl lg:p-7"
      >
        <div className="flex items-center justify-between border-b border-edge pb-4">
          <div>
            <p className="text-sm font-bold">Senior Frontend Engineer · Stripe</p>
            <p className="mt-0.5 text-xs text-muted">
              resume_v4_final.pdf · reviewed just now
            </p>
          </div>
          <ScoreRing score={68} size={64} stroke={6} />
        </div>
        <div className="mt-5 space-y-4">
          <ScoreBar label="Job match" score={71} />
          <ScoreBar label="ATS readiness" score={62} />
          <ScoreBar label="Impact & results" score={55} />
        </div>
        <div className="mt-5 border-t border-edge pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            Missing keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Kubernetes", "CI/CD", "GraphQL", "Terraform"].map((k, i) => (
              <motion.span
                key={k}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.09, ease: EASE }}
                className="chip border-bad/30 text-bad"
              >
                {k}
              </motion.span>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-edge bg-card2 p-3.5 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-warn">Fix first:</span> Only 2 of
          11 bullets contain numbers. Rewrite &ldquo;worked on checkout
          flow&rdquo; → &ldquo;cut checkout abandonment 18% by rebuilding the
          payment flow in React&rdquo;.
        </div>

        {/* floating accent badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.3, type: "spring", stiffness: 260, damping: 18 }}
          style={{ transform: "translateZ(60px)" }}
          className="absolute -right-4 -top-4 flex items-center gap-1.5 rounded-full border border-accent/40 bg-card px-3 py-1.5 text-xs font-bold shadow-xl"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          AI-scored
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
