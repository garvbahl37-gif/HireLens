import { Loader } from "@/components/Loader";

/**
 * The app shell's loading state.
 *
 * This has to live at the ROOT, not just inside /dashboard. The dashboard
 * layout is async — it awaits the session, the usage count and the cookies —
 * and a `loading.tsx` inside that layout cannot paint until the layout itself
 * has resolved. So on a hard reload you got a blank screen through all of that
 * database work, and only then a loader flash.
 *
 * The root layout is synchronous, so this boundary paints immediately and
 * covers everything below it, including the async layouts.
 */
export default function RootLoading() {
  return <Loader label="Reading the room" />;
}
