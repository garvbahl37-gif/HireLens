"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Fades each route in, keyed on the pathname so a navigation replays it.
 *
 * This deliberately uses a CSS animation rather than motion's `initial`/
 * `animate`. A motion.div with `initial={{ opacity: 0 }}` renders
 * `style="opacity:0"` into the streamed HTML and only becomes visible once
 * React has hydrated — which means anything inside it is INVISIBLE during
 * streaming, including the Suspense fallback from loading.tsx. That is exactly
 * why the loading animation never appeared on a hard reload: it was mounted
 * and animating, at zero opacity, inside this wrapper.
 *
 * A CSS animation runs on paint, with no JavaScript, so the loader is visible
 * from the first frame the browser draws.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="fade-up flex flex-1 flex-col">
      {children}
    </div>
  );
}
