"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { scoreColor } from "@/components/ScoreRing";

const EASE = [0.16, 1, 0.3, 1] as const;

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
        <FloatingMockups />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.12fr_0.88fr]">
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

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.05rem]">
            <MaskLine delay={0.05}>Know exactly why your</MaskLine>

            <MaskLine delay={0.17}>
              resume gets{" "}
              <span className="relative inline-block">
                rejected
                {/* the strike is the point: the headline performs the problem */}
                <motion.span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-[0.09em] w-full origin-left rounded-full bg-bad"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 1.05, ease: EASE }}
                />
              </span>{" "}
              —
            </MaskLine>

            <MaskLine delay={0.29}>
              <span className="relative inline-block">
                <span className="text-gradient-animate">and fix it.</span>
                {/* …and then performs the fix */}
                <motion.span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-[0.07em] w-full origin-left rounded-full"
                  style={{
                    background:
                      "linear-gradient(to right, var(--color-accent), var(--color-accent2))",
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 1.5, ease: EASE }}
                />
              </span>
            </MaskLine>
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

/**
 * A line of the headline, revealed from behind a mask.
 *
 * The line rises out of an overflow-hidden band rather than fading in — the
 * type reads as being uncovered rather than materialising, which is the
 * difference between "considered" and "a stock fade". The band needs vertical
 * padding or it clips descenders (the 'y' in "why"), and that padding has to
 * be negated by an equal margin so it doesn't open a gap between the lines.
 */
function MaskLine({
  children,
  delay,
}: {
  children: ReactNode;
  delay: number;
}) {
  return (
    <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
      <motion.span
        className="block"
        initial={{ y: "115%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.95, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Faint product fragments drifting behind the hero — a score ring, keyword
 * chips, a bar chart, an interview line. They give the background the sense of
 * a real product flow humming underneath, without competing with the copy or
 * the main card, so they're low-opacity, blurred, and pinned to the edges.
 */
function FloatingMockups() {
  const drift = (dur: number, y: number) => ({
    animate: { y: [0, -y, 0] },
    transition: { duration: dur, repeat: Infinity, ease: "easeInOut" as const },
  });

  return (
    <div className="absolute inset-0 hidden overflow-hidden opacity-[0.55] blur-[0.5px] lg:block">
      {/* score ring — top left */}
      <motion.div
        {...drift(7, 16)}
        className="absolute left-[3%] top-[22%] flex items-center gap-2.5 rounded-2xl border border-edge2/60 bg-card/70 p-3 backdrop-blur"
      >
        <div className="relative flex h-11 w-11 items-center justify-center">
          <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-edge)" strokeWidth="4" />
            <circle
              cx="22" cy="22" r="18" fill="none"
              stroke="var(--color-good)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 18}
              strokeDashoffset={2 * Math.PI * 18 * (1 - 0.86)}
            />
          </svg>
          <span className="absolute text-xs font-extrabold">86</span>
        </div>
        <div>
          <p className="text-[10px] font-bold">ATS match</p>
          <p className="text-[9px] text-muted">Interview-ready</p>
        </div>
      </motion.div>

      {/* keyword chips — lower left */}
      <motion.div
        {...drift(9, 20)}
        className="absolute bottom-[16%] left-[6%] max-w-[190px] rounded-2xl border border-edge2/60 bg-card/70 p-3 backdrop-blur"
      >
        <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-muted">
          Missing keywords
        </p>
        <div className="flex flex-wrap gap-1">
          {["Kubernetes", "GraphQL", "CI/CD"].map((k) => (
            <span key={k} className="rounded-full border border-bad/30 px-1.5 py-0.5 text-[9px] text-bad">
              {k}
            </span>
          ))}
        </div>
      </motion.div>

      {/* interview line — mid right, high up behind the card area */}
      <motion.div
        {...drift(8, 14)}
        className="absolute right-[2%] top-[8%] flex items-center gap-2 rounded-full border border-accent/30 bg-card/70 px-3 py-1.5 backdrop-blur"
      >
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="text-[10px] font-semibold text-accent">Speaking…</span>
      </motion.div>

      {/* mini dimension bars — bottom right-ish */}
      <motion.div
        {...drift(10, 18)}
        className="absolute bottom-[10%] right-[10%] w-40 space-y-2 rounded-2xl border border-edge2/60 bg-card/70 p-3 backdrop-blur"
      >
        {[["Job match", 71, "warn"], ["Impact", 55, "bad"], ["Clarity", 84, "good"]].map(
          ([label, v, band]) => (
            <div key={label as string}>
              <div className="mb-0.5 flex justify-between text-[9px] text-muted">
                <span>{label}</span>
                <span>{v}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-edge">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${v}%`,
                    background:
                      band === "good"
                        ? "var(--color-good)"
                        : band === "warn"
                          ? "var(--color-warn)"
                          : "var(--color-bad)",
                  }}
                />
              </div>
            </div>
          )
        )}
      </motion.div>
    </div>
  );
}

/** Counts from 0 to `to`, starting after `delay`. */
function Counter({ to, delay = 0 }: { to: number; delay?: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.1,
      delay,
      ease: EASE,
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, delay]);

  return <>{n}</>;
}

