"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from "motion/react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export function Navbar({ authed }: { authed: boolean }) {
  const { scrollY, scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");

  // spring the progress bar so it glides rather than tracking pixel-for-pixel
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1));
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4"
    >
      {/* Content scrolls through the gap above the bar, so fade it out behind
          the glass instead of letting text float over the top of the page. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 transition-opacity duration-500",
          scrolled ? "opacity-100" : "opacity-0"
        )}
        style={{
          background:
            "linear-gradient(to bottom, var(--color-bg) 30%, transparent)",
          maskImage: "linear-gradient(to bottom, black 55%, transparent)",
        }}
      />

      <motion.div
        animate={{
          paddingTop: scrolled ? 8 : 12,
          paddingBottom: scrolled ? 8 : 12,
        }}
        transition={{ duration: 0.4, ease: EASE }}
        className={cn(
          "relative flex w-full max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 transition-[background-color,border-color,box-shadow] duration-500 sm:px-5",
          scrolled
            ? "border border-edge2/70 bg-bg/70 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
            : "border border-transparent bg-transparent"
        )}
      >
        {/* specular hairline along the top edge of the glass */}
        {scrolled && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pointer-events-none absolute inset-x-10 top-0 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, color-mix(in srgb, var(--color-accent) 60%, transparent), transparent)",
            }}
          />
        )}

        {/* reading progress, pinned to the bottom of the bar */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left rounded-full"
          style={{
            scaleX: progress,
            background:
              "linear-gradient(to right, var(--color-accent), var(--color-accent2))",
            opacity: scrolled ? 1 : 0,
          }}
        />

        <Logo />

        {/* center pill nav */}
        <nav className="relative hidden items-center gap-1 rounded-full border border-edge/70 bg-card/40 px-1.5 py-1 backdrop-blur md:flex">
          {LINKS.map((l) => {
            const isActive = active === l.href.slice(1);
            return (
              <a
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
                  isActive ? "text-ink" : "text-muted hover:text-ink"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full border border-accent/30 bg-card2 shadow-[0_0_20px_-6px_var(--color-accent)]"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{l.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <AnimatePresence mode="wait">
            {authed ? (
              <motion.div
                key="dash"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <CtaButton href="/dashboard" label="Dashboard" />
              </motion.div>
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5"
              >
                {/* ghost login with an ember underline that wipes in */}
                <Link
                  href="/login"
                  className="group relative hidden rounded-lg px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink sm:block"
                >
                  Log in
                  <span className="absolute inset-x-3.5 bottom-1.5 h-px origin-left scale-x-0 bg-gradient-to-r from-accent to-accent2 transition-transform duration-300 group-hover:scale-x-100" />
                </Link>
                <CtaButton href="/signup" label="Get started" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.header>
  );
}

/** Ember CTA: outer glow on hover, sheen sweep, arrow that leads. */
function CtaButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group relative">
      {/* glow bloom sitting behind the button */}
      <span
        aria-hidden
        className="absolute -inset-1 rounded-xl opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-60"
        style={{
          background:
            "linear-gradient(120deg, var(--color-accent), var(--color-accent2))",
        }}
      />
      <span className="btn btn-primary btn-sheen relative">
        {label}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
