# Demo video script

Target length: **3 minutes**. Every second maps to a rubric item.

**Before you hit record**

- Open `https://hire-lens-tawny.vercel.app` in a clean incognito window (no session, no autofill).
- Have a second tab already logged in as `demo@hirelens.app` / `demo1234`.
- Have a resume PDF on the desktop ready to drag in. `fixtures/sample-resume.pdf` in the repo works.
- Have a job description copied to the clipboard so you never type it on camera.
- Close notifications. Zoom the browser to 110% so text is legible after compression.
- The free tier is 3 reviews a month and the demo account has used 2. So on camera you get exactly **one** review, and the **next** one hits the cap. That is deliberate: it lets you demo the core feature and the gate back to back without any setup.

---

## 0:00 - 0:20 | Open on the result, not the pitch

**Screen:** the landing page, top of the hero.

> "This is HireLens. Upload your resume, paste the job you want, and it tells you exactly why you'd get rejected — and how to fix it."

Let the headline animate: the strike lands through "rejected", the underline draws under "and fix it". Do not talk over it, give it a beat.

**Do not linger on the marketing.** The pitch is not what is being graded.

---

## 0:20 - 0:45 | The proof section

**Screen:** scroll to "We took our own advice".

> "Before I show you anything, here's the product's own output. We ran a real resume against a real Senior Frontend Engineer posting — it scored 62. We applied HireLens's own fix list, changed nothing else, and ran it again. 92."

Point at the rewritten bullet:

> "That's the actual bullet it rewrote. 'Worked on the checkout flow' became a quantified achievement. Both of those reviews are sitting in the demo account — I'll show you in a second."

**Why this beat exists:** it converts a claim into evidence in twenty seconds, and it sets up the dashboard reveal.

---

## 0:45 - 1:00 | Pricing and signup

**Screen:** scroll to Pricing. Click **Get started**.

> "Two tiers. Free gives you 3 reviews a month with scoring and keyword gaps. Pro is unlimited and adds line-by-line rewrites, an ATS checklist, and interview questions. The CTA goes into the real signup flow — this isn't a mockup."

Sign up with a throwaway email on camera. Land on the dashboard.

> "Real signup, real session. Reload —" *(reload the page)* "— still logged in. Sessions are a signed JWT in an httpOnly cookie."

---

## 1:00 - 1:50 | The core feature (the most important minute)

**Screen:** switch to the tab logged in as `demo@hirelens.app`, on the dashboard.

> "Here's the demo account with those two reviews. Score trend, 62 up to 92, plus thirty points. Latest review spotlighted with its five scored dimensions and the highest-severity fix pulled out."

Click **New review**. Drag the PDF in. Paste the job description.

> "Real PDF — the text gets extracted server-side. And a real job description, because generic feedback is how resumes stay mediocre. Every review is against a specific role."

Hit **Review my resume**. **Let the analyzing overlay play.** Do not cut it.

> "That's a real LLM call, not a canned response — the steps narrate the actual pipeline."

When the result lands:

> "Overall score. Five dimensions, each scored and explained. The keywords the job description wants that my resume never says. Section-by-section grades. And a fix list ordered by severity, each with a concrete rewrite."

Scroll to the locked Pro panel.

> "And the deep analysis is locked. This is the important part: it isn't hidden in the page — it was never generated. The free-tier prompt tells the model not to produce it, so there's nothing to unhide in DevTools."

---

## 1:50 - 2:35 | Payments, the part most teams skip

**Screen:** click **New review** again and submit.

> "Now watch the gate. That's my fourth review this month."

The request is blocked.

> "Blocked server-side. The API counts my reviews for the month before it does any work and returns a 402. You can't get past that by editing the DOM."

Go to **Billing**. Point at the demo-mode banner and read it honestly:

> "One thing I'll be straight about: no Stripe account is connected to this deployment, so checkout is simulated and nothing is charged. But the upgrade is not faked."

Click **Pro Monthly**, then **Pay**.

> "That simulated payment emits a real `checkout.session.completed` event and pushes it through the exact same handler the live Stripe webhook calls. The event gets an idempotency row, the handler applies the subscription, and *that* is what writes plan equals PRO to the database. Nothing anywhere sets the plan directly — a payment that doesn't reach the handler upgrades nobody."

The page lands on Pro.

> "The Stripe integration is fully implemented — checkout, signature-verified webhook, subscription updates, billing portal. Set `STRIPE_SECRET_KEY` and it switches to live Stripe test mode with no code change."

Run one more review to show the gate is gone.

> "Cap's lifted. And now the deep analysis generates: rewrites, ATS checklist, interview questions."

Back to **Billing**, click **Cancel subscription**, confirm.

> "And cancel. Keeps Pro until the period ends, then drops to free — which goes through the same event handler."

---

## 2:35 - 3:00 | Close on the engineering

**Screen:** the dashboard, then briefly the GitHub repo.

> "It's live on Vercel with a Neon Postgres database — not localhost. Next.js 16, Prisma, JWT sessions, Groq for the analysis with a model fallback chain so the free tier's per-minute token cap doesn't kill a review mid-demo."

> "The whole flow — signup, real review, the free cap, the upgrade through the webhook handler, cancel — is verified end to end against the production URL, not just locally."

End on the landing page or the 62-to-92 proof.

---

## Things worth showing if you have slack

Only if you land under 3:00 with room. In priority order:

1. **Collapse the sidebar.** One click, shows the interface is considered.
2. **The account page.** Rename, change password, delete account with re-authentication.
3. **A returning session.** Close the tab, reopen the URL, still logged in.

## Things to cut ruthlessly

- Reading the feature grid aloud. The grader can read.
- Explaining the tech stack in detail. One sentence, at the end.
- Any apology or hedging about demo mode. State it once, plainly, then show the webhook handler doing the real work. Confidence about a deliberate, documented tradeoff reads as engineering judgement. Waffling about it reads as a gap.

## The one thing that must land

If the grader remembers a single sentence, make it this one:

> "The simulated payment goes through the exact same handler the live Stripe webhook calls — nothing anywhere writes plan equals PRO directly."

That sentence is the difference between "wired a payment form to a success page" and "understood why the webhook is the source of truth."
