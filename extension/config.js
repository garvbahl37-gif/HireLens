// Where the extension talks to HireLens.
//
// For local testing, leave this as localhost:3000 (run `npm run dev`).
// BEFORE you publish to the Chrome Web Store, change it to your production URL
// (e.g. "https://hirelens.app") and make sure that origin is in
// host_permissions in manifest.json.
const HIRELENS_API = "http://localhost:3000";

// The cookie the HireLens session lives in (see src/lib/session.ts).
const SESSION_COOKIE = "hl_session";
