"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/**
 * Route changes dissolve through a blur, the way the reference's screens do:
 * the old page blurs away quickly, the new one comes into focus a beat later.
 *
 * Keyed on the pathname so each navigation exits one boundary and enters a
 * new one. It's a browser View Transition, so it costs nothing before
 * hydration — streaming fallbacks (loading.tsx) paint immediately — and
 * browsers without the API simply swap pages.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition key={pathname} enter="hl-page-in" exit="hl-page-out" default="none">
      <div className="flex flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}
