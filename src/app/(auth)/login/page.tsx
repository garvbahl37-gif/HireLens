import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextUrl = safeNext(params.next) ?? "/dashboard";

  return (
    <div className="card fade-up flex h-full flex-col justify-center p-6 sm:p-9">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back</h1>
      <p className="mt-2 mb-7 text-sm leading-relaxed text-muted">
        Log in to see your review history.
      </p>
      <AuthForm mode="login" nextUrl={nextUrl} />
      <div className="mt-6 rounded-2xl border border-white/80 bg-white/50 px-4 py-3 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-ink">Just evaluating?</span> Use
        the demo account:{" "}
        <code className="font-mono text-[0.8rem] text-accent">demo@hirelens.app</code> ·{" "}
        <code className="font-mono text-[0.8rem] text-accent">demo1234</code>
      </div>
    </div>
  );
}
