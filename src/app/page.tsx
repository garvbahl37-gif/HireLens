import Link from "next/link";
import { FileText, Puzzle, ScrollText, KanbanSquare, Mic } from "lucide-react";
import { Faq } from "@/components/landing/Faq";
import { Proof } from "@/components/landing/Proof";
import { InterviewShowcase } from "@/components/landing/InterviewShowcase";
import { LogoMark } from "@/components/Logo";
import { PricingCards } from "@/components/PricingCards";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Catches } from "@/components/landing/Catches";
import { Stats } from "@/components/landing/Stats";
import { Footer } from "@/components/landing/Footer";
import { Rise, ScrollWords } from "@/components/landing/motion";
import { getCurrentUser } from "@/lib/auth";
import { DIMENSION_LABELS } from "@/lib/ai";
import { isDemoBilling } from "@/lib/demo-billing";
import {
  FREE_INTERVIEWS_PER_MONTH,
  FREE_MONTHLY_LIMIT,
  INTERVIEW_QUESTIONS_PRO,
} from "@/lib/plans";

const DIMENSIONS = Object.keys(DIMENSION_LABELS).length;

export default async function LandingPage() {
  const user = await getCurrentUser();
  const authed = !!user;
  const demoBilling = isDemoBilling();
  const start = authed ? "/dashboard/new" : "/signup";

  return (
    <div className="relative flex-1 overflow-x-clip bg-bg">
      {/* the reference's page wash: pale stone above, green rising from below */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(70%_45%_at_15%_100%,rgba(82,188,79,0.22),transparent_70%),radial-gradient(60%_40%_at_95%_90%,rgba(196,226,150,0.35),transparent_70%)]"
      />

      <Navbar authed={authed} />

      <Hero authed={authed} freeLimit={FREE_MONTHLY_LIMIT} dimensions={DIMENSIONS} />

      <HowItWorks authed={authed} />

      <Catches />

      <InterviewShowcase authed={authed} freeInterviews={FREE_INTERVIEWS_PER_MONTH} />

      <Stats dimensions={DIMENSIONS} proQuestions={INTERVIEW_QUESTIONS_PRO} />

      <Proof />

      {/* ---------------- Pricing ---------------- */}
      <section id="pricing" className="scroll-mt-24 px-4 pt-32 sm:pt-40">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
            <ScrollWords lines={["Simple pricing,", "honest limits"]} />
          </h2>
          <Rise y={16} className="mt-4 text-muted">
            Start free. Upgrade when one interview would already pay for a year of Pro.
          </Rise>
        </div>
        <Rise y={60} className="mt-12">
          <PricingCards authed={authed} plan={user?.plan ?? null} demo={demoBilling} />
        </Rise>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="scroll-mt-24 px-4 pt-32 sm:pt-40">
        <h2 className="text-center font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
          <ScrollWords lines={["Most frequent questions", "and answers"]} />
        </h2>
        <div className="mt-12">
          <Faq items={FAQ} />
        </div>
      </section>

      {/* ---------------- Closing panel ---------------- */}
      <section className="px-3 pt-32 sm:px-4 sm:pt-40">
        <div className="panel overflow-hidden px-5 pb-14 pt-16 text-center sm:pb-16 sm:pt-20">
          <div className="light-streaks" />
          <p className="relative flex items-center justify-center gap-2 font-semibold text-ink">
            <LogoMark className="h-6 w-6 rounded-[7px]" animate={false} /> HireLens
          </p>
          <h2 className="relative mt-4 font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
            <ScrollWords lines={["Your next application", "deserves a second look"]} />
          </h2>
          <p className="relative mt-4 text-muted">
            Free to start. No card required. Your first review takes about a minute.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href={start} className="btn-neon">
              Review my resume
            </Link>
            <a href="#how" className="btn-stone">
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* the reference's row of locations, as the places HireLens works */}
      <section className="px-4 pt-14">
        <ul className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {TOOLS.map((t) => (
            <li key={t.label} className="flex items-center gap-2.5 text-sm leading-tight text-ink">
              <t.icon className="h-4 w-4 text-accent" />
              <span>
                HireLens
                <br />
                <span className="text-muted">{t.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Footer authed={authed} />
    </div>
  );
}

const TOOLS = [
  { icon: FileText, label: "Resume review" },
  { icon: Mic, label: "Mock interview" },
  { icon: ScrollText, label: "Cover letters" },
  { icon: KanbanSquare, label: "Job tracker" },
  { icon: Puzzle, label: "Chrome extension" },
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
