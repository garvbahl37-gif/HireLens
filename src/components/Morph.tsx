import { ViewTransition, type ReactNode } from "react";

/**
 * Marks an element as the same object on two pages, so navigating between
 * them glides it from one place to the other (a shared-element morph via
 * React's <ViewTransition>). Without a name it renders its child untouched.
 * A name must be unique on any one page.
 */
export function Morph({ name, children }: { name?: string; children: ReactNode }) {
  if (!name) return <>{children}</>;
  return (
    <ViewTransition name={name} share="morph">
      {children}
    </ViewTransition>
  );
}
