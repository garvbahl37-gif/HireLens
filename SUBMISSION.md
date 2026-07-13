# HireLens — Submission Notes

A quick map from the assessment's five non-negotiable requirements to where each one lives, plus a demo-video script and the exact click-path a grader can follow.

## Requirement → evidence

### 1. Marketing / landing page
- [src/app/page.tsx](src/app/page.tsx) — hero with value prop, feature grid (six cards, two flagged **PRO**), a three-step "how it works", a **two-tier pricing table** (Starter / Pro) with a monthly↔yearly toggle, FAQ, and a footer.
- The two tiers gate different features and the gate is real (see #4). Starter lists "3 reviews per month"; Pro lists "unlimited + rewrites + ATS checklist + interview questions".
- **Every** CTA (`Get started`, `Start free`, `Review my resume free`, `Upgrade to Pro`) links into the real `/signup` or `/dashboard/billing` flow — nothing is a dead mockup. The Pro CTA carries the chosen interval through signup so the user lands ready to pay.

### 2. Authentication
- [src/app/api/auth/signup/route.ts](src/app/api/auth/signup/route.ts) / [login](src/app/api/auth/login/route.ts) / [logout](src/app/api/auth/logout/route.ts) — email + password, bcrypt (cost 10).
- [src/lib/session.ts](src/lib/session.ts) — session is a signed JWT (jose, HS256) in an **httpOnly, SameSite=Lax, Secure-in-prod** cookie, 30-day expiry. **Persists across reloads and browser restarts.** Verified in the browser: reload on `/dashboard` stays logged in.
- [src/proxy.ts](src/proxy.ts) — Next 16 proxy (the renamed middleware) guards `/dashboard/**` and bounces authed users away from `/login`+`/signup`.

### 3. The actual product (real, per-user, persisted)
- [src/lib/ai.ts](src/lib/ai.ts) — sends the extracted resume + job description to Grok with a strict recruiter-persona prompt; the response is **Zod-validated** and retried once on malformed JSON.
- [src/app/api/reviews/route.ts](src/app/api/reviews/route.ts) — real **PDF text extraction** (unpdf), input validation, then persists a `Review` row **per user** in Postgres. Not in-memory: reloading, logging out and back in, all show the same saved history.
- Results UI: [src/components/ReviewResult.tsx](src/components/ReviewResult.tsx) — score ring, five scored dimensions, matched/missing ATS keywords, strengths, prioritized fixes with severity, A–F section grades.

### 4. Subscriptions & payments — the part most teams skip
- **Checkout:** [src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts) creates a Stripe Checkout Session (subscription mode), creating/reusing the Stripe customer.
- **Webhook (server-side, the source of truth):** [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts) verifies the signature, records the event id in a `StripeEvent` table for **idempotency**, and on `checkout.session.completed` / `customer.subscription.*` / `invoice.paid` writes `plan = PRO` (and period end, cancel flag) into **our** database. **A payment that doesn't reach this handler upgrades nobody** — the success page is cosmetic.
- **The gate is enforced, not cosmetic:** [src/app/api/reviews/route.ts](src/app/api/reviews/route.ts) counts the user's reviews for the current month and returns HTTP `402 LIMIT_REACHED` once a free user hits 3. Pro users skip the cap **and** get the deep-analysis sections, which are never generated for free users in the first place.
- **Billing/account page:** [src/app/dashboard/billing/page.tsx](src/app/dashboard/billing/page.tsx) shows the current plan + usage, renewal date, and **Cancel** (at period end) / **Resume**, plus the Stripe billing portal.

### 5. Deployment
- Configured for Vercel: `vercel-build` runs `prisma migrate deploy` so the schema ships with each deploy. See the README's deployment section. Add the live URL to the README and the top of this file once deployed.

---

## Demo video script (~3 minutes)

> Record at 1440×900. The demo account already has two reviews of history so nothing looks empty.

**0:00 — Landing (10s).** Load the home page. "HireLens scores your resume against a specific job." Scroll through hero → features → pricing. Point out the two tiers and the monthly/yearly toggle. Click **Get started**.

**0:20 — Signup + auth (25s).** Create a fresh account (`grader+demo@…`). Land on the dashboard. **Reload the page** — "still logged in; the session is a signed httpOnly cookie." (This is the "sessions persist" checkbox, on camera.)

**0:45 — Core feature (50s).** Click **New review**. Upload `fixtures/sample-resume.pdf`, fill in "Senior Frontend Engineer", "Stripe", and paste the job description. Hit **Review my resume**. When the result loads, walk the score ring, the missing ATS keywords, and the "Fix these, in order" list. "This is a real model call, validated and saved to my account." Scroll to the locked **deep analysis** panel — "that's gated behind Pro."

**1:35 — Hit the free limit (20s).** Run two more reviews (or note you're at 3/3). On the 4th attempt the UI shows the limit card. "The cap is enforced server-side — the API returns 402, not just a hidden button."

**1:55 — Pay (40s).** Go to **Billing** → **Upgrade to Pro** → Stripe Checkout. Pay with `4242 4242 4242 4242`. Return to the billing page — "the webhook just flipped my plan to Pro in the database; this page is polling for it." Show it flip to **Pro / Active**.

**2:35 — Pro unlocked + cancel (25s).** Run one more review — now it's unlimited and the result includes **line-by-line rewrites**, the **ATS checklist**, and **interview questions**. Back to Billing → **Cancel subscription** → confirm. "Cancels at period end, and I can resume." Done.

> No Stripe account while filming? `npm run stripe:simulate -- <email> upgrade` drives the identical webhook path so you can still show the plan flip.

---

## Grader quick-start (no build required to understand it)

```bash
npm install
cp .env.example .env            # AUTH_SECRET is pre-generated in the example; set MOCK_AI=1 to skip needing an AI key
npm run db:dev &                # embedded Postgres, no Docker
npm run db:migrate && npm run db:seed
npm run dev
# open http://localhost:3000, log in as demo@hirelens.app / demo1234
```

## What I'd add with more time
- Google OAuth (the session layer is provider-agnostic, so this is additive).
- Resume-vs-resume diff view to visualize score improvement between versions.
- Rate limiting on `/api/reviews` beyond the plan cap (per-IP), and a background queue for very long resumes.
- E2E tests in CI (the Playwright flow used to verify this build is the natural seed).
