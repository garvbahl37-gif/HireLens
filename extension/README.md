# HireLens — Chrome extension

Score any job posting against your resume in one click, right on the job page.
Works on LinkedIn, Indeed, Greenhouse, Lever and Ashby, plus a generic
fallback for other sites.

## How it works

1. You open a job posting.
2. You click the HireLens toolbar icon.
3. The popup reads the job description off the page, sends it to HireLens, and
   scores it against your **primary resume** — showing the fit score, the
   keywords you're missing, and the ones you already match.

Auth is your existing HireLens login: the extension reads the session cookie and
presents it as a bearer token, so there's no separate sign-in. If you're not
logged in, or you haven't set a primary resume, the popup links you to the right
page.

## Try it locally (unpacked)

1. Run HireLens locally: `npm run dev` (it serves at `http://localhost:3000`).
   `extension/config.js` already points there.
2. In HireLens: sign in, then go to **Account → Primary resume** and paste your
   resume. (If you skip this, the extension falls back to your most recent
   review's resume.)
3. In Chrome: open `chrome://extensions`, turn on **Developer mode** (top right),
   click **Load unpacked**, and select this `extension/` folder.
4. Open any job posting and click the HireLens icon in the toolbar.

## Ship it to the Chrome Web Store

1. In `config.js`, set `HIRELENS_API` to your production URL
   (e.g. `https://hirelens.app`). Make sure that origin is also listed in
   `host_permissions` in `manifest.json` (it already is for `hirelens.app`).
2. Bump `version` in `manifest.json`.
3. Zip the **contents** of this folder (not the folder itself):
   `cd extension && zip -r ../hirelens-extension.zip . -x ".*"`
4. Create a **Chrome Web Store developer account** (one-time $5 fee) at
   https://chrome.google.com/webstore/devconsole
5. Upload the zip, fill in the listing (icon, screenshots, a short + long
   description, and a **privacy policy URL** — the store requires one because the
   extension reads page content and calls your API), and submit for review.
   Review typically takes a few days.

## What HireLens needs on its side (already built)

- `POST /api/extension/score` — CORS-enabled, bearer-authenticated, scores a job
  against the user's primary resume. Nothing is persisted; it does not count
  against the monthly review quota.
- A **primary resume** on the account (Account → Primary resume), with an
  automatic fallback to the user's most recent review resume.

## Files

- `manifest.json` — MV3 manifest, permissions, host permissions.
- `config.js` — the HireLens API URL and session-cookie name.
- `popup/` — the popup UI (`popup.html` / `popup.css` / `popup.js`), including the
  self-contained per-site job extractor.
- `icons/` — toolbar/store icons (16 / 48 / 128).

## Privacy

The extension only reads the job description from the page you're viewing, and
only when you click the icon (`activeTab`). It sends that text to your HireLens
account to score it. It does not read pages in the background and stores nothing
locally beyond your existing HireLens session.
