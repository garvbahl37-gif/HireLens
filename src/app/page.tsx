import Link from "next/link";
import {
  ArrowRight,
  FileSearch,
  Gauge,
  History,
  MessageSquareText,
  PenLine,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ScoreBar, ScoreRing } from "@/components/ScoreRing";
import { PricingCards } from "@/components/PricingCards";
import { getCurrentUser } from "@/lib/auth";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const authed = !!user;

  return (
    <div className="flex-1">
      {/* ---------------- Nav ---------------- */}
      <header className="sticky top-0 z-40 border-b border-edge/70 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#features" className="hover:text-ink transition-colors">
              Features
            </a>
            <a href="#how" className="hover:text-ink transition-colors">
              How it works
            </a>
            <a href="#pricing" className="hover:text-ink transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-ink transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {authed ? (
              <Link href="/dashboard" className="btn btn-primary">
                Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-muted hover:text-ink transition-colors"
                >
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-primary">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div
          className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-20 lg:grid-cols-2">
          <div className="fade-up">
            <span className="chip mb-6 gap-1.5 text-accent border-accent/40">
              <Sparkles className="h-3.5 w-3.5" />
              Recruiter-calibrated AI review
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Know exactly why your resume gets rejected —{" "}
              <span className="text-gradient">and fix it.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted leading-relaxed">
              Upload your resume, paste the job description, and get a scored,
              section-by-section review in seconds: keyword gaps the ATS will
              punish, weak bullets rewritten, and the interview questions your
              gaps will trigger.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href={authed ? "/dashboard/new" : "/signup"}
                className="btn btn-primary text-base px-6 py-3"
              >
                Review my resume free <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pricing" className="btn btn-ghost text-base px-6 py-3">
                See pricing
              </a>
            </div>
            <p className="mt-4 text-sm text-faint">
              Free plan · {FREE_MONTHLY_LIMIT} reviews a month · no card
              required
            </p>
          </div>

          {/* mock result card — built from the real result components */}
          <div
            className="fade-up card relative p-6 shadow-2xl lg:p-7"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="flex items-center justify-between border-b border-edge pb-4">
              <div>
                <p className="text-sm font-bold">
                  Senior Frontend Engineer · Stripe
                </p>
                <p className="text-xs text-muted mt-0.5">
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
              <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Missing keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Kubernetes", "CI/CD", "GraphQL", "Terraform"].map((k) => (
                  <span key={k} className="chip text-bad border-bad/30">
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-card2 border border-edge p-3.5 text-xs leading-relaxed text-muted">
              <span className="font-semibold text-warn">Fix first:</span> Only
              2 of 11 bullets contain numbers. Rewrite &ldquo;worked on
              checkout flow&rdquo; → &ldquo;cut checkout abandonment 18% by
              rebuilding the payment flow in React&rdquo;.
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="border-t border-edge/60 bg-surface/50">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            A hiring manager’s eye,{" "}
            <span className="text-gradient">on demand</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted">
            Not a grammar checker. HireLens reads your resume the way the
            person rejecting it does — against a specific job.
          </p>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card p-6 transition-transform hover:-translate-y-1"
              >
                <f.icon className="h-6 w-6 text-accent" />
                <h3 className="mt-4 font-bold">
                  {f.title}
                  {f.pro && (
                    <span className="ml-2 chip text-[10px] text-accent border-accent/40 px-2 py-0">
                      PRO
                    </span>
                  )}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          Three minutes to a{" "}
          <span className="text-gradient">better resume</span>
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="font-bold">{s.title}</h3>
              </div>
              <p className="mt-3 pl-14 text-sm leading-relaxed text-muted">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Pricing ---------------- */}
      <section
        id="pricing"
        className="border-t border-edge/60 bg-surface/50 px-5 py-24"
      >
        <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          Simple pricing, <span className="text-gradient">honest limits</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted">
          Start free. Upgrade when one interview would already pay for a year
          of Pro.
        </p>
        <div className="mt-14">
          <PricingCards authed={authed} plan={user?.plan ?? null} />
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">
          Questions
        </h2>
        <div className="mt-10 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="card group p-5">
              <summary className="cursor-pointer list-none font-semibold flex items-center justify-between">
                {f.q}
                <span className="text-muted transition-transform group-open:rotate-45 text-xl leading-none">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------------- CTA + Footer ---------------- */}
      <section className="border-t border-edge/60 bg-surface/50">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your next application deserves{" "}
            <span className="text-gradient">a second pair of eyes.</span>
          </h2>
          <Link
            href={authed ? "/dashboard/new" : "/signup"}
            className="btn btn-primary mt-8 px-7 py-3 text-base"
          >
            Get your free review <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <footer className="border-t border-edge/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-faint sm:flex-row">
            <Logo />
            <p>
              © {new Date().getFullYear()} HireLens. Payments in Stripe test
              mode — no real charges.
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    icon: Gauge,
    title: "Recruiter-calibrated scoring",
    body: "An overall verdict plus five dimensions — job match, ATS readiness, impact, clarity, structure — scored the way screeners actually think.",
    pro: false,
  },
  {
    icon: ScanSearch,
    title: "ATS keyword gap",
    body: "See exactly which hard requirements from the job description are missing from your resume before a keyword filter bins it.",
    pro: false,
  },
  {
    icon: FileSearch,
    title: "Section-by-section grades",
    body: "Summary, Experience, Projects, Skills, Education — each graded A–F with specific feedback, not generic tips.",
    pro: false,
  },
  {
    icon: PenLine,
    title: "Line-by-line rewrites",
    body: "Your weakest bullets, quoted verbatim and rewritten into quantified, achievement-driven lines tailored to the role.",
    pro: true,
  },
  {
    icon: MessageSquareText,
    title: "Interview question prep",
    body: "The questions your resume's gaps will provoke — so the hole in your story becomes a rehearsed answer.",
    pro: true,
  },
  {
    icon: History,
    title: "History & tracking",
    body: "Every review saved to your account. Iterate on your resume and watch the score climb between versions.",
    pro: false,
  },
];

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
    a: "This is a demo deployment: Stripe runs in test mode, so no real charges ever occur. Use test card 4242 4242 4242 4242 to try the full upgrade flow.",
  },
];
