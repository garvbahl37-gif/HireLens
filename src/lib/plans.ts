/** Reviews a FREE user gets per calendar month (UTC). Enforced server-side. */
export const FREE_MONTHLY_LIMIT = 3;

export function currentMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export const PRICING = {
  monthly: { amount: 12, per: "month", savings: null as string | null },
  yearly: { amount: 96, per: "year", savings: "2 months free" },
};

export const FREE_FEATURES = [
  `${FREE_MONTHLY_LIMIT} resume reviews per month`,
  "Overall + 5-dimension scoring",
  "Keyword match vs the job description",
  "Section-by-section feedback",
  "Review history",
];

export const PRO_FEATURES = [
  "Unlimited resume reviews",
  "Everything in Free, plus:",
  "Line-by-line rewrite suggestions",
  "ATS optimization checklist",
  "Likely interview questions from your gaps",
  "Priority analysis model",
];

/* ------------------------------------------------------------------ */
/* Mock interviews                                                     */
/* ------------------------------------------------------------------ */

/** Mock interviews a FREE user gets per calendar month (UTC). */
export const FREE_INTERVIEWS_PER_MONTH = 1;

/** A free screen is short and high-signal; Pro is a full-length loop. */
export const INTERVIEW_QUESTIONS_FREE = 5;
export const INTERVIEW_QUESTIONS_PRO = 9;

export const INTERVIEW_FREE_FEATURES = [
  `${FREE_INTERVIEWS_PER_MONTH} mock interview per month`,
  `${INTERVIEW_QUESTIONS_FREE} adaptive questions, grounded in your resume`,
  "Scored report with a hire / no-hire verdict",
  "Per-answer breakdown across four dimensions",
];

export const INTERVIEW_PRO_FEATURES = [
  "Unlimited mock interviews",
  `${INTERVIEW_QUESTIONS_PRO} questions, with harder follow-ups`,
  "A model answer for every question, written from your own background",
  "Drill list: the questions to rehearse before the real thing",
];
