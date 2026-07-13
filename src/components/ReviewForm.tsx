"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ClipboardPaste, FileUp, Loader2, Lock, X } from "lucide-react";
import { AnalyzingOverlay } from "@/components/AnalyzingOverlay";
import { cn } from "@/lib/cn";

type ResumeMode = "upload" | "paste";

export function ReviewForm({ isPro = false }: { isPro?: boolean }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ResumeMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

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
      {/* ------- resume input ------- */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Your resume</h2>
          <div className="inline-flex rounded-lg border border-edge bg-surface p-0.5 text-sm">
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
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
                  mode === t.key
                    ? "bg-card2 text-ink"
                    : "text-muted hover:text-ink"
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

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
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40",
              dragOver
                ? "border-accent bg-accent/5"
                : "border-edge2 hover:border-accent/60"
            )}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex items-center gap-3">
                <FileUp className="h-5 w-5 text-accent" />
                <span className="font-medium">{file.name}</span>
                <span className="text-xs text-muted">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  className="rounded-full p-1 text-muted hover:bg-card2 hover:text-bad"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <FileUp className="mb-3 h-8 w-8 text-muted" />
                <p className="font-medium">
                  Drop your resume here or{" "}
                  <span className="text-accent">browse</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  PDF or .txt · max 8 MB · text-based PDFs only
                </p>
              </>
            )}
          </div>
        ) : (
          <textarea
            name="resumeText"
            className="input min-h-[220px] font-mono text-sm leading-relaxed"
            placeholder="Paste the full text of your resume…"
          />
        )}
      </div>

      {/* ------- job ------- */}
      <div className="card space-y-4 p-6">
        <h2 className="font-bold">The job you&apos;re targeting</h2>
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
        <div>
          <label className="label" htmlFor="jobDescription">
            Job description *
          </label>
          <textarea
            id="jobDescription"
            name="jobDescription"
            className="input min-h-[180px] text-sm leading-relaxed"
            placeholder="Paste the full job description — requirements, responsibilities, all of it. The more complete it is, the sharper the review."
            required
          />
        </div>
      </div>

      {/* ------- errors / limit ------- */}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad"
        >
          {error}
        </p>
      )}

      {limitHit && (
        <div className="card border-accent/50 p-6 text-center">
          <Lock className="mx-auto h-6 w-6 text-accent" />
          <h3 className="mt-3 font-bold">You&apos;ve used your 3 free reviews this month</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Upgrade to Pro for unlimited reviews, line-by-line rewrites, and
            ATS optimizations.
          </p>
          <Link href="/dashboard/billing?intent=pro" className="btn btn-primary mt-5">
            Upgrade to Pro
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || limitHit}
        className="btn btn-primary btn-sheen w-full py-3 text-base"
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing…
          </>
        ) : (
          "Review my resume"
        )}
      </button>

      <AnimatePresence>
        {pending && <AnalyzingOverlay deep={isPro} />}
      </AnimatePresence>
    </form>
  );
}
