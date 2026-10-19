import Link from "next/link";
import { FileSearch, Mic, Target } from "lucide-react";
import { Logo } from "@/components/Logo";

const POINTS = [
  { icon: Target, title: "Scored against the job", body: "Five dimensions, out of 100, for the role you want." },
  { icon: FileSearch, title: "The gaps an ATS will catch", body: "Missing keywords and weak bullets, named and rewritten." },
  { icon: Mic, title: "Then defend it out loud", body: "A voice mock interview that quotes your resume back." },
];

/**
 * The public auth screens wear the same greenhouse as the dashboard: the
 * forest frame around a green canopy panel, frosted glass on top. On desktop a
 * forest card with the orb sits beside the form, the one dark emphasis on the
 * surface; on a phone it's just the brand row and the form.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 bg-forest md:p-3">
      <div className="canopy flex min-h-dvh min-w-0 flex-1 flex-col overflow-clip md:min-h-[calc(100dvh-1.5rem)] md:rounded-[26px]">
        <header className="flex items-center justify-between gap-4 px-5 pt-5 md:px-8 md:pt-6">
          <Logo tone="light" />
          <Link
            href="/"
            className="canopy-search flex h-10 items-center px-4 text-sm font-medium transition-colors hover:bg-white/20 focus-visible:outline-white"
          >
            Home
          </Link>
        </header>

        <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-8 md:items-center md:px-8 md:py-12">
          <div className="grid w-full max-w-[1000px] items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
            <aside className="card-forest relative hidden flex-col overflow-hidden p-9 lg:flex">
              <div className="orb h-[76px] w-[76px]" aria-hidden />
              <p className="mt-8 max-w-sm text-[1.9rem] font-medium leading-tight tracking-tight">
                Know exactly why your resume gets rejected.
              </p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
                A recruiter-grade review in seconds, then practice defending
                every claim on it.
              </p>

              <ul className="mt-auto space-y-2.5 pt-10">
                {POINTS.map((p) => (
                  <li
                    key={p.title}
                    className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-neon">
                      <p.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{p.title}</p>
                      <p className="mt-0.5 text-sm text-white/65">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>

            <div className="mx-auto w-full max-w-md lg:max-w-none">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
