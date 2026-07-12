import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ReviewForm } from "@/components/ReviewForm";
import { getCurrentUser } from "@/lib/auth";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";
import { monthlyReviewCount } from "@/lib/usage";

export const metadata: Metadata = { title: "New review" };

export default async function NewReviewPage() {
  const user = (await getCurrentUser())!;
  const used = user.plan === "FREE" ? await monthlyReviewCount(user.id) : null;
  const remaining = used === null ? null : Math.max(0, FREE_MONTHLY_LIMIT - used);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New review</h1>
        <p className="mt-1 text-sm text-muted">
          {user.plan === "PRO" ? (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Pro: deep analysis with rewrites, ATS checklist and interview
              prep.
            </span>
          ) : remaining === 0 ? (
            <>
              You&apos;re out of free reviews this month.{" "}
              <Link
                href="/dashboard/billing?intent=pro"
                className="font-semibold text-accent hover:underline"
              >
                Upgrade to Pro
              </Link>{" "}
              for unlimited.
            </>
          ) : (
            <>
              {remaining} of {FREE_MONTHLY_LIMIT} free reviews left this month.
            </>
          )}
        </p>
      </div>
      <ReviewForm />
    </div>
  );
}
