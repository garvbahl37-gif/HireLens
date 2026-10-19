import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Logo } from "@/components/Logo";

/**
 * 404. Also where an expired or malformed dashboard link lands (notFound() is
 * called from several pages), so it keeps the product's shell instead of the
 * framework's bare default.
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 bg-forest md:p-3">
      <div className="canopy flex min-h-dvh min-w-0 flex-1 flex-col overflow-clip md:min-h-[calc(100dvh-1.5rem)] md:rounded-[26px]">
        <header className="px-5 pt-5 md:px-8 md:pt-6">
          <Logo href="/dashboard" tone="light" />
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-10 md:items-center md:py-12">
          <div className="card w-full max-w-md p-6 text-center sm:p-9">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/70 text-muted">
              <Search className="h-5 w-5" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              We couldn&rsquo;t find that
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The page may have moved, or the link is out of date. It isn&rsquo;t
              something you did wrong.
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <Link href="/dashboard" className="btn btn-primary">
                <Home className="h-4 w-4" /> Back to dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
