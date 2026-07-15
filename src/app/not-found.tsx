import Link from "next/link";
import { Home, Search } from "lucide-react";

/**
 * 404. Also where an expired or malformed dashboard link lands (notFound() is
 * called from several pages), so it keeps the product's shell instead of the
 * framework's bare default.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-edge bg-card2">
          <Search className="h-5 w-5 text-faint" />
        </div>
        <h1 className="mt-5 text-lg font-bold">We couldn&rsquo;t find that</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The page may have moved, or the link is out of date. It isn&rsquo;t
          something you did wrong.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className="btn btn-primary">
            <Home className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
