"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/cn";
import { EASE } from "./motion";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/**
 * The reference's floating glass pill. On load it opens out from the logo,
 * the links arrive left to right and the CTA lands last; a soft green glow
 * then follows whichever section you're reading.
 */
export function Navbar({ authed }: { authed: boolean }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

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

  const later = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, transition: { delay: 0.45 + i * 0.09, duration: 0.5, ease: EASE } };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-4 sm:pt-5">
      <motion.div
        initial={reduce ? false : { maxWidth: 176, opacity: 0, y: -12 }}
        animate={{ maxWidth: 820, opacity: 1, y: 0 }}
        transition={{
          maxWidth: { duration: 0.9, delay: 0.25, ease: EASE },
          opacity: { duration: 0.4 },
          y: { duration: 0.5, ease: EASE },
        }}
        className="relative w-full overflow-hidden rounded-full border border-white/90 bg-white/80 shadow-[inset_0_1px_0_#fff,0_14px_34px_-18px_rgba(18,36,26,0.35)] backdrop-blur-2xl"
      >
        {/* min-w-max: while the pill is still opening, the row keeps its full
            width and is clipped, rather than squeezing and wrapping */}
        <div className="flex min-w-max items-center gap-2 py-1.5 pl-3 pr-1.5 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 rounded-full pr-1">
            <LogoMark className="h-7 w-7 rounded-[9px]" animate={false} />
            <span className="text-[1.05rem] font-semibold tracking-tight text-ink">HireLens</span>
          </Link>

          <nav aria-label="Sections" className="mx-auto hidden items-center gap-0.5 md:flex">
            {LINKS.map((l, i) => {
              const isActive = active === l.href.slice(1);
              return (
                <motion.a key={l.href} href={l.href} {...later(i)} className="relative rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-ink">
                  {isActive && (
                    <motion.span
                      layoutId="nav-glow"
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(110,232,80,0.55),rgba(110,232,80,0.12)_70%,transparent)]"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  <span className={cn("relative", isActive && "text-ink")}>{l.label}</span>
                </motion.a>
              );
            })}
          </nav>

          <motion.div {...later(LINKS.length)} className="ml-auto flex items-center gap-1 md:ml-0">
            {authed ? (
              <Link href="/dashboard" className="btn-stone px-4 py-2 text-[0.82rem]">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-ink sm:block">
                  Log in
                </Link>
                <Link href="/signup" className="btn-stone px-4 py-2 text-[0.82rem]">
                  Get started
                </Link>
              </>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/80 hover:text-ink md:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* phone menu — outside the pill so the pill's clipping can't cut it */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            aria-label="Sections"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="absolute inset-x-3 top-full mt-2 rounded-3xl border border-white/90 bg-white/90 p-2 shadow-[0_24px_60px_-24px_rgba(18,36,26,0.45)] backdrop-blur-2xl md:hidden"
          >
            {[...LINKS, ...(authed ? [] : [{ href: "/login", label: "Log in" }])].map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-card2"
              >
                {l.label}
                <ArrowRight className="h-3.5 w-3.5 text-faint" />
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
