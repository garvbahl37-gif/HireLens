"use client";

import Link from "next/link";
import { ArrowUpRight, Gauge, ScanSearch } from "lucide-react";
import { Rise, ScrollWords } from "./motion";

const STEPS = [
  {
    label: "Paste the job description",
    title: ["Match it to one", "specific role"],
    body: "Reviews are always against a real posting. Generic feedback is how resumes stay mediocre.",
  },
  {
    label: "Get your action plan",
    title: ["Read what to", "rewrite first"],
    body: "A scored, prioritised fix list: which bullets to rewrite, which keywords to add, and what interviewers will probe.",
  },
];

/** "Post your first task in seconds", for HireLens: a bento of the three steps. */
export function HowItWorks({ authed }: { authed: boolean }) {
  const start = authed ? "/dashboard/new" : "/signup";
  const demo = authed ? "/dashboard" : "/login";

  return (
    <section id="how" className="scroll-mt-28 px-4 pt-28 sm:pt-36">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
            <ScrollWords lines={["Your first review", "in about a minute"]} />
          </h2>
          <Rise y={16} className="mt-4 text-muted">
            Upload, paste, and read what to fix first.
          </Rise>
        </div>

        {/* step one, with the phone */}
        <Rise y={70} className="mt-12">
          <div className="glass-green relative overflow-hidden rounded-[2rem] px-6 pt-8 sm:px-10 sm:pt-10">
            <div className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(115deg,transparent_0_38px,rgba(255,255,255,0.35)_38px_40px,transparent_40px_90px)] [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]" />
            <div className="relative grid items-end gap-8 md:grid-cols-[1fr_auto]">
              <div className="pb-10 md:pb-12">
                <p className="text-sm text-muted">Upload your resume</p>
                <h3 className="mt-4 font-display text-3xl font-medium leading-[1.12] text-ink sm:text-[2.4rem]">
                  Drop in the resume
                  <br />
                  you&apos;re sending
                </h3>
                <p className="mt-5 max-w-sm leading-relaxed text-ink/75">
                  A PDF or plain text. We read it the way an applicant tracking
                  system does, so you see what the filter sees.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link href={start} className="btn-neon px-4 py-2 text-sm">
                    Review my resume
                  </Link>
                  <Link href={demo} className="btn-stone px-4 py-2 text-sm">
                    {authed ? "Open dashboard" : "Try the demo"}
                  </Link>
                </div>
              </div>
              <PhoneMock />
            </div>
          </div>
        </Rise>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <Rise key={s.label} y={70} delay={0.08 + i * 0.1}>
              <div className="glass-green flex h-full min-h-[22rem] flex-col rounded-[2rem] p-6 sm:p-10">
                <p className="text-sm text-muted">{s.label}</p>
                <h3 className="mt-4 font-display text-3xl font-medium leading-[1.12] text-ink sm:text-[2.2rem]">
                  {s.title[0]}
                  <br />
                  {s.title[1]}
                </h3>
                <p className="mt-5 max-w-sm leading-relaxed text-ink/75">{s.body}</p>
                <div className="mt-auto flex flex-wrap gap-3 pt-9">
                  <Link href={start} className="btn-neon px-4 py-2 text-sm">
                    Review my resume
                  </Link>
                  <Link href={demo} className="btn-stone px-4 py-2 text-sm">
                    {authed ? "Open dashboard" : "Try the demo"}
                  </Link>
                </div>
              </div>
            </Rise>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const FEED = [
  { file: "resume_v4.pdf, 2 min ago", role: "Senior Frontend Engineer at Stripe", score: 68, gaps: 4 },
  { file: "resume_v5.pdf, just now", role: "Product Designer at Linear", score: 81, gaps: 2 },
  { file: "resume_v5.pdf, yesterday", role: "Data Analyst at Ramp", score: 74, gaps: 3 },
];

/**
 * The reference's phone: a green screen with a serif greeting, filter chips,
 * and a feed that holds on each card and then glides to the next. The feed
 * repeats its first card at the end so the CSS loop resets invisibly.
 */
function PhoneMock() {
  const items = [...FEED, FEED[0]];
  return (
    <div aria-hidden className="relative mx-auto h-[330px] w-[250px] sm:h-[360px] sm:w-[270px]">
      <div className="absolute inset-x-0 top-0 h-[460px] rounded-[2.6rem] border-[7px] border-[#151a16] bg-[#151a16] shadow-[0_30px_60px_-20px_rgba(18,36,26,0.55)]">
        <div className="relative h-full overflow-hidden rounded-[2.1rem] bg-[linear-gradient(180deg,#3f9a3c_0%,#5fb35a_45%,#9fd29a_100%)]">
          {/* status bar + island */}
          <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold text-white">
            <span>9:41</span>
            <span className="h-5 w-20 rounded-full bg-[#151a16]" />
            <span className="flex gap-1">
              <span className="h-2 w-3 rounded-sm bg-white/90" />
              <span className="h-2 w-4 rounded-sm bg-white/90" />
            </span>
          </div>

          <div className="flex items-start justify-between px-5 pt-5">
            <p className="font-serif text-[1.45rem] leading-[1.15] text-white">
              Ready for your
              <br />
              next interview?
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 text-white">
              <ScanSearch className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-4 flex gap-1.5 px-5">
            {["Reviews", "Interviews", "Saved"].map((c, i) => (
              <span
                key={c}
                className={
                  i === 0
                    ? "rounded-full bg-[#245a26] px-3 py-1.5 text-[10px] text-white"
                    : "rounded-full border border-white/45 px-3 py-1.5 text-[10px] text-white"
                }
              >
                {c}
              </span>
            ))}
          </div>

          {/* the feed window */}
          <div className="mt-4 h-[300px] overflow-hidden px-3.5">
            <div className="phone-feed">
              {items.map((f, i) => (
                <div key={i} className="h-[190px] pb-3">
                  <div className="flex h-full flex-col rounded-[1.4rem] border border-white/70 bg-white/80 p-3.5 backdrop-blur">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] text-ink/60">{f.file}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7cc073] text-white">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <p className="mt-2 font-serif text-[1.15rem] leading-tight text-ink">{f.role}</p>
                    <div className="mt-auto grid grid-cols-2 gap-1.5">
                      <span className="flex items-center gap-1.5 rounded-xl bg-[#eef3ea] px-2 py-1.5 text-[10px] text-ink">
                        <Gauge className="h-3 w-3 text-accent" /> Score {f.score}
                      </span>
                      <span className="flex items-center gap-1.5 rounded-xl bg-[#eef3ea] px-2 py-1.5 text-[10px] text-ink">
                        <ScanSearch className="h-3 w-3 text-accent" /> {f.gaps} keyword gaps
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
