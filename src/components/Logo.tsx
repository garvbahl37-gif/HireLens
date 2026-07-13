import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-7 w-7", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="hl-g" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#ffb877" />
          <stop offset="55%" stopColor="#f2622e" />
          <stop offset="100%" stopColor="#ff9a4f" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" stroke="url(#hl-g)" strokeWidth="2.6" />
      <circle cx="16" cy="16" r="5.5" fill="url(#hl-g)" />
      <path
        d="M25 25 L30 30"
        stroke="url(#hl-g)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <LogoMark className="transition-transform group-hover:rotate-12" />
      <span className="text-lg font-bold tracking-tight">
        Hire<span className="text-gradient">Lens</span>
      </span>
    </Link>
  );
}
