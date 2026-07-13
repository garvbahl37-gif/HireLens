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
    <div className="card fade-up p-8">
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 mb-7 text-sm text-muted">
        Log in to see your review history.
      </p>
      <AuthForm mode="login" nextUrl={nextUrl} />
      <div className="mt-6 rounded-lg border border-edge bg-card2 px-4 py-3 text-xs text-muted">
        <span className="font-semibold text-ink">Just evaluating?</span> Use
        the demo account:{" "}
        <code className="font-mono text-accent">demo@hirelens.app</code> ·{" "}
        <code className="font-mono text-accent">demo1234</code>
      </div>
    </div>
  );
}