/** The overall score ring: sweeps round while the number spins up to meet it. */
function HeroRing({ score }: { score: number }) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: color }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.25 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      />
      <svg width={size} height={size} className="relative">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-edge)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.2, delay: 0.7, ease: EASE }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold tabular-nums">
        <Counter to={score} delay={0.7} />
      </span>
    </div>
  );
}

/** A dimension bar that fills while its number counts up. */
function HeroBar({
  label,
  score,
  delay,
}: {
  label: string;
  score: number;
  delay: number;
}) {
  const color = scoreColor(score);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          <Counter to={score} delay={delay} />
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-edge">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.1, delay, ease: EASE }}
        />
      </div>
    </div>
  );
}

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
        {/* Scan sweep — the lens passing over the resume, on a slow loop.
            Clipped by its own layer, not the card: the "AI-scored" badge
            deliberately overflows the card edge and must not be cut off. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        >
          <motion.div
            className="absolute inset-x-0 h-24"
            style={{
              background:
                "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent)",
            }}
            initial={{ top: "-15%" }}
            animate={{ top: ["-15%", "105%"] }}
            transition={{
              duration: 2.2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 4.5,
            }}
          />
        </div>

        <div className="relative flex items-center justify-between border-b border-edge pb-4">
          <div>
            <p className="text-sm font-bold">Senior Frontend Engineer · Stripe</p>
            <p className="mt-0.5 text-xs text-muted">
              resume_v4_final.pdf · reviewed just now
            </p>
          </div>
          <HeroRing score={68} />
        </div>

        <div className="relative mt-5 space-y-4">
          {[
            { label: "Job match", score: 71 },
            { label: "ATS readiness", score: 62 },
            { label: "Impact & results", score: 55 },
          ].map((b, i) => (
            <HeroBar
              key={b.label}
              label={b.label}
              score={b.score}
              delay={0.9 + i * 0.16}
            />
          ))}
        </div>

        <div className="relative mt-5 border-t border-edge pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            Missing keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Kubernetes", "CI/CD", "GraphQL", "Terraform"].map((k, i) => (
              <motion.span
                key={k}
                initial={{ opacity: 0, scale: 0.6, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: 1.6 + i * 0.09,
                  type: "spring",
                  stiffness: 420,
                  damping: 20,
                }}
                className="chip border-bad/30 text-bad"
              >
                {k}
              </motion.span>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.1, duration: 0.6, ease: EASE }}
          className="relative mt-4 rounded-xl border border-edge bg-card2 p-3.5 text-xs leading-relaxed text-muted"
        >
          <span className="font-semibold text-warn">Fix first:</span> Only 2 of
          11 bullets contain numbers. Rewrite &ldquo;worked on checkout
          flow&rdquo; → &ldquo;cut checkout abandonment 18% by rebuilding the
          payment flow in React&rdquo;.
        </motion.div>

        {/* floating accent badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 2.3, type: "spring", stiffness: 260, damping: 18 }}
          style={{ transform: "translateZ(60px)" }}
          className="absolute -right-4 -top-4 z-10 flex items-center gap-1.5 rounded-full border border-accent/40 bg-card px-3 py-1.5 text-xs font-bold shadow-xl"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          AI-scored
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
