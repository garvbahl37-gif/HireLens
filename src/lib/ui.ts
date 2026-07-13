/**
 * Shared UI constants read by BOTH server and client code.
 *
 * This must not be a "use client" module: when a server component imports
 * from one, every export is replaced by a client reference, so a plain string
 * constant does not survive the boundary — it arrives as an opaque object.
 * That silently broke the sidebar's server-side cookie read.
 */

/** Sidebar collapse preference. A cookie (not localStorage) so the server can
 *  render the rail at the right width on first paint, with no flash. */
export const SIDEBAR_COOKIE = "hl_sidebar";
