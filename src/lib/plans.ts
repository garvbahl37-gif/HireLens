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
