"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

/** Ask for a reset link. */
export function ForgotForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setPending(false);
        return;
      }
      // The server deliberately does not tell us whether the account exists, so
      // neither do we. Same screen either way.
      setSent(data.message ?? "If that email has an account, a reset link is on its way.");
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="flex gap-3 rounded-lg border border-good/40 bg-good/10 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-good" />
          <p className="text-sm text-ink">{sent}</p>
        </div>
        <p className="text-xs text-faint">
          The link works once and expires in an hour. Nothing has changed on your
          account yet — your current password still works until you set a new one.
        </p>
        <Link href="/login" className="btn btn-ghost w-full">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          placeholder="you@example.com"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad"
        >
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Send reset link
      </button>

      <p className="pt-2 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

/** Set a new password from a token in the URL. */
export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setPending(false);
        return;
      }
      // The reset logs them straight in — making someone type the password they
      // just chose is a pointless extra step.
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad"
        >
          {error}{" "}
          <Link href="/forgot" className="font-semibold underline">
            Request a new link
          </Link>
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Set new password
      </button>

      <p className="pt-2 text-center text-xs text-faint">
        This signs you out everywhere else.
      </p>
    </form>
  );
}
