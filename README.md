# HireLens

**Know exactly why your resume gets rejected — and fix it.**

Upload a resume, paste the job description you're targeting, and get a recruiter-grade scored review in seconds: an overall score, five scored dimensions, the ATS keywords you're missing, section-by-section grades, and a prioritized fix list. Pro users additionally get line-by-line rewrites of their weakest bullets, an ATS optimization checklist, and the interview questions their gaps will trigger.

**Live demo:** _[add your Vercel URL here]_
**Demo account:** `demo@hirelens.app` / `demo1234`
**Billing:** runs in demo mode by default — checkout is simulated and nothing is charged, but the upgrade still flows through the real webhook handler. Add Stripe test keys to switch to live Stripe (test card `4242 4242 4242 4242`).

---

## What's actually built

| Requirement | Implementation |
| --- | --- |
| Marketing landing page | Hero, feature grid, how-it-works, 2-tier pricing table with a monthly/yearly toggle, FAQ — every CTA routes into the real signup flow ([src/app/page.tsx](src/app/page.tsx)) |
| Authentication | Email + password, bcrypt hashes, signed JWT session in an httpOnly cookie, 30-day expiry. Sessions survive reloads and restarts ([src/lib/session.ts](src/lib/session.ts), [src/proxy.ts](src/proxy.ts)) |
| Core feature | Real PDF text extraction → prompt against the job description → structured, schema-validated analysis from an LLM (Groq by default) → persisted per user in Postgres ([src/lib/ai.ts](src/lib/ai.ts), [src/app/api/reviews/route.ts](src/app/api/reviews/route.ts)) |
| Payments | Stripe Checkout (subscription mode) → `checkout.session.completed` webhook → `plan` flips to `PRO` in **our** database → Pro features unlock ([src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)). With no Stripe keys, a simulated checkout drives the *same* handler — see [Billing: demo mode vs live Stripe](#billing-demo-mode-vs-live-stripe) |
| Plan gating | Enforced **server-side**: the free tier is hard-capped at 3 reviews/month, and the deep-analysis sections are never even generated for free users ([src/app/api/reviews/route.ts](src/app/api/reviews/route.ts)) |
| Billing page | Current plan, usage meter, renewal date, cancel (at period end) and resume, plus the Stripe billing portal when Stripe is configured ([src/app/dashboard/billing/page.tsx](src/app/dashboard/billing/page.tsx)) |

## Architecture

```
Browser
  │
  ├─ /                        landing (server component, session-aware CTAs)
  ├─ /signup, /login          auth pages
  └─ /dashboard/**            protected
        ├─ /new               upload + JD form
        ├─ /reviews/[id]      results
        └─ /billing           plan + cancel
  │
src/proxy.ts  ── verifies the session JWT (edge, DB-free) on /dashboard/**
  │
API routes (node runtime)
  ├─ POST /api/auth/{signup,login,logout}    bcrypt + jose → httpOnly cookie
  ├─ POST /api/reviews                       ① plan gate  ② PDF extract (unpdf)
  │                                          ③ LLM analysis   ④ persist
  ├─ POST /api/stripe/checkout               creates the Checkout Session
  ├─ POST /api/stripe/webhook  ◄──── Stripe  signature verify → idempotency → DB
  ├─ POST /api/stripe/subscription           cancel / resume
  └─ POST /api/stripe/portal                 billing portal session
  │
Prisma 7 (driver adapter) → Postgres:  User · Review · StripeEvent
```

**The payment loop is the real one.** The success redirect is cosmetic; nothing upgrades an account except the webhook writing `plan = PRO` to our database. Every Stripe event id is inserted into a `StripeEvent` table first, so a redelivered event can't be applied twice.

## Local setup

Requires Node 20+. No Docker and no system Postgres needed — a real Postgres server ships with the dev dependencies.

```bash
npm install
cp .env.example .env          # then fill in the values below
npm run db:dev                # boots Postgres on :55432 (leave running)
npm run db:migrate            # applies migrations
npm run db:seed               # creates demo@hirelens.app / demo1234
npm run dev                   # http://localhost:3000
```

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `postgresql://postgres:postgres@localhost:55432/hirelens` for local dev |
| `AUTH_SECRET` | yes | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | yes | `http://localhost:3000`, or your deployed origin |
| `GROQ_API_KEY` | for real AI | from [console.groq.com](https://console.groq.com) (free tier) |
| `GROQ_MODEL` | no | defaults to `openai/gpt-oss-120b` |
| `MOCK_AI` | no | set to `1` to run without an API key (returns a realistic canned analysis) |
| `STRIPE_SECRET_KEY` | no | test-mode `sk_test_…`. **Leave empty to run billing in demo mode** |
| `STRIPE_WEBHOOK_SECRET` | with Stripe | from `stripe listen`, or the dashboard endpoint |
| `STRIPE_PRICE_PRO_MONTHLY` / `_YEARLY` | with Stripe | printed by `npm run stripe:setup` |

The AI layer is provider-agnostic — every supported provider speaks the OpenAI
wire format, so only a base URL and model differ. The first key present wins:
`GROQ_API_KEY`, then `XAI_API_KEY`, then `OPENAI_API_KEY`
([src/lib/ai.ts](src/lib/ai.ts)).

### Billing: demo mode vs live Stripe

Stripe requires an account, and a deployed demo with no keys would have a dead
Upgrade button. So when `STRIPE_SECRET_KEY` is absent, billing falls back to a
clearly labelled **simulated checkout** — no card is collected and nothing is
charged.

The upgrade is not faked, though. The simulated checkout mints a Stripe-shaped
`checkout.session.completed` event and pushes it through
`processStripeEvent()` — the exact handler the live webhook calls
([src/lib/stripe-events.ts](src/lib/stripe-events.ts)) — so the real path runs
end to end:

```
simulated payment → checkout.session.completed → idempotency row
                  → applySubscription() → users.plan = PRO → gating unlocks
```

Setting `STRIPE_SECRET_KEY` switches everything back to live Stripe test mode
with no code change ([src/lib/demo-billing.ts](src/lib/demo-billing.ts)).

### Stripe (test mode)

```bash
npm run stripe:setup                                            # creates the Pro product + prices
stripe listen --forward-to localhost:3000/api/stripe/webhook    # prints STRIPE_WEBHOOK_SECRET
```

The webhook path can also be exercised without the Stripe CLI. This signs a real event with your `STRIPE_WEBHOOK_SECRET` and posts it at the endpoint, so signature verification, idempotency, and the database update all run for real:

```bash
npm run stripe:simulate -- demo@hirelens.app upgrade
npm run stripe:simulate -- demo@hirelens.app cancel_at_period_end
npm run stripe:simulate -- demo@hirelens.app downgrade
```

## Deployment (Vercel)

1. Create a Postgres database (Neon, Supabase, or Vercel Postgres) and copy its connection string.
2. Import the repo into Vercel. The build command is already wired: `vercel-build` runs `prisma generate && prisma migrate deploy && next build`, so the schema is applied on every deploy.
3. Set the environment variables from the table above (`NEXT_PUBLIC_APP_URL` = your `https://….vercel.app` origin).
4. In the Stripe dashboard → Developers → Webhooks, add an endpoint at `https://<your-app>/api/stripe/webhook` subscribed to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.paid`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.
5. Seed the demo account against the production database: `DATABASE_URL="<prod url>" npm run db:seed`.

## Notable implementation details

- **The free-tier cap is not a UI trick.** `POST /api/reviews` counts the user's reviews for the current UTC month before doing any work and returns `402` with `code: LIMIT_REACHED` when the cap is hit. The client cannot bypass it.
- **Pro content is generated, not revealed.** The `deep` flag changes the system prompt: for free users the model is instructed not to produce the rewrite / ATS / interview sections at all, so there is nothing in the payload to unhide in DevTools.
- **Model output is schema-validated.** The analysis is parsed with Zod and, on a malformed response, retried once with the parse error fed back to the model before failing cleanly with a 502.
- **Ownership is enforced in the query.** Review pages fetch with `where: { id, userId }`, so another user's review id 404s rather than leaking.
- **Timing-safe login.** A dummy bcrypt compare runs when the email doesn't exist, so accounts can't be enumerated by response time.
- **No auth soft-locks.** A session whose signed cookie outlives its user row (e.g. the dev DB was reseeded) is detected and cleared via the logout route rather than bouncing forever between `/dashboard` and `/login`.
- **Open-redirect safe.** The post-login `?next=` param is validated ([src/lib/safe-redirect.ts](src/lib/safe-redirect.ts)) against protocol-relative and backslash-smuggling tricks, unit-tested against the known bypass vectors.
- **Webhook reliability.** The idempotency insert distinguishes a genuine duplicate (Prisma `P2002`) from an infrastructure error, so a transient DB blip returns 500 and Stripe retries instead of silently dropping a paid upgrade.

This hardening came out of an adversarial multi-agent review of the codebase; the accessibility pass (keyboard-operable upload zone, `role="alert"` on form errors, WCAG-contrast text) landed in the same round.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run db:dev` | Boots the embedded Postgres for local development |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Demo account with two reviews of history |
| `npm run stripe:setup` | Creates the Pro product + prices in your test-mode account |
| `npm run stripe:simulate` | Signs and posts a subscription webhook at the local endpoint |
| `npm run typecheck` / `npm run lint` | TypeScript + ESLint |

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Motion (framer-motion) for the animated landing and dashboard · Prisma 7 + Postgres · Stripe · Groq / xAI / OpenAI via the OpenAI-compatible SDK · unpdf · jose + bcryptjs · Vercel.
