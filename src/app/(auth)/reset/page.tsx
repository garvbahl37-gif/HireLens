import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/ResetForms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // The token is not validated here. Doing so would mean a page render that
  // spends a single-use token — and email clients prefetch links, so the user
  // could arrive at a form whose token had already been consumed by their own
  // mail app. It is checked exactly once, on submit.
  if (!token) {
    return (
      <div className="card fade-up p-8">
        <h1 className="text-2xl font-bold tracking-tight">Link incomplete</h1>
        <p className="mt-1 mb-7 text-sm text-muted">
          That reset link is missing its token. Some email clients truncate long
          URLs — try copying the whole link, or request a fresh one.
        </p>
        <Link href="/forgot" className="btn btn-primary w-full">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="card fade-up p-8">
      <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mt-1 mb-7 text-sm text-muted">
        Pick something you haven&rsquo;t used before.
      </p>
      <ResetForm token={token} />
    </div>
  );
}
