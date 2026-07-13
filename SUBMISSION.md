# HireLens — Submission notes

A map from the assessment's five non-negotiable requirements to where each one lives, and the exact click-path a grader can follow.

| | |
| --- | --- |
| **Live demo** | https://hire-lens-tawny.vercel.app |
| **Demo account** | `demo@hirelens.app` / `demo1234` |
| **Repository** | https://github.com/garvbahl37-gif/HireLens |
| **Demo video script** | [DEMO_SCRIPT.md](DEMO_SCRIPT.md) |

The demo account holds two real reviews of the same resume against the same posting: **62/100**, then **92/100** after its own feedback was applied. That is the product's actual output, not invented seed data.

---

## Requirement to evidence

### 1. Marketing / landing page

- [src/app/page.tsx](src/app/page.tsx) — hero, a "Proof" section built from the product's own 62-to-92 result, a bento feature grid (two tiles flagged **Pro**), a three-step "how it works", a **two-tier pricing table** (Starter / Pro) with a monthly-yearly toggle, an FAQ accordion, and a footer.
- The two tiers gate different features and the gate is real (see #4). Starter lists "3 reviews per month". Pro lists "unlimited, plus rewrites, ATS checklist, interview questions".
- **Every** CTA (`Get started`, `Start free`, `Review my resume free`, `Upgrade to Pro`) links into the real `/signup` or `/dashboard/billing` flow. Nothing is a dead mockup. The Pro CTA carries the chosen interval through signup so the user lands ready to pay.

### 2. Authentication

- [signup](src/app/api/auth/signup/route.ts) / [login](src/app/api/auth/login/route.ts) / [logout](src/app/api/auth/logout/route.ts) — email and password, bcrypt hashes.
- [src/lib/session.ts](src/lib/session.ts) — the session is a signed JWT (jose, HS256) in an **httpOnly, SameSite=Lax, Secure-in-production** cookie, 30-day expiry. **It persists across reloads and browser restarts.** Verified on the live site: reload on `/dashboard` stays logged in.
- [src/proxy.ts](src/proxy.ts) — guards `/dashboard/**` at the edge and bounces authenticated users away from `/login` and `/signup`.
- Destructive account actions (change password, delete account) re-authenticate against the current password, so a stolen session alone cannot lock the owner out or destroy their data.

### 3. The actual product: real, per-user, persisted

- [src/lib/ai.ts](src/lib/ai.ts) — sends the extracted resume and job description to the model with a strict recruiter-persona prompt. The response is **Zod-validated** and retried once on malformed JSON, then falls through a higher-token-limit model chain on a rate limit rather than failing.
- [src/app/api/reviews/route.ts](src/app/api/reviews/route.ts) — real **PDF text extraction** (unpdf), input validation, then persists a `Review` row **per user** in Postgres. Not in-memory: reloading, logging out and back in, all show the same saved history.
- Results: [src/components/ReviewResult.tsx](src/components/ReviewResult.tsx) — score ring, five scored dimensions, matched and missing ATS keywords, strengths, severity-ordered fixes, A-to-F section grades.
- The rewrite prompt forbids inventing metrics the candidate never stated. Where the resume gives no number, the model must leave a marked placeholder such as `[X%]`.

### 4. Subscriptions and payments — the part most teams skip

- **The single source of truth:** [src/lib/stripe-events.ts](src/lib/stripe-events.ts) is the one place a payment event becomes application state. It records the event id in a `StripeEvent` table for **idempotency**, then applies the subscription. **A payment that does not reach this handler upgrades nobody** — the success page is cosmetic.
- **Live Stripe:** [checkout](src/app/api/stripe/checkout/route.ts) creates a Checkout Session (subscription mode), [webhook](src/app/api/stripe/webhook/route.ts) verifies the signature and drives the handler above, plus [subscription](src/app/api/stripe/subscription/route.ts) (cancel/resume) and [portal](src/app/api/stripe/portal/route.ts).
- **Demo mode on this deployment:** no Stripe account is connected, so checkout is simulated and clearly labelled as such — nothing is charged and no card is collected. The simulated checkout still mints a real `checkout.session.completed` event and pushes it through **the same `processStripeEvent()` handler the live webhook calls** ([src/lib/demo-billing.ts](src/lib/demo-billing.ts)). Nothing anywhere writes `plan = PRO` directly. Setting `STRIPE_SECRET_KEY` switches to live Stripe test mode with no code change.
- **The gate is enforced, not cosmetic:** [src/app/api/reviews/route.ts](src/app/api/reviews/route.ts) counts the user's reviews for the current month and returns HTTP `402 LIMIT_REACHED` once a free user hits 3. Pro users skip the cap **and** get the deep-analysis sections, which are never generated for free users in the first place — there is nothing hidden in the payload to unhide in DevTools.
- **Billing and account pages:** [billing](src/app/dashboard/billing/page.tsx) shows the current plan, usage, renewal date, and cancel-at-period-end / resume. [account](src/app/dashboard/account/page.tsx) handles profile, password and deletion.

### 5. Deployment

- Live on Vercel with a Neon Postgres database: **https://hire-lens-tawny.vercel.app**. Not localhost.
- `vercel-build` runs `prisma generate && prisma migrate deploy && next build`, so the schema is applied on every deploy.

---

## Verified against production

The whole journey was driven end to end with Playwright against the **live URL**, not just locally:

| Step | Result |
| --- | --- |
| Signup, writes to Neon | Pass |
| Session survives a page reload | Pass |
| Three real LLM reviews | Pass (58/100, 4-6s each) |
| Fourth review on the free tier | Blocked, "You have used all 3 reviews this month" |
| Demo checkout to webhook handler to PRO | Pass, plan flipped in the database |
| Pro unlocks unlimited reviews | Pass |
| Cancel subscription | Pass |
| Console errors | None |

---

## Grader quick-start

The live URL needs no setup. To run it locally:

```bash
npm install
cp .env.example .env      # set MOCK_AI=1 to run with no AI key at all
npm run db:dev &          # embedded Postgres, no Docker needed
npm run db:migrate && npm run db:seed
npm run dev
# open http://localhost:3000, log in as demo@hirelens.app / demo1234
```

Billing runs in demo mode with no Stripe keys, so the full upgrade path is exercisable offline.

---

## What I would add with more time

- Google OAuth. The session layer is provider-agnostic, so this is additive.
- A resume-versus-resume diff view, to visualise the score improvement between versions.
- Per-IP rate limiting on `/api/reviews` beyond the plan cap, and a background queue for very long resumes.
- The Playwright flow used to verify this build, promoted into CI as an E2E suite.
