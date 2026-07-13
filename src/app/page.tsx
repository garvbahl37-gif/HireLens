import Link from "next/link";
import { ArrowRight, MessageCircleQuestion } from "lucide-react";
import { Faq } from "@/components/landing/Faq";
import { Proof } from "@/components/landing/Proof";
import { Logo } from "@/components/Logo";
import { PricingCards } from "@/components/PricingCards";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrustMarquee } from "@/components/landing/Marquee";
import { Stats } from "@/components/landing/Stats";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { Reveal } from "@/components/landing/Reveal";
import { getCurrentUser } from "@/lib/auth";
import { isDemoBilling } from "@/lib/demo-billing";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const authed = !!user;
  const demoBilling = isDemoBilling();

  return (
    <div className="grain relative flex-1 overflow-hidden bg-bg">
      {/* one continuous ambient canvas behind everything */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 60% at 50% -10%, rgba(242,98,46,0.11), transparent 60%), radial-gradient(90% 50% at 100% 40%, rgba(255,154,79,0.07), transparent 55%), radial-gradient(80% 50% at 0% 75%, rgba(201,69,43,0.06), transparent 55%)",
        }}
      />

      <Navbar authed={authed} />

      <Hero authed={authed} freeLimit={FREE_MONTHLY_LIMIT} />

      {/* trust strip — framed by fading hairlines, not hard borders */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-5">
          <div className="divider" />
          <TrustMarquee />
          <div className="divider" />
        </div>
      </section>

      {/* stats */}
      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-24">
        <Reveal>
          <Stats />
        </Reveal>
      </section>

      {/* ---------------- Proof: the real 62 → 92 result ---------------- */}
      <section className="relative scroll-mt-28 px-5 py-16">
        <div className="section-glow" />
        <div className="relative">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
              Proof
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              We took our own advice
            </h2>
          </Reveal>
          <Proof />
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="relative scroll-mt-28 px-5 py-24">
        <div className="section-glow" />
        <div className="relative mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
              Features
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              A hiring manager&apos;s eye,{" "}
              <span className="text-gradient">on demand</span>
            </h2>
            <p className="mt-4 text-muted">
              Not a grammar checker. HireLens reads your resume the way the
              person rejecting it does — against a specific job.
            </p>
          </Reveal>
          <FeaturesGrid />
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="relative mx-auto max-w-6xl scroll-mt-28 px-5 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
            How it works
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Three minutes to a{" "}
            <span className="text-gradient">better resume</span>
          </h2>
        </Reveal>

        <div className="relative mx-auto mt-16 grid max-w-5xl gap-y-10 md:grid-cols-3 md:gap-8">
          <div className="pointer-events-none absolute left-8 right-8 top-6 hidden h-px bg-gradient-to-r from-transparent via-edge2 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="relative flex flex-col items-center px-2 text-center md:items-start md:text-left">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent2 text-lg font-bold text-[#180f0a] shadow-[0_0_30px_-6px_var(--color-accent)]">
                  {i + 1}
                </span>
                <h3 className="mt-5 font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Pricing ---------------- */}
      <section id="pricing" className="relative scroll-mt-28 px-5 py-24">
        <div className="section-glow" />
        <div className="relative">
          <Reveal className="mx-auto max-w-xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
              Pricing
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Simple pricing, <span className="text-gradient">honest limits</span>
            </h2>
            <p className="mt-4 text-muted">
              Start free. Upgrade when one interview would already pay for a
              year of Pro.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-14">
            <PricingCards authed={authed} plan={user?.plan ?? null} demo={demoBilling} />
          </Reveal>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="relative scroll-mt-28 px-5 py-24">
        <div className="section-glow" />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          {/* sticky editorial column */}
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
                FAQ
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Everything you&apos;re <span className="text-gradient">about to ask</span>
              </h2>
              <p className="mt-4 leading-relaxed text-muted">
                The honest answers — including what we do with your resume and
                what actually separates the free tier from Pro.
              </p>

              <div className="mt-8 rounded-2xl border border-edge bg-card/60 p-5">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <MessageCircleQuestion className="h-4 w-4 text-accent" />
                  Still deciding?
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  The free plan gives you {FREE_MONTHLY_LIMIT} full reviews a
                  month. No card, no trial timer.
                </p>
                <Link
                  href={authed ? "/dashboard/new" : "/signup"}
                  className="btn btn-ghost mt-4 w-full text-sm"
                >
                  Try it free <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Reveal>

          <Faq items={FAQ} />
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="relative px-5 pb-24">
        <Reveal>
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-edge bg-card/60 px-6 py-20 text-center backdrop-blur">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[640px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-30 blur-3xl"
              style={{
                background:
                  "radial-gradient(closest-side, var(--color-accent), transparent)",
              }}
            />
            <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your next application deserves{" "}
              <span className="text-gradient-animate">
                a second pair of eyes.
              </span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-muted">
              Free to start. No card required. Your first review takes about a
              minute.
            </p>
            <Link
              href={authed ? "/dashboard/new" : "/signup"}
              className="btn btn-primary btn-sheen relative mt-8 px-7 py-3 text-base"
            >
              Get your free review <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="relative">
        <div className="mx-auto max-w-6xl px-5">
          <div className="divider" />
          <div className="flex flex-col items-center justify-between gap-4 py-10 text-sm text-muted sm:flex-row">
            <Logo />
            <p className="text-center sm:text-right">
              © {new Date().getFullYear()} HireLens. Payments in Stripe test
              mode — no real charges.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const STEPS = [
  {
    title: "Upload your resume",
    body: "Drop a PDF or paste the text. We extract and parse it exactly like an applicant tracking system would.",
  },
  {
    title: "Paste the job description",
    body: "Reviews are always against a specific role — generic feedback is how resumes stay mediocre.",
  },
  {
    title: "Get your action plan",
    body: "A scored, prioritized fix list: what to rewrite, which keywords to add, and what interviewers will probe.",
  },
];

const FAQ = [
  {
    q: "Is my resume used to train AI models?",
    a: "No. Your resume is sent to the analysis model for your review only and stored in your account so you can revisit results. Delete your reviews any time.",
  },
  {
    q: "What makes this different from a grammar checker?",
    a: "A grammar checker tells you a sentence is passive. HireLens tells you bullet 3 doesn't answer the job description's #1 requirement — and rewrites it with a metric. Every review is against a specific role.",
  },
  {
    q: "What file formats are supported?",
    a: "Text-based PDFs and plain text. Scanned or image-only PDFs can't be parsed (by us or by most ATS systems — which is worth fixing anyway).",
  },
  {
    q: "How do the plans differ?",
    a: `Starter gives you ${FREE_MONTHLY_LIMIT} full reviews a month with scoring, keyword gaps, and section grades. Pro is unlimited and adds line-by-line rewrites, an ATS optimization checklist, and likely interview questions.`,
  },
  {
    q: "Do you charge real money?",
    a: "No. This is a demo deployment, so checkout is simulated and nothing is ever charged — though the upgrade still runs through the same webhook handler a real payment would, which is what unlocks Pro in the database.",
  },
];
