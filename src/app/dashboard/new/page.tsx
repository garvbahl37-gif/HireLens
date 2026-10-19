import type { Metadata } from "next";
import { Check } from "lucide-react";
import { ReviewForm } from "@/components/ReviewForm";
import { requireUser } from "@/lib/auth";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";
import { monthlyReviewCount } from "@/lib/usage";

export const metadata: Metadata = { title: "New review" };

const WHAT_YOU_GET = [
  "A score out of 100, against this exact job",
  "The keyword gaps an ATS will catch",
  "Your weak bullets, rewritten",
  "The interview questions your gaps will trigger",
];

export default async function NewReviewPage() {
  const user = await requireUser();
  const isPro = user.plan === "PRO";
  const used = isPro ? null : await monthlyReviewCount(user.id);
  const remaining = used === null ? null : Math.max(0, FREE_MONTHLY_LIMIT - used);

  return (
    <div className="mx-auto grid w-full max-w-6xl items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* The assistant column, after the overview's orb panel. It leads on a
          phone (just the orb and the intro) and sits beside the form on desktop. */}
      <aside className="fade-up card flex flex-col items-center p-6 text-center lg:sticky lg:top-6 lg:order-last lg:px-6 lg:py-9">
        <div className="orb h-[68px] w-[68px] lg:h-[84px] lg:w-[84px]" aria-hidden />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[1.65rem] lg:leading-tight">
          Put your resume under the lens
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          Add your resume and the role you&apos;re chasing. In seconds you get a
          recruiter-calibrated read — keyword gaps, weak bullets rewritten, and
          the interview questions your gaps will trigger.
        </p>
        <ul className="mt-7 hidden w-full space-y-2 text-left lg:block">
          {WHAT_YOU_GET.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/55 px-4 py-3 text-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pill text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0">
        <ReviewForm isPro={isPro} outOfQuota={remaining === 0} />
      </div>
    </div>
  );
}
