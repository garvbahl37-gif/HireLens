# HireLens

**Know exactly why your resume gets rejected — and fix it.**

Upload a resume, paste the job description you are targeting, and get a recruiter-grade scored review in seconds: an overall score, five scored dimensions, the ATS keywords you are missing, section-by-section grades, and a prioritized fix list. Pro users additionally get line-by-line rewrites of their weakest bullets, an ATS optimization checklist, and the interview questions their gaps will trigger.

| | |
| --- | --- |
| **Live demo** | https://hire-lens-tawny.vercel.app |
| **Demo account** | `demo@hirelens.app` / `demo1234` |
| **Repository** | https://github.com/garvbahl37-gif/HireLens |

The demo account is preloaded with two real reviews of the *same* resume against the *same* job posting: it scored **62/100**, then **92/100** after its own feedback was applied. That is not seed data invented to look good — it is the product's actual output, and the landing page's "Proof" section is built from it.

Billing runs in **demo mode** by default: no Stripe account is connected to this deployment, so checkout is simulated and nothing is ever charged. The upgrade still runs through the real webhook handler. See [Billing: demo mode vs live Stripe](#billing-demo-mode-vs-live-stripe).

---

## Table of contents

- [What is actually built](#what-is-actually-built)
- [Architecture](#architecture)
- [Data model](#data-model)
- [The core feature, end to end](#the-core-feature-end-to-end)
- [Plan gating](#plan-gating)
- [Billing: demo mode vs live Stripe](#billing-demo-mode-vs-live-stripe)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Deployment (Vercel)](#deployment-vercel)
- [Notable implementation details](#notable-implementation-details)
- [Verification](#verification)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Tech](#tech)

---

## What is actually built

Every non-negotiable in the brief, verified running against the live URL rather than only on localhost.

| Requirement | Implementation |
| --- | --- |
| Marketing landing page | Hero, proof section, bento feature grid, how-it-works, 2-tier pricing table with a monthly/yearly toggle, FAQ accordion. Every CTA routes into the real signup flow. ([src/app/page.tsx](src/app/page.tsx)) |
| Authentication | Email + password, bcrypt hashes, signed JWT session in an httpOnly cookie, 30-day expiry. Sessions survive reloads and server restarts. ([src/lib/session.ts](src/lib/session.ts), [src/proxy.ts](src/proxy.ts)) |
| The actual product | Real PDF text extraction, prompt against the job description, structured schema-validated analysis from an LLM, persisted per user in Postgres. ([src/lib/ai.ts](src/lib/ai.ts), [src/app/api/reviews/route.ts](src/app/api/reviews/route.ts)) |
| Per-user persistence | Postgres via Prisma. Reviews belong to a user, are listed in a dashboard with a score trend, and survive logout. |
| Subscriptions and payments | Checkout, then a `checkout.session.completed` event, then `plan` flips to `PRO` in **our** database, then Pro features unlock. ([src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts), [src/lib/stripe-events.ts](src/lib/stripe-events.ts)) |
| Plan tier gates functionality | Enforced **server-side**: the free tier is hard-capped at 3 reviews per month, and the deep-analysis sections are never generated for free users. |
| Billing / account page | Current plan, usage meter, renewal date, cancel at period end, resume. Plus a separate account page: rename, change password, delete account. ([src/app/dashboard/billing/page.tsx](src/app/dashboard/billing/page.tsx), [src/app/dashboard/account/page.tsx](src/app/dashboard/account/page.tsx)) |
| Deployment | Public URL on Vercel with a Neon Postgres database. Not localhost. |

---

## Architecture

```
Browser
  |
  |-- /                        landing (server component, session-aware CTAs)
  |-- /signup, /login          auth pages
  \-- /dashboard/**            protected
        |-- /                  overview: spotlight, KPIs, score trend, history
        |-- /new               upload + job description form
        |-- /reviews/[id]      results
        |-- /account           profile, password, delete
        \-- /billing           plan, usage, cancel/resume
  |
src/proxy.ts  -- verifies the session JWT (edge, DB-free) on /dashboard/**
  |
API routes (node runtime)
  |-- POST /api/auth/{signup,login,logout}    bcrypt + jose -> httpOnly cookie
  |-- PATCH/DELETE /api/account               rename / delete (re-authenticates)
  |-- POST /api/account/password              change password (re-authenticates)
  |-- POST /api/reviews                       1. plan gate
  |                                           2. PDF extract (unpdf)
  |                                           3. LLM analysis (schema-validated)
  |                                           4. persist
  |-- POST /api/stripe/checkout               creates the Checkout Session
  |-- POST /api/stripe/webhook  <---- Stripe  signature verify -> idempotency -> DB
  |-- POST /api/stripe/subscription           cancel / resume
  |-- POST /api/stripe/portal                 billing portal session
  \-- POST /api/billing/demo/complete         demo mode only; see below
  |
Prisma 7 (driver adapter) -> Postgres:  User . Review . StripeEvent
```

**The payment loop is the real one.** The success redirect is cosmetic. Nothing upgrades an account except the event handler writing `plan = PRO` to our database. Every Stripe event id is inserted into a `StripeEvent` table first, so a redelivered event cannot be applied twice.

---

## Data model

```prisma
model User {
  id                     String    @id @default(cuid())
  email                  String    @unique
  passwordHash           String
  name                   String
  plan                   Plan      @default(FREE)   // FREE | PRO
  stripeCustomerId       String?   @unique
  stripeSubscriptionId   String?
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?
  cancelAtPeriodEnd      Boolean   @default(false)
  reviews                Review[]
  createdAt              DateTime  @default(now())
}

model Review {
  id             String   @id @default(cuid())
  userId         String                            // cascades on user delete
  jobTitle       String
  company        String?
  resumeFilename String?
  resumeText     String
  jobDescription String
  overallScore   Int
  verdict        String
  result         Json                              // the full validated analysis
  deep           Boolean  @default(false)          // was this a Pro analysis
  model          String                            // which model produced it
  createdAt      DateTime @default(now())

  @@index([userId, createdAt(sort: Desc)])
}

// Processed Stripe event ids, for idempotency.
model StripeEvent {
  id        String   @id
  type      String
  createdAt DateTime @default(now())
}
```

---

## The core feature, end to end

1. The user uploads a PDF (or pastes text) and pastes a job description.
2. `POST /api/reviews` counts the user's reviews for the current UTC month and rejects the request with `402 LIMIT_REACHED` if a free user is over the cap. This happens **before** any work is done.
3. Text is extracted from the PDF with `unpdf`. An empty extraction (a scanned or image-only PDF) is rejected with a clear message rather than sent to the model as an empty string.
4. The resume and job description are sent to the LLM with a system prompt that forces a strict JSON shape. Pro users get extra sections requested; free users' prompts instruct the model not to produce them at all.
5. The response is parsed with Zod. On a malformed response it retries once, feeding the parse error back to the model, before failing cleanly with a 502.
6. Scores are clamped to 0-100 and the whole analysis is persisted as JSON against the user.

The analysis returns: an overall score and one-line verdict, a summary, five scored dimensions (job match, ATS readiness, impact, clarity, structure), strengths, a severity-ordered list of improvements each with a concrete fix, matched and missing keywords, and A-F section grades. Pro adds verbatim bullet rewrites, an ATS optimization checklist, and likely interview questions.

The rewrite prompt explicitly forbids inventing metrics the candidate never stated. Where the resume gives no number, the model must leave a marked placeholder such as `[X%]` rather than fabricate one.

---

## Plan gating

The gate is not a UI trick. Two independent mechanisms:

- **Quota.** `POST /api/reviews` counts reviews in the current UTC month and returns `402` with `code: LIMIT_REACHED` when a free user hits 3. The client cannot bypass it by editing the DOM.
- **Content.** Pro sections are *generated*, not *revealed*. The `deep` flag changes the system prompt, so for a free user the rewrite, ATS-checklist and interview-question fields are never produced. There is nothing hidden in the payload to unhide in DevTools.

---

## Billing: demo mode vs live Stripe

Stripe requires an account, and a deployed demo with no keys would have a dead Upgrade button. So when `STRIPE_SECRET_KEY` is absent, billing falls back to a clearly labelled **simulated checkout**. No card is collected. Nothing is charged. The page says so plainly.

The upgrade is not faked, though. The simulated checkout mints a Stripe-shaped `checkout.session.completed` event and pushes it through `processStripeEvent()` — the exact same handler the live webhook calls ([src/lib/stripe-events.ts](src/lib/stripe-events.ts)) — so the real path runs end to end:

```
simulated payment -> checkout.session.completed -> idempotency row
                  -> applySubscription() -> users.plan = PRO -> gating unlocks
```

Cancel and resume emit `customer.subscription.updated` through the same handler. Nothing anywhere writes `plan = PRO` directly.

**Setting `STRIPE_SECRET_KEY` switches everything back to live Stripe test mode with no code change** ([src/lib/demo-billing.ts](src/lib/demo-billing.ts)). The Stripe integration is fully implemented and was developed against it: `/api/stripe/checkout`, `/api/stripe/webhook` (with signature verification), `/api/stripe/subscription` and `/api/stripe/portal` all talk to Stripe for real when configured.

---

## Local setup

Requires Node 20 or newer. No Docker and no system Postgres needed — a real Postgres server ships with the dev dependencies.

```bash
git clone https://github.com/garvbahl37-gif/HireLens.git
cd HireLens
npm install

cp .env.example .env          # then fill in the values below

npm run db:dev                # boots Postgres on :55432 (leave this running)
npm run db:migrate            # applies migrations
npm run db:seed               # creates demo@hirelens.app / demo1234
npm run dev                   # http://localhost:3000
```

To run with no API key at all, set `MOCK_AI=1` in `.env`. The app returns a realistic canned analysis so every screen and the whole billing flow can be exercised offline. Never enable it in production.

---

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `postgresql://postgres:postgres@localhost:55432/hirelens` for local dev. On Vercel the Neon integration injects this. |
| `DIRECT_URL` | no | A direct (non-pooled) URL used only by `prisma migrate deploy`. Auto-detected from Vercel's `DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING` if unset. |
| `AUTH_SECRET` | yes | Signs session JWTs. Generate with `openssl rand -base64 32`. |
| `GROQ_API_KEY` | for real AI | Free tier at [console.groq.com](https://console.groq.com). |
| `GROQ_MODEL` | no | Defaults to `llama-3.3-70b-versatile`. |
| `MOCK_AI` | no | Set to `1` to run with no API key (returns a realistic canned analysis). |
| `NEXT_PUBLIC_APP_URL` | no | Falls back to the request origin. Set it to pin Stripe redirect URLs. |
| `STRIPE_SECRET_KEY` | no | Test-mode `sk_test_...`. **Leave empty to run billing in demo mode.** |
| `STRIPE_WEBHOOK_SECRET` | with Stripe | From `stripe listen`, or the dashboard endpoint. |
| `STRIPE_PRICE_PRO_MONTHLY` / `_YEARLY` | with Stripe | Printed by `npm run stripe:setup`. |
| `DEMO_BILLING` | no | Set to `1` to force demo billing even when Stripe keys are present. |

### AI provider

The AI layer is provider-agnostic. Every supported provider speaks the OpenAI wire format, so only a base URL and a model name differ. The first key present wins: `GROQ_API_KEY`, then `XAI_API_KEY`, then `OPENAI_API_KEY` ([src/lib/ai.ts](src/lib/ai.ts)).

Groq is the default because its free tier is generous enough for a public demo. Two things the implementation has to respect there:

- **Providers meter input *and* the reserved output against one per-minute token budget.** Requesting a large `max_tokens` therefore consumes quota even if the response is short, so the output reservation is sized to the response actually needed (2400 basic, 4200 deep) rather than maxed out.
- **The per-minute limit differs sharply per model** (`gpt-oss-120b` 8k, `llama-3.3-70b` 12k, `llama-4-scout` 30k). On a 429 or 413 the request falls through to the next model in a higher-limit chain rather than failing, so back-to-back reviews keep working on a free key.

### Stripe (only if you want live Stripe instead of demo mode)

```bash
npm run stripe:setup                                            # creates the Pro product + prices
stripe listen --forward-to localhost:3000/api/stripe/webhook    # prints STRIPE_WEBHOOK_SECRET
```

The webhook path can also be exercised without the Stripe CLI. This signs a real event with your `STRIPE_WEBHOOK_SECRET` and posts it at the endpoint, so signature verification, idempotency and the database update all run for real:

```bash
npm run stripe:simulate -- demo@hirelens.app upgrade
npm run stripe:simulate -- demo@hirelens.app cancel_at_period_end
npm run stripe:simulate -- demo@hirelens.app downgrade
```

---

## Deployment (Vercel)

This deploys entirely within Vercel. No separate database provider signup is needed.

1. **Import the repository** into Vercel. Set **Framework Preset** to **Next.js**. If it is left on "Other", Vercel runs the build but never wires up the Next.js server, and every route returns 404.
2. **Create the database.** In the project, go to **Storage** then **Create Database** then **Neon (Postgres)**, and connect it to all three environments. Vercel injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically. `prisma.config.ts` picks up the unpooled URL by name, because `prisma migrate deploy` cannot run through a PgBouncer pooler (it needs advisory locks the pooler does not support).
3. **Add two environment variables**: `AUTH_SECRET` and `GROQ_API_KEY`.
4. **Redeploy.** Environment variables are only read at build time, so a build that ran before the database was attached will never see it.
5. **Seed the demo account** against production: `DATABASE_URL="<unpooled url>" npm run db:seed`.

`vercel-build` runs `prisma generate && prisma migrate deploy && next build`, so the schema is applied on every deploy.

Deliberately leave every `STRIPE_*` variable unset: an empty `STRIPE_SECRET_KEY` is exactly what activates demo billing. Leave `MOCK_AI` unset too, or the deployed demo will return canned analysis instead of calling the model.

---

## Notable implementation details

**Security**

- **Ownership is enforced in the query.** Review pages fetch with `where: { id, userId }`, so another user's review id 404s rather than leaking.
- **Timing-safe login.** A dummy bcrypt compare runs when the email does not exist, so accounts cannot be enumerated by response time.
- **Destructive actions re-authenticate.** Changing a password and deleting an account both require the current password. A stolen session alone is not enough to lock the real owner out or destroy their data.
- **Open-redirect safe.** The post-login `?next=` parameter is validated ([src/lib/safe-redirect.ts](src/lib/safe-redirect.ts)) against protocol-relative and backslash-smuggling tricks.
- **No auth soft-locks.** A session whose signed cookie outlives its user row (for example, the database was reseeded) is detected and cleared via the logout route, rather than bouncing forever between `/dashboard` and `/login`.

**Correctness**

- **Model output is schema-validated.** The analysis is parsed with Zod and, on a malformed response, retried once with the parse error fed back to the model before failing cleanly.
- **Webhook reliability.** The idempotency insert distinguishes a genuine duplicate (Prisma `P2002`) from an infrastructure error, so a transient database blip returns 500 and Stripe retries, instead of silently swallowing a paid upgrade.
- **Out-of-order webhooks.** A replayed `customer.subscription.deleted` for an *old* subscription will not wipe a newer active one; the handler checks the subscription id it is tracking first.

**Interface**

- The sidebar's collapse preference is a **cookie, not localStorage**, so the server renders the rail at the correct width on first paint. With localStorage it would always render expanded and snap shut after hydration, flashing on every page load.
- The collapsed and expanded rails are cross-faded as two fixed-width layers, so neither reflows mid-animation. The hidden layer is `inert`, not merely `pointer-events: none`, because both layers stay mounted and its links would otherwise remain keyboard-focusable.
- The color palette was run through a colorblindness validator rather than eyeballed. The ember accent sits in the same warm family as the warn and bad score colors, so the set was checked for CVD separation (worst adjacent pair is dE 30 under protanopia against a target of 12) and 3:1 contrast against the card surface. Score colors never carry meaning alone: every bar, ring and grade ships with its number or label.
- Primary buttons use deep-espresso text rather than white, because white on the ember accent measures 3.9:1 and fails WCAG AA.
- Accessibility: keyboard-operable upload zone, `role="alert"` on form errors, `prefers-reduced-motion` respected throughout.

---

## Verification

The full journey was driven end to end against the **live production URL** with Playwright, not just locally:

| Step | Result |
| --- | --- |
| Signup, writes to Neon | Pass |
| Session survives a page reload | Pass |
| Three real LLM reviews | Pass (scored 58/100, 4-6s each) |
| Fourth review on the free tier | Blocked with "You have used all 3 reviews this month" |
| Demo checkout to webhook handler to PRO | Pass (plan flipped in the database) |
| Pro unlocks unlimited reviews | Pass |
| Cancel subscription | Pass |
| Console errors | None |

---

## Project structure

```
prisma/
  schema.prisma            User . Review . StripeEvent
  migrations/
scripts/
  dev-db.ts                embedded Postgres for local dev
  seed.ts                  demo account + review history
  stripe-setup.ts          creates the Pro product and prices
  simulate-webhook.ts      signs and posts a real webhook locally
src/
  proxy.ts                 edge session check on /dashboard/**
  app/
    page.tsx               landing
    (auth)/                login, signup
    dashboard/             overview, new, reviews/[id], account, billing
    api/                   auth, account, reviews, stripe, billing
  components/
    landing/               hero, proof, features, faq, navbar, marquee
    dashboard/             sidebar, spotlight, score trend, keyword gaps
    ...                    review form, results, analyzing overlay, billing actions
  lib/
    ai.ts                  provider resolution, prompt, schema, retry, fallback
    auth.ts / session.ts   JWT sessions in httpOnly cookies
    stripe-events.ts       the single place an event becomes application state
    demo-billing.ts        simulated checkout that drives the real handler
    plans.ts / usage.ts    quota and pricing
    db.ts                  Prisma client
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run db:dev` | Boots the embedded Postgres for local development |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Demo account with two reviews of history |
| `npm run stripe:setup` | Creates the Pro product and prices in your test-mode account |
| `npm run stripe:simulate` | Signs and posts a subscription webhook at the local endpoint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

---

## Tech

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Motion (framer-motion) for the animated landing and dashboard, Prisma 7 with a driver adapter, Postgres (Neon), Stripe, Groq / xAI / OpenAI through the OpenAI-compatible SDK, unpdf for PDF extraction, jose and bcryptjs for auth, deployed on Vercel.
