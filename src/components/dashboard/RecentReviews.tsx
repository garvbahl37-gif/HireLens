import Link from "next/link";
import { Plus } from "lucide-react";
import { Morph } from "@/components/Morph";
import { ProgressRing } from "./ProgressRing";

export type RecentReview = {
  id: string;
  jobTitle: string;
  company: string | null;
  overallScore: number;
  date: string;
};

/* Soft monogram backgrounds, in the spirit of the reference's portrait
   chips. Picked by hashing the company so a company keeps its colour. */
const TINTS = ["#f6c6cc", "#f5d98b", "#9fd8cb", "#f3c9a5", "#cfd6f5", "#bfe3a8"];

function tint(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function Monogram({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-ink/80 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.7)]"
      style={{ background: tint(name) }}
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

export function RecentReviews({
  items,
  total,
}: {
  items: RecentReview[];
  total: number;
}) {
  return (
    <section className="card flex w-full min-w-0 flex-col p-5 md:p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium tracking-tight">Recent reviews</h2>
        {total > items.length && (
          <a href="#history" className="text-sm font-medium text-accent hover:underline">
            All {total}
          </a>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          Reviews you run show up here with their score.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-ink/10">
          {items.map((r, i) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/reviews/${r.id}`}
                className="group -mx-2 flex items-center gap-3.5 rounded-xl px-2 py-3.5 transition-colors hover:bg-white/45"
              >
                {/* these glide into the review page's header on click */}
                <Morph name={`review-avatar-${r.id}`}>
                  <span className="shrink-0">
                    <Monogram name={r.company || r.jobTitle} />
                  </span>
                </Morph>
                <Morph name={`review-title-${r.id}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {r.company || r.jobTitle}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {r.company ? `${r.jobTitle}, ` : ""}
                      {r.date}
                    </span>
                  </span>
                </Morph>
                <ProgressRing score={r.overallScore} delay={0.45 + i * 0.12} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* with fewer than four reviews the card would end in dead space; pin
          the next step to its floor instead, level with its neighbour */}
      {items.length < 4 && (
        <div className="mt-auto pt-5">
          <Link
            href="/dashboard/new"
            className="flex items-center justify-between rounded-2xl border border-dashed border-ink/20 px-4 py-3.5 text-sm text-muted transition-colors hover:border-accent/50 hover:bg-white/45 hover:text-ink"
          >
            {items.length === 0 ? "Run your first review" : "Score another role to compare"}
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
