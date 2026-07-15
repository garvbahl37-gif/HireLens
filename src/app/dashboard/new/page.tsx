import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ReviewForm } from "@/components/ReviewForm";
import { requireUser } from "@/lib/auth";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";
import { monthlyReviewCount } from "@/lib/usage";

export const metadata: Metadata = { title: "New review" };

export default async function NewReviewPage() {
  const user = await requireUser();
  const isPro = user.plan === "PRO";
  const used = isPro ? null : await monthlyReviewCount(user.id);
  const remaining = used === null ? null : Math.max(0, FREE_MONTHLY_LIMIT - used);

  return (
    <div className="relative mx-auto max-w-3xl">
      <header className="fade-up relative mb-9">
        <span className="chip gap-1.5 border-accent/40 text-accent">
          <Sparkles className="h-3.5 w-3.5" /> New review
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Put your resume <span className="text-gradient">under the lens</span>
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-muted">
          Add your resume and the role you&apos;re chasing. In seconds you get a
          recruiter-calibrated read — keyword gaps, weak bullets rewritten, and
          the interview questions your gaps will trigger.
        </p>
      </header>

      <ReviewForm isPro={isPro} outOfQuota={remaining === 0} />
    </div>
  );
}
