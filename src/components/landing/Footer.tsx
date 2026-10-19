"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * The reference's footer: a deep forest slab with link columns, and the
 * wordmark set enormous along the bottom edge. The wordmark rises into place
 * as the footer scrolls in and fades into green where the page ends.
 */
export function Footer({ authed }: { authed: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], ["45%", "8%"]);

  const columns = [
    {
      title: "Product",
      links: [
        { href: "#how", label: "How it works" },
        { href: "#features", label: "What a review catches" },
        { href: "#interview", label: "Mock interviews" },
        { href: "#pricing", label: "Pricing" },
      ],
    },
    {
      title: "Your account",
      links: authed
        ? [
            { href: "/dashboard", label: "Dashboard" },
            { href: "/dashboard/account", label: "Account settings" },
            { href: "/dashboard/billing", label: "Billing" },
          ]
        : [
            { href: "/signup", label: "Create an account" },
            { href: "/login", label: "Log in" },
            { href: "/forgot", label: "Reset password" },
          ],
    },
    {
      title: "Tools",
      links: [
        { href: authed ? "/dashboard/new" : "/signup", label: "Resume review" },
        { href: authed ? "/dashboard/interview/new" : "/signup", label: "Mock interview" },
        { href: authed ? "/dashboard/tracker" : "/signup", label: "Application tracker" },
      ],
    },
    {
      title: "Help",
      links: [{ href: "#faq", label: "FAQ" }],
    },
  ];

  return (
    <footer ref={ref} className="mt-28 overflow-hidden bg-forest text-white sm:mt-36">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-8 gap-y-10 px-6 pt-16 sm:grid-cols-4 sm:pt-20">
        {columns.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-white/60 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-14 max-w-5xl px-6 text-xs text-white/45">
        © {new Date().getFullYear()} HireLens. Payments run in Stripe test mode, so nothing is ever charged.
      </p>

      {/* the giant wordmark */}
      <div className="relative mt-6 h-[22vw] max-h-[260px] min-h-[110px]">
        <motion.div
          aria-hidden
          style={reduce ? undefined : { y }}
          className="absolute inset-x-0 top-0 flex items-start justify-center px-6"
        >
          <span className="font-display text-[18.5vw] font-medium leading-[0.82] tracking-tight lg:text-[16rem]">
            HireLens
          </span>
        </motion.div>
        {/* fade the letters into green at the very bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_bottom,transparent,rgba(18,36,26,0.4)_40%,#4e8f45)]" />
      </div>
    </footer>
  );
}
