"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  ClipboardPaste,
  FileText,
  FileUp,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { AnalyzingOverlay } from "@/components/AnalyzingOverlay";
import { cn } from "@/lib/cn";
import { JD_DRAFT_KEY } from "@/lib/drafts";

type ResumeMode = "upload" | "paste";

export function ReviewForm({
  isPro = false,
  outOfQuota = false,
}: {
  isPro?: boolean;
  outOfQuota?: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ResumeMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [jdLen, setJdLen] = useState(0);
  const jdRef = useRef<HTMLTextAreaElement>(null);

  // The overview's assistant composer hands a pasted job description over
  // through sessionStorage. Read it once, then clear it so a reload starts clean.
  useEffect(() => {
    let draft: string | null = null;
    try {
      draft = sessionStorage.getItem(JD_DRAFT_KEY);
      sessionStorage.removeItem(JD_DRAFT_KEY);
    } catch {
      return;
    }
    const el = jdRef.current;
    if (draft && el && !el.value) {
      // Go through the native setter: assigning el.value directly updates
      // React's value tracker too, and the input event would then be ignored.
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")
        ?.set?.call(el, draft);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.focus();
    }
  }, []);

  function acceptFile(f: File | undefined | null) {
    if (!f) return;
    const ok =
      f.type === "application/pdf" ||
      f.name.toLowerCase().endsWith(".pdf") ||
      f.type.startsWith("text/") ||
      f.name.toLowerCase().endsWith(".txt");
    if (!ok) {
      setError("Upload a PDF or .txt file — or switch to paste mode.");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setError("File is too large (max 8 MB).");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLimitHit(false);

    const form = new FormData(e.currentTarget);
    if (mode === "upload") {
      form.delete("resumeText");
      if (!file) {
        setError("Add your resume PDF first (or switch to paste mode).");
        return;
      }
      form.set("file", file);
    } else {
      form.delete("file");
    }

    setPending(true);
    try {
      const res = await fetch("/api/reviews", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "LIMIT_REACHED") {
          setLimitHit(true);
        } else {
          setError(data.error ?? "Something went wrong. Try again.");
        }
        setPending(false);
        return;
      }
      router.push(`/dashboard/reviews/${data.id}`);
    } catch {
      setError("Network error — is the server reachable?");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ---------------- Step 1 · resume ---------------- */}
      <StepCard
        n={1}
        title="Your resume"
        hint="PDF or paste — text-based only"
        action={<ModeToggle mode={mode} setMode={setMode} />}
      >
        {mode === "upload" ? (
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload your resume — PDF or text file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInput.current?.click();
              }
            }}
            className={cn(
              "group relative flex min-h-[210px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-5 py-9 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              file
                ? "border-solid border-white/80 bg-white/55"
                : dragOver
                  ? "scale-[1.005] border-dashed border-accent2 bg-white/60"
                  : "border-dashed border-ink/15 bg-white/30 hover:border-accent2/60 hover:bg-white/50"
            )}
          >
            <CornerTicks active={dragOver || !!file} />

            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />

            {file ? (
              <div className="flex w-full max-w-md items-center gap-4 text-left">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pill text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{file.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {file.size < 1024
                      ? "under 1 KB"
                      : `${(file.size / 1024).toFixed(0)} KB`}{" "}
                    · ready to analyze
                  </p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/10">
                    <span className="block h-full w-full bg-gradient-to-r from-accent to-accent2" />
                  </div>
                </div>
                <span className="hidden shrink-0 items-center gap-1 rounded-full border border-good/25 bg-white/70 px-2.5 py-1 text-xs font-semibold text-good sm:inline-flex">
                  <Check className="h-3.5 w-3.5" /> Ready
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-white/80 hover:text-bad"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <DropGlyph active={dragOver} />
                <p className="mt-5 text-base font-medium">
                  {dragOver ? (
                    "Release to scan your resume"
                  ) : (
                    <>
                      Drop your resume here, or{" "}
                      <span className="font-semibold text-accent underline decoration-accent/30 underline-offset-4">
                        browse
                      </span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted">
                  We read it exactly like an applicant tracking system would.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  {["PDF", "TXT", "≤ 8 MB"].map((t) => (
                    <span key={t} className="chip text-xs text-muted">
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <textarea
              name="resumeText"
              className="input min-h-[230px] font-mono text-sm leading-relaxed"
              placeholder="Paste the full text of your resume…"
            />
            <p className="mt-2 text-xs text-muted">
              Plain text is fine — we only need the words, not the formatting.
            </p>
          </div>
        )}
      </StepCard>

      {/* ---------------- Step 2 · the role ---------------- */}
      <StepCard
        n={2}
        title="The role you're targeting"
        hint="Reviews are always against a specific job"
        delay={0.06}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="jobTitle">
              Job title *
            </label>
            <input
              id="jobTitle"
              name="jobTitle"
              className="input"
              placeholder="Senior Frontend Engineer"
              required
              maxLength={140}
            />
          </div>
          <div>
            <label className="label" htmlFor="company">
              Company
            </label>
            <input
              id="company"
              name="company"
              className="input"
              placeholder="Stripe (optional)"
              maxLength={140}
            />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-end justify-between">
            <label className="label mb-0" htmlFor="jobDescription">
              Job description *
            </label>
            <span
              className={cn(
                "text-xs tabular-nums transition-colors",
                jdLen > 0 ? "text-faint" : "text-transparent"
              )}
            >
              {jdLen.toLocaleString()} chars
            </span>
          </div>
          <textarea
            id="jobDescription"
            name="jobDescription"
            ref={jdRef}
            onChange={(e) => setJdLen(e.target.value.length)}
            className="input mt-1.5 min-h-[180px] text-sm leading-relaxed"
            placeholder="Paste the full job description — requirements, responsibilities, all of it. The more complete it is, the sharper the review."
            required
          />
        </div>
      </StepCard>

      {/* ---------------- errors / limit ---------------- */}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad"
        >
          {error}
        </p>
      )}

      {limitHit && (
        <div className="card flex flex-col items-center p-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pill text-white">
            <Lock className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-lg font-medium tracking-tight">
            You&apos;ve used your free reviews this month
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Upgrade to Pro for unlimited reviews, line-by-line rewrites, and ATS
            optimizations.
          </p>
          <Link
            href="/dashboard/billing?intent=pro"
            className="btn btn-primary mt-5"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}

      {/* ---------------- submit ---------------- */}
      <div className="fade-up" style={{ animationDelay: "0.12s" }}>
        <button
          type="submit"
          disabled={pending || limitHit || outOfQuota}
          className="btn btn-primary w-full py-3.5 text-base"
        >
          {pending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              {isPro ? "Run deep analysis" : "Review my resume"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5" />
          Usually about ten seconds · your resume is never used to train models.
        </p>
      </div>

      <AnimatePresence>
        {pending && <AnalyzingOverlay deep={isPro} />}
      </AnimatePresence>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* pieces                                                              */
/* ------------------------------------------------------------------ */

function StepCard({
  n,
  title,
  hint,
  action,
  children,
  delay = 0,
}: {
  n: number;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="fade-up card relative"
      style={{ animationDelay: `${delay}s` }}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pill text-sm font-semibold tabular-nums text-white">
            {n}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-medium leading-tight tracking-tight">{title}</h2>
            {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function ModeToggle({
  mode,
  setMode,
}: {
  mode: ResumeMode;
  setMode: (m: ResumeMode) => void;
}) {
  return (
    <div className="relative grid grid-cols-2 rounded-full border border-white/80 bg-white/40 p-1 text-sm">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_1px_2px_rgba(18,36,26,0.08),0_4px_12px_-6px_rgba(18,36,26,0.25)] transition-transform duration-300 ease-out"
        style={{
          transform: mode === "paste" ? "translateX(100%)" : "translateX(0)",
        }}
      />
      {(
        [
          { key: "upload", label: "Upload", icon: FileUp },
          { key: "paste", label: "Paste", icon: ClipboardPaste },
        ] as const
      ).map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setMode(t.key)}
          className={cn(
            "relative z-10 flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-colors",
            mode === t.key ? "text-ink" : "text-muted hover:text-ink"
          )}
        >
          <t.icon className="h-3.5 w-3.5" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** A document being scanned, with an upload badge — the dropzone's centrepiece. */
function DropGlyph({ active }: { active: boolean }) {
  return (
    <div className="relative grid h-24 w-24 place-items-center">
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full border border-white/80 bg-white/50 shadow-[0_10px_30px_-18px_rgba(18,36,26,0.4)]"
        animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 1.4, repeat: active ? Infinity : 0 }}
      />
      <svg viewBox="0 0 48 54" className="relative h-[4.4rem] w-[4.4rem]">
        <defs>
          <linearGradient id="dz-grad" x1="0" y1="0" x2="48" y2="54">
            <stop offset="0%" stopColor="#7af55b" />
            <stop offset="55%" stopColor="#2a9d36" />
            <stop offset="100%" stopColor="#17891f" />
          </linearGradient>
          <clipPath id="dz-doc">
            <rect x="9" y="5" width="30" height="42" rx="4" />
          </clipPath>
        </defs>
        <rect
          x="9"
          y="5"
          width="30"
          height="42"
          rx="4"
          fill="#ffffff"
          stroke="var(--color-edge2)"
          strokeWidth="1.4"
        />
        <g clipPath="url(#dz-doc)">
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x="14"
              y={12 + i * 6}
              width={i % 3 === 2 ? 12 : 20}
              height="2"
              rx="1"
              fill="var(--color-edge2)"
            />
          ))}
          <motion.rect
            x="9"
            width="30"
            height="8"
            fill="url(#dz-grad)"
            opacity="0.35"
            animate={{ y: [6, 44, 6] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>
        {/* upload badge */}
        <circle cx="37" cy="41" r="9.5" fill="url(#dz-grad)" />
        <path
          d="M37 45.5 L37 37 M33 40.5 L37 36.5 L41 40.5"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/** Scanner-target corner ticks framing the dropzone. */
function CornerTicks({ active }: { active: boolean }) {
  const base =
    "pointer-events-none absolute h-4 w-4 border-accent transition-opacity duration-300";
  const on = active ? "opacity-100" : "opacity-25";
  return (
    <>
      <span className={cn(base, on, "left-3 top-3 rounded-tl-md border-l-2 border-t-2")} />
      <span className={cn(base, on, "right-3 top-3 rounded-tr-md border-r-2 border-t-2")} />
      <span className={cn(base, on, "bottom-3 left-3 rounded-bl-md border-b-2 border-l-2")} />
      <span className={cn(base, on, "bottom-3 right-3 rounded-br-md border-b-2 border-r-2")} />
    </>
  );
}
