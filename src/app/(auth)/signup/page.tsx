import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; interval?: string; next?: string }>;
}) {
  const params = await searchParams;

  // Coming from the Pro pricing card → land on billing to finish upgrading.
  const nextUrl =
    params.intent === "pro"
      ? `/dashboard/billing?intent=pro&interval=${params.interval === "yearly" ? "yearly" : "monthly"}`
      : (safeNext(params.next) ?? "/dashboard");

  return (
    <div className="card fade-up p-8">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 mb-7 text-sm text-muted">
        3 free reviews a month. No card required.
      </p>
      <AuthForm mode="signup" nextUrl={nextUrl} />
    </div>
  );
}

function safeNext(next: string | undefined): string | null {
  // only allow same-site relative redirects
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return null;
}
