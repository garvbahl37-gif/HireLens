import { z } from "zod";
import { AnalysisError, chat } from "@/lib/ai";
import type { Claim } from "@/lib/ai";
import {
  aggregate,
  deliveryScore,
  fillerLabel,
  paceLabel,
} from "@/lib/speech-metrics";

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export const QUESTION_KINDS = [
  "warmup",
  "behavioral",
  "technical",
  "gap_probe",
  "resume_deep_dive",
  "claim_probe",
  "closing",
] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const KIND_LABELS: Record<QuestionKind, string> = {
  warmup: "Warm-up",
  behavioral: "Behavioral",
  technical: "Technical",
  gap_probe: "Gap probe",
  resume_deep_dive: "Resume deep-dive",
  claim_probe: "Claim check",
  closing: "Closing",
};

/** How many claims we'll force under the microscope. A short screen gets one;
 *  a full loop gets three. Bounded so the interview doesn't become an audit. */
export function claimProbeCap(deep: boolean): number {
  return deep ? 3 : 1;
}

/**
 * Measured delivery for a spoken answer. Absent when the answer was typed.
 *
 * This arrives from the browser and is therefore UNTRUSTED. Every field is
 * bounded here, because:
 *  - the breakdown keys are interpolated into the report prompt, so an
 *    unbounded map is both a prompt-injection surface and a way to blow the
 *    token budget;
 *  - the numbers feed deliveryScore()/aggregate(), where a negative or absurd
 *    value produces a nonsense score or NaN.
 * A short, sane phrase is a filler word; anything else is dropped.
 */
const cnt = z.number().finite().min(0).max(100_000).catch(0);
const nonNeg = z.number().finite().min(0).max(86_400).catch(0);

const breakdown = z
  .record(z.string().max(40), z.number().finite().min(0).max(10_000))
  .catch({})
  .transform((r) =>
    // Cap the number of distinct keys so a crafted payload can't bloat the
    // prompt, and drop empties.
    Object.fromEntries(
      Object.entries(r)
        .filter(([k, v]) => k.trim().length > 0 && v > 0)
        .slice(0, 24)
    )
  );

export const deliverySchema = z.object({
  durationSec: nonNeg,
  wordCount: cnt,
  wpm: z.number().finite().min(0).max(1000).catch(0),
  fillerCount: cnt,
  fillersPerMin: z.number().finite().min(0).max(1000).catch(0),
  hedgeCount: cnt,
  pauseCount: cnt,
  longestPauseSec: nonNeg,
  fillerBreakdown: breakdown,
  hedgeBreakdown: breakdown,
});

/** One entry in the transcript. */
export const turnSchema = z.object({
  role: z.enum(["interviewer", "candidate"]),
  kind: z.enum(QUESTION_KINDS).optional(),
  content: z.string(),
  /** Set on interviewer turns that follow up on a weak answer. */
  isFollowUp: z.boolean().optional(),
  /** Why the interviewer asked this — shown in the report, not during the run. */
  intent: z.string().optional(),
  /**
   * The verbatim resume claim this question attacks. Set in code by the server
   * when it decides to probe a claim — never by the model — so it is the
   * authoritative record of what was put under the microscope, and the report's
   * per-answer verdict is anchored to it rather than to anything the model
   * might reinterpret.
   */
  probesClaim: z.string().optional(),
  /** Candidate turns only, and only when spoken. */
  delivery: deliverySchema.optional(),
  at: z.string(),
});
export type Turn = z.infer<typeof turnSchema>;

/** What the model returns when asked for the next question. */
const nextQuestionSchema = z.object({
  question: z.string().min(1),
  kind: z.enum(QUESTION_KINDS),
  isFollowUp: z.boolean(),
  intent: z.string(),
});
export type NextQuestion = z.infer<typeof nextQuestionSchema>;

/**
 * Whether a probed resume claim survived questioning.
 *
 * The wording is load-bearing and deliberately never says "false". UNPROVEN
 * means "you have no evidence story for this on the page yet", which is a gap to
 * close, not an accusation. This is the most delicate copy in the product and
 * the reason it can make a claim about the user's own resume without ever
 * calling them a liar.
 */
export const CLAIM_VERDICTS = ["GROUNDED", "THIN", "UNPROVEN"] as const;
export type ClaimVerdict = (typeof CLAIM_VERDICTS)[number];

/** Per-answer scoring, produced in the final report pass. */
const answerScoreSchema = z.object({
  question: z.string(),
  score: z.number().min(0).max(100),
  /** STAR = Situation, Task, Action, Result. The interview rubric everyone uses. */
  structure: z.number().min(0).max(100),
  specificity: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  impact: z.number().min(0).max(100),
  whatWorked: z.string(),
  whatDidnt: z.string(),
  /**
   * Set only when this answer was defending a quoted resume claim. `claimText`
   * is overwritten from the transcript in code (never trusted from the model),
   * and `claimVerdict` is stripped where no claim was in flight — so a verdict
   * can never be attached to a question that wasn't a claim probe.
   */
  claimText: z.string().optional(),
  claimVerdict: z.enum(CLAIM_VERDICTS).optional(),
  /** Pro only: what a strong answer to THIS question actually sounds like. */
  modelAnswer: z.string().optional(),
});
export type AnswerScore = z.infer<typeof answerScoreSchema>;

export const reportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  /** The call a real panel would make. */
  verdict: z.enum([
    "Strong hire",
    "Hire",
    "Lean hire",
    "Lean no hire",
    "No hire",
  ]),
  summary: z.string(),
  strengths: z.array(z.string()).min(1),
  redFlags: z.array(z.string()),
  answers: z.array(answerScoreSchema),
  /** The single highest-leverage thing to fix before the real interview. */
  focusNext: z.string(),
  /**
   * How they SPOKE, not what they said. Present only when at least one answer
   * was delivered by voice — a typed answer has no delivery to coach.
   */
  communication: z
    .object({
      summary: z.string(),
      notes: z.array(z.string()),
    })
    .optional(),
  /** Pro only. */
  drillQuestions: z.array(z.string()).optional(),
});
export type InterviewReport = z.infer<typeof reportSchema>;

/* ------------------------------------------------------------------ */
/* The panel (Pro, on-demand)                                          */
/* ------------------------------------------------------------------ */

const HIRE_VERDICTS = [
  "Strong hire",
  "Hire",
  "Lean hire",
  "Lean no hire",
  "No hire",
] as const;

export const PANELIST_ROLES = ["recruiter", "hiring_manager", "bar_raiser"] as const;
export type PanelistRole = (typeof PANELIST_ROLES)[number];

export const PANELIST_META: Record<
  PanelistRole,
  { name: string; lens: string }
> = {
  recruiter: {
    name: "Recruiter",
    lens: "the first screen: communication, motivation, red flags, whether this is worth the hiring manager's time",
  },
  hiring_manager: {
    name: "Hiring Manager",
    lens: "can this specific person do THIS specific job — depth on the role's core requirements, ownership, and delivery",
  },
  bar_raiser: {
    name: "Bar Raiser",
    lens: "does this candidate raise the bar — long-term ceiling, standards, and whether the team is better with them on it; willing to say no",
  },
};

const panelistSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.enum(HIRE_VERDICTS),
  /** 2-3 sentences of reasoning from this role's lens, quoting the candidate. */
  take: z.string(),
  /** The single thing that most worries this panelist. */
  concern: z.string(),
});

export const panelReportSchema = z.object({
  panelists: z.array(
    panelistSchema.extend({ role: z.enum(PANELIST_ROLES) })
  ),
  /** The room's collective call after they argue it out. */
  verdict: z.enum(HIRE_VERDICTS),
  /** How the disagreement resolved — the debate, in a few sentences. */
  synthesis: z.string(),
});
export type PanelReport = z.infer<typeof panelReportSchema>;

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export type InterviewContext = {
  jobTitle: string;
  company?: string | null;
  resumeText: string;
  jobDescription: string;
  totalQuestions: number;
  deep: boolean;
  /** Verbatim resume claims to put under the microscope. Empty for interviews
   *  started from pasted text (no prior analysis to draw claims from). */
  claims?: Claim[];
};

const CLAIM_RISK_RANK: Record<Claim["risk"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Which resume claim, if any, to attack on the NEXT question — decided in code,
 * not by the model.
 *
 * The whole point of grounding the loop in code is that "did we probe this
 * claim" and "which claim" are facts, not model outputs. The model writes the
 * question; the server decides the target. Rules:
 *  - never the opener (empty transcript) or the closer (one question left),
 *  - never two claim probes back to back — they interleave with normal and
 *    follow-up questions so the interview doesn't read as an interrogation,
 *  - highest-risk unprobed claim first,
 *  - stop once the cap for this interview length is reached.
 */
export function selectClaimToProbe(
  ctx: InterviewContext,
  transcript: Turn[]
): Claim | null {
  const claims = ctx.claims ?? [];
  if (claims.length === 0) return null;
  if (transcript.length === 0) return null; // opener is never a probe

  const answered = transcript.filter((t) => t.role === "candidate").length;
  if (ctx.totalQuestions - answered <= 1) return null; // save the closer

  const probed = new Set(
    transcript.filter((t) => t.probesClaim).map((t) => t.probesClaim)
  );
  if (probed.size >= claimProbeCap(ctx.deep)) return null;

  // Don't stack probes: if the last interviewer turn was itself a probe, let a
  // normal or follow-up question breathe first.
  const lastQuestion = [...transcript].reverse().find((t) => t.role === "interviewer");
  if (lastQuestion?.probesClaim) return null;

  const next = claims
    .filter((c) => !probed.has(c.text))
    .sort((a, b) => CLAIM_RISK_RANK[a.risk] - CLAIM_RISK_RANK[b.risk]);

  return next[0] ?? null;
}

// Kept tight: the transcript grows every turn, and input plus the reserved
// output share one per-minute token budget (see src/lib/ai.ts).
const MAX_RESUME = 6_000;
const MAX_JD = 4_000;
const MAX_ANSWER = 4_000;

function contextBlock(ctx: InterviewContext): string {
  const target = ctx.company
    ? `${ctx.jobTitle} at ${ctx.company}`
    : ctx.jobTitle;
  return `ROLE BEING INTERVIEWED FOR: ${target}

=== JOB DESCRIPTION ===
${ctx.jobDescription.slice(0, MAX_JD)}

=== THE CANDIDATE'S RESUME ===
${ctx.resumeText.slice(0, MAX_RESUME)}`;
}

function transcriptBlock(transcript: Turn[], numbered = false): string {
  if (transcript.length === 0) return "(the interview has not started)";
  let q = 0;
  return transcript
    .map((t) => {
      if (t.role === "interviewer") {
        q += 1;
        // Numbering the questions gives the reporter something to count
        // against — it must return exactly one score per numbered question.
        return numbered
          ? `QUESTION ${q}: ${t.content}`
          : `INTERVIEWER: ${t.content}`;
      }
      return numbered
        ? `ANSWER ${q}: ${t.content.slice(0, MAX_ANSWER)}`
        : `CANDIDATE: ${t.content.slice(0, MAX_ANSWER)}`;
    })
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* The interviewer                                                     */
/* ------------------------------------------------------------------ */

function interviewerSystem(ctx: InterviewContext): string {
  return `You are a senior hiring manager conducting a live screening interview for a specific role. You have the candidate's resume and the job description in front of you.

You are not a chatbot and you are not a question generator. You are a person who has read this resume and wants to find out whether this specific candidate can do this specific job.

Rules that make you good at this:
- GROUND EVERY QUESTION IN THE RESUME OR THE JOB DESCRIPTION. Quote the candidate's own words back at them. "You wrote that you 'worked on the checkout flow' — walk me through what you actually did." Never ask a question you could have asked anyone.
- PROBE THE GAPS. The job description asks for things this resume does not evidence. Find them and ask about them directly. That is the whole point of a screen.
- FOLLOW UP WHEN AN ANSWER IS THIN. If the candidate is vague, gives no numbers, describes duties instead of outcomes, or dodges — do not move on. Ask the follow-up a real interviewer would ask. Set isFollowUp to true.
- MOVE ON WHEN AN ANSWER IS STRONG. Do not follow up just to fill turns.
- ONE QUESTION AT A TIME. Never stack two questions in one turn.
- Be warm but not soft. No flattery. No "great answer!". A real interviewer stays neutral.
- Keep questions under 45 words.

The interview is ${ctx.totalQuestions} questions long.
${
  ctx.deep
    ? "This is a full-length interview: use the whole range of question kinds, and push hard on gaps."
    : "This is a short screen: prioritise the highest-signal questions — the gaps that matter most."
}

Question kinds:
- warmup: opens the interview. Ask them to walk through their background AS IT RELATES TO THIS ROLE.
- resume_deep_dive: quote a specific line from their resume and dig into it.
- behavioral: a "tell me about a time" grounded in something they actually claim to have done.
- technical: probe a hard skill the job requires. Ask them to explain HOW, not to define terms.
- gap_probe: a requirement in the job description their resume does not evidence. Ask directly.
- claim_probe: a specific factual claim on their resume that you have been told to press on. Quote it back and demand the evidence behind it. You are told when to do this.
- closing: the final question. Usually "what questions do you have for me" or a forward-looking one.

Respond with ONLY a valid JSON object, no markdown fences, no commentary:
{
  "question": "the question, in your voice, addressed to the candidate",
  "kind": "warmup|behavioral|technical|gap_probe|resume_deep_dive|claim_probe|closing",
  "isFollowUp": true or false,
  "intent": "one sentence, for the report: what you are trying to find out"
}`;
}

/** The instruction block injected when the server has chosen a claim to attack. */
function claimAttackBlock(claim: Claim): string {
  return `=== ATTACK THIS CLAIM ===
The candidate's resume states, verbatim: "${claim.text}"
What a recruiter needs that is not on the page: ${claim.whatsMissing}

Your NEXT question must press on this exact claim. Quote it back to them and ask
for the specific evidence a hiring manager would need to believe it — the
baseline, the number, the mechanism, what they personally did. Do not soften it
and do not ask about anything else this turn. Set "kind" to "claim_probe".`;
}

/**
 * Ask the next question. The model sees the full transcript, so it can follow
 * up on a weak answer rather than marching through a fixed list.
 *
 * When the server has decided this turn should attack a resume claim, that
 * decision (and which claim) is returned as `probedClaim` — authoritative and
 * independent of what the model puts in `kind`, so the transcript and report
 * can be anchored to a fact rather than a hope.
 */
export async function nextQuestion(
  ctx: InterviewContext,
  transcript: Turn[]
): Promise<{ result: NextQuestion; model: string; probedClaim?: Claim }> {
  const answered = transcript.filter((t) => t.role === "candidate").length;
  const remaining = ctx.totalQuestions - answered;

  const probedClaim = selectClaimToProbe(ctx, transcript);

  const turnInstruction =
    transcript.length === 0
      ? "Open the interview. Ask your first question."
      : remaining <= 1
        ? "This is the LAST question. Ask a closing question (kind: closing)."
        : probedClaim
          ? claimAttackBlock(probedClaim)
          : `${answered} of ${ctx.totalQuestions} questions answered. Ask the next one. If the last answer was thin, vague, unquantified, or dodged the question, follow up on it instead of moving on.`;

  const user = `${contextBlock(ctx)}

=== INTERVIEW SO FAR ===
${transcriptBlock(transcript)}

=== YOUR TURN ===
${turnInstruction}`;

  const { result, model } = await chat({
    system: interviewerSystem(ctx),
    user,
    schema: nextQuestionSchema,
    maxTokens: 400,
    temperature: 0.6,
    mock: () => mockQuestion(answered, ctx, probedClaim),
  });

  // The server chose the target, so the server owns the label — a model that
  // returns the wrong kind can't misrepresent whether this was a claim probe.
  if (probedClaim) result.kind = "claim_probe";

  return { result, model, probedClaim: probedClaim ?? undefined };
}

/* ------------------------------------------------------------------ */
/* The report                                                          */
/* ------------------------------------------------------------------ */

/**
 * Delivery is MEASURED in the browser, not inferred by the model. We hand the
 * numbers to the reporter as fact and forbid it from inventing others, so the
 * coaching can say "14 fillers a minute, mostly 'you know'" instead of the
 * useless "try to be more concise" that every other tool produces.
 */
function deliveryBlock(transcript: Turn[]): string | null {
  const spoken = transcript
    .filter((t) => t.role === "candidate" && t.delivery)
    .map((t) => t.delivery!);
  if (spoken.length === 0) return null;

  const agg = aggregate(spoken);
  const top = (r: Record<string, number>) =>
    Object.entries(r)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      // Defence in depth: even though deliverySchema bounds these, strip the
      // key to plain letters/spaces before it enters the prompt, so a filler
      // word can never carry instructions to the model.
      .map(([k, v]) => `"${k.replace(/[^a-z' ]/gi, "").slice(0, 30)}" x${v}`)
      .join(", ") || "none";

  return `=== MEASURED DELIVERY (from the actual audio — these are facts, do not invent others) ===
Total speaking time: ${agg.durationSec}s across ${spoken.length} spoken answer(s)
Pace: ${agg.wpm} words per minute (${paceLabel(agg.wpm)})
Filler words: ${agg.fillerCount} total, ${agg.fillersPerMin} per minute (${fillerLabel(agg.fillersPerMin)})
Most-used fillers: ${top(agg.fillerBreakdown)}
Hedging phrases: ${agg.hedgeCount} (${top(agg.hedgeBreakdown)})
Long hesitations (over 1.5s mid-answer): ${agg.pauseCount}, longest ${agg.longestPauseSec}s
Computed delivery score: ${deliveryScore(agg)}/100`;
}

/**
 * The claim each question attacked, in question order — the same order the
 * report's `answers` array must follow. Aligned to interviewer turns because
 * that is exactly how transcriptBlock numbers questions, so index i here is
 * QUESTION i+1 there. This is the authority the report's per-answer claim
 * verdict is pinned to; the model never gets to decide which answer was
 * defending which claim.
 */
function probedClaimByQuestion(transcript: Turn[]): (string | null)[] {
  return transcript
    .filter((t) => t.role === "interviewer")
    .map((t) => t.probesClaim ?? null);
}

function reporterSystem(
  ctx: InterviewContext,
  questionCount: number,
  hasVoice: boolean,
  hasClaims: boolean
): string {
  return `You are the same hiring manager, writing up your notes immediately after the interview. You are honest, specific, and you do not inflate. Most real candidates land between 45 and 75.

Score every answer the candidate gave, on four dimensions:
- structure: did they tell a coherent story (situation, task, action, result) or ramble?
- specificity: concrete details and real examples, or generic platitudes?
- relevance: did they actually answer the question asked, and does it map to this job?
- impact: did they show outcomes and numbers, or just describe activity?

Then make the call a real panel would make. Be willing to say "No hire" — a mock interview that flatters the candidate is worthless to them.

Rules:
- Ground everything in what they ACTUALLY said. Quote them.
- "whatDidnt" must be actionable. Not "be more specific" but "you said you 'improved performance' — an interviewer needs the number: improved it from what, to what?"
- redFlags: things that would genuinely worry a panel. Empty array if there are none. Do not invent them.
- focusNext: the ONE thing that would most improve their next real interview.
${
  hasVoice
    ? `- communication: coach HOW they spoke, using the measured numbers you were given. QUOTE THE ACTUAL FIGURES — "you averaged 14 fillers a minute, almost all of them 'you know'" lands; "try to use fewer filler words" does not. Cover pace, fillers, hedging and hesitation, but only where the numbers actually warrant it: do not manufacture a problem that the data does not show. If the delivery was genuinely clean, say so plainly.
  - summary: 2-3 sentences on how they came across.
  - notes: 2-4 specific, numeric coaching points.`
    : `- Do NOT include the "communication" key: this interview was typed, so there is no delivery to coach.`
}
- The "answers" array must contain exactly ${questionCount} entries, one per question asked, in order.
${
  hasClaims
    ? `- claimVerdict: SOME questions were flagged as claim checks — you will be told which ones and what evidence was missing. For EACH of those answers, judge whether the candidate supplied the missing evidence when pressed:
  - "GROUNDED": they gave the specific evidence — the baseline, the number, the mechanism, what they personally did. The claim now stands up.
  - "THIN": they said more but still left the key piece out. Partly defended.
  - "UNPROVEN": they could not supply the evidence, changed the subject, or repeated the claim without backing it.
  Set claimVerdict ONLY on the flagged answers; omit it on all others. This is never a judgement that the claim is false — only whether they can back it up out loud. Reflect it in "whatDidnt".`
    : ""
}
${
  ctx.deep
    ? `- modelAnswer: for each answer, write what a strong response to THAT question actually sounds like, using THIS candidate's real background. 3-4 sentences, first person.
- drillQuestions: 5 questions they should rehearse before the real thing.`
    : `- Do NOT include the "modelAnswer" or "drillQuestions" keys.`
}

Respond with ONLY a valid JSON object, no markdown fences:
{
  "overallScore": 0-100,
  "verdict": "Strong hire|Hire|Lean hire|Lean no hire|No hire",
  "summary": "3-4 sentences. What happened in this interview.",
  "strengths": ["..."],
  "redFlags": ["..."],
  "answers": [{
    "question": "the question asked, verbatim",
    "score": 0-100,
    "structure": 0-100,
    "specificity": 0-100,
    "relevance": 0-100,
    "impact": 0-100,
    "whatWorked": "specific, quoting them",
    "whatDidnt": "specific and actionable, quoting them"${
      hasClaims ? ',\n    "claimVerdict": "GROUNDED|THIN|UNPROVEN (only on flagged claim-check answers)"' : ""
    }${
      ctx.deep ? ',\n    "modelAnswer": "first person, 3-4 sentences"' : ""
    }
  }],
  "focusNext": "the single highest-leverage fix"${
    ctx.deep ? ',\n  "drillQuestions": ["..."]' : ""
  }
}`;
}

export async function generateReport(
  ctx: InterviewContext,
  transcript: Turn[]
): Promise<{ result: InterviewReport; model: string }> {
  const questionCount = transcript.filter(
    (t) => t.role === "candidate"
  ).length;

  const delivery = deliveryBlock(transcript);

  // Which question attacked which claim — authoritative, from the transcript.
  const probed = probedClaimByQuestion(transcript);
  const claimsByText = new Map((ctx.claims ?? []).map((c) => [c.text, c]));
  const claimsTested = probed
    .map((text, i) =>
      text
        ? {
            q: i + 1,
            text,
            whatsMissing: claimsByText.get(text)?.whatsMissing ?? "",
          }
        : null
    )
    .filter((x): x is { q: number; text: string; whatsMissing: string } => x !== null);

  const claimsBlock =
    claimsTested.length > 0
      ? `\n=== CLAIMS UNDER TEST (judge claimVerdict for exactly these answers) ===
${claimsTested
  .map(
    (c) =>
      `QUESTION ${c.q} pressed on the resume claim "${c.text}". Evidence a recruiter needed: ${c.whatsMissing || "the specifics behind it"}. Did they supply it when pushed?`
  )
  .join("\n")}\n`
      : "";

  const user = `${contextBlock(ctx)}

=== THE INTERVIEW ===
${transcriptBlock(transcript, true)}
${delivery ? `\n${delivery}\n` : ""}${claimsBlock}
Write up your notes. The "answers" array must contain EXACTLY ${questionCount} objects — one for QUESTION 1 through QUESTION ${questionCount}, in order. Do not merge them. Do not skip any.`;

  // The array length is part of the contract, not a hope. Without this the
  // model happily returns one summary entry for a five-question interview and
  // the report renders a single card; with it, a short array fails validation
  // and chat() retries with the parse error fed back.
  const strictReport = reportSchema.extend({
    answers: z.array(answerScoreSchema).length(questionCount),
  });

  const { result, model } = await chat({
    system: reporterSystem(
      ctx,
      questionCount,
      delivery !== null,
      claimsTested.length > 0
    ),
    user,
    schema: strictReport,
    // Sized for the worst case: 9 answers, each with a model answer.
    maxTokens: ctx.deep ? 5600 : 3400,
    temperature: 0.3,
    mock: () => mockReport(transcript, ctx),
  });

  return { result: clampReport(result, ctx.deep, probed), model };
}

function clampReport(
  r: InterviewReport,
  deep: boolean,
  probed: (string | null)[]
): InterviewReport {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  return {
    ...r,
    overallScore: clamp(r.overallScore),
    // The plan gate is enforced HERE, in code — not by asking the model nicely.
    // A free user who prompt-injects the model into emitting modelAnswer /
    // drillQuestions gets them stripped before anything is persisted, so Pro
    // content can never leak onto a free interview.
    drillQuestions: deep ? r.drillQuestions : undefined,
    answers: r.answers.map((a, i) => {
      // claimText is code-authoritative (from the transcript), so a hallucinated
      // quote can never appear; the verdict is kept only where a claim was
      // genuinely in flight, so it can't be pinned to a non-probe answer.
      const claimText = probed[i] ?? undefined;
      return {
        ...a,
        score: clamp(a.score),
        structure: clamp(a.structure),
        specificity: clamp(a.specificity),
        relevance: clamp(a.relevance),
        impact: clamp(a.impact),
        claimText,
        claimVerdict: claimText ? a.claimVerdict : undefined,
        modelAnswer: deep ? a.modelAnswer : undefined,
      };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Convene the panel                                                   */
/* ------------------------------------------------------------------ */

function panelistSystem(role: PanelistRole): string {
  const m = PANELIST_META[role];
  return `You are the ${m.name} on a hiring panel, reviewing a candidate's screening interview for a specific role. Your lens is ${m.lens}.

You have your OWN priorities and you do not defer to the other panelists. Score the candidate as YOU see them, from your seat. A recruiter and a bar raiser will not agree, and that is the point.

Rules:
- Ground everything in what the candidate ACTUALLY said in the transcript. Quote them.
- Be honest and specific. Most real candidates land between 45 and 75. Be willing to say No hire.
- "take": 2-3 sentences in your voice, from your lens.
- "concern": the single thing that most worries YOU about this candidate.

Respond with ONLY a valid JSON object, no markdown fences:
{
  "score": 0-100,
  "verdict": "Strong hire|Hire|Lean hire|Lean no hire|No hire",
  "take": "2-3 sentences, your lens, quoting them",
  "concern": "the one thing that worries you most"
}`;
}

async function scorePanelist(
  role: PanelistRole,
  ctx: InterviewContext,
  transcript: Turn[]
): Promise<PanelReport["panelists"][number]> {
  const user = `${contextBlock(ctx)}

=== THE INTERVIEW ===
${transcriptBlock(transcript, true)}

Score this candidate from your seat as the ${PANELIST_META[role].name}.`;

  const { result } = await chat({
    system: panelistSystem(role),
    user,
    schema: z.object({
      score: z.number().min(0).max(100),
      verdict: z.enum(HIRE_VERDICTS),
      take: z.string(),
      concern: z.string(),
    }),
    maxTokens: 600,
    temperature: 0.4,
    mock: () => mockPanelist(role),
  });

  return {
    role,
    score: Math.max(0, Math.min(100, Math.round(result.score))),
    verdict: result.verdict,
    take: result.take,
    concern: result.concern,
  };
}

/**
 * Convene a panel over a finished interview.
 *
 * Three role-differentiated interviewers score the transcript IN PARALLEL from
 * their own lens — they are meant to disagree — and then a chair writes up how
 * the room resolved it. Parallel so the whole thing is two latency rounds, not
 * four, which keeps it inside the route's 60s budget; each call goes through the
 * same chat() funnel with its retry and model fallback, so one slow panelist
 * doesn't sink the panel.
 *
 * Pro-gated at the route. Run once and cached on the interview row.
 */
export async function convenePanel(
  ctx: InterviewContext,
  transcript: Turn[]
): Promise<{ result: PanelReport; model: string }> {
  const settled = await Promise.allSettled(
    PANELIST_ROLES.map((role) => scorePanelist(role, ctx, transcript))
  );
  const panelists = settled
    .filter(
      (s): s is PromiseFulfilledResult<PanelReport["panelists"][number]> =>
        s.status === "fulfilled"
    )
    .map((s) => s.value);

  // A panel of one is not a panel. If two or more seats failed, surface it.
  if (panelists.length < 2) {
    throw new AnalysisError(
      "The panel couldn't reach a quorum right now. Try convening it again."
    );
  }

  const roster = panelists
    .map(
      (p) =>
        `${PANELIST_META[p.role].name} — ${p.verdict} (${p.score}). ${p.take} Concern: ${p.concern}`
    )
    .join("\n\n");

  const { result: synth, model } = await chat({
    system: `You are the chair of a hiring panel. Three interviewers have each given their independent read. Your job is to write up the room's collective decision AFTER they argue it out — not to average the scores, but to weigh the arguments. A single serious, well-argued concern can sink a candidate; a bar raiser's enthusiasm can rescue a soft recruiter screen. Be decisive.

Respond with ONLY a valid JSON object, no markdown fences:
{
  "verdict": "Strong hire|Hire|Lean hire|Lean no hire|No hire",
  "synthesis": "3-4 sentences: where the panel agreed, where they split, and how the disagreement resolved into the verdict"
}`,
    user: `ROLE: ${ctx.jobTitle}\n\n=== THE PANEL'S INDEPENDENT READS ===\n${roster}\n\nWrite the room's decision.`,
    schema: z.object({
      verdict: z.enum(HIRE_VERDICTS),
      synthesis: z.string(),
    }),
    maxTokens: 500,
    temperature: 0.3,
    mock: () => mockSynthesis(panelists),
  });

  return {
    result: {
      panelists,
      verdict: synth.verdict,
      synthesis: synth.synthesis,
    },
    model,
  };
}

function mockPanelist(role: PanelistRole): {
  score: number;
  verdict: (typeof HIRE_VERDICTS)[number];
  take: string;
  concern: string;
} {
  const bank: Record<PanelistRole, ReturnType<typeof mockPanelist>> = {
    recruiter: {
      score: 68,
      verdict: "Lean hire",
      take: "Communicates cleanly and answered what was asked — I'd pass them on. But when I pushed on the checkout number they hedged, and recruiters notice a story that softens under one follow-up.",
      concern: "Every strong claim needed a second push before any specifics came out.",
    },
    hiring_manager: {
      score: 54,
      verdict: "Lean no hire",
      take: "I need someone who can own the migration, and I didn't hear ownership — I heard proximity to it. 'We improved performance' isn't 'I decided X and measured Y'.",
      concern: "No evidence they've personally owned a hard call end-to-end for this role.",
    },
    bar_raiser: {
      score: 62,
      verdict: "Lean hire",
      take: "The ceiling is real — they reason well and they're honest when they don't know something, which is rarer than competence. But they undersell themselves, and I can't tell if that's modesty or a thin track record.",
      concern: "Can't distinguish genuine potential from a well-told story on this evidence.",
    },
  };
  return bank[role];
}

function mockSynthesis(panelists: PanelReport["panelists"]): {
  verdict: (typeof HIRE_VERDICTS)[number];
  synthesis: string;
} {
  return {
    verdict: "Lean no hire",
    synthesis: `The room liked the candidate as a person and split on the substance. The recruiter and bar raiser would take the bet on ceiling and honesty; the hiring manager wouldn't, and their objection is the specific one that matters for this role — no demonstrated end-to-end ownership. With ${panelists.length} reads on the table, the unquantified answers tipped it: a strong candidate who can't yet prove it in the room.`,
  };
}

/* ------------------------------------------------------------------ */
/* Offline mode (MOCK_AI=1)                                            */
/* ------------------------------------------------------------------ */

function mockQuestion(
  answered: number,
  ctx: InterviewContext,
  probedClaim?: Claim | null
): NextQuestion {
  // Offline mode still exercises the claim path so the loop is demoable with no
  // API key: when the server picked a claim to attack, the mock attacks it.
  if (probedClaim) {
    return {
      question: `Your resume says "${probedClaim.text}". Walk me through the number behind that — where did it start, where did it land, and how did you measure it?`,
      kind: "claim_probe",
      isFollowUp: false,
      intent: `Test whether the candidate can defend the claim: ${probedClaim.text}`,
    };
  }
  const bank: NextQuestion[] = [
    {
      question: `Walk me through your background — but only the parts that matter for a ${ctx.jobTitle} role. What makes you a fit?`,
      kind: "warmup",
      isFollowUp: false,
      intent: "Check whether they can frame their own experience against this role.",
    },
    {
      question:
        "Your resume says you 'worked on the checkout flow'. What did you actually build, what broke, and what changed as a result?",
      kind: "resume_deep_dive",
      isFollowUp: false,
      intent: "Test whether a vague bullet has real substance behind it.",
    },
    {
      question:
        "The role needs deep TypeScript, but I don't see it anywhere on your resume. Where does that stand?",
      kind: "gap_probe",
      isFollowUp: false,
      intent: "Probe the single biggest gap against the job description.",
    },
    {
      question:
        "You mentioned migrating an app to React. How did you ship that without freezing feature work or breaking production?",
      kind: "technical",
      isFollowUp: false,
      intent: "Find out whether they led the migration or merely attended it.",
    },
    {
      question:
        "Tell me about a time you were wrong about a technical decision. What did it cost, and how did you find out?",
      kind: "behavioral",
      isFollowUp: false,
      intent: "Look for self-awareness and honesty under mild pressure.",
    },
    {
      question: "What would you want to know about this team before you said yes?",
      kind: "closing",
      isFollowUp: false,
      intent: "See whether they are evaluating us back.",
    },
  ];
  const last = bank[bank.length - 1];
  if (answered >= ctx.totalQuestions - 1) return last;
  return bank[Math.min(answered, bank.length - 2)];
}

function mockReport(
  transcript: Turn[],
  ctx: InterviewContext
): InterviewReport {
  const questions = transcript.filter((t) => t.role === "interviewer");
  const spoken = transcript
    .filter((t) => t.role === "candidate" && t.delivery)
    .map((t) => t.delivery!);
  const agg = spoken.length > 0 ? aggregate(spoken) : null;
  const verdicts: ClaimVerdict[] = ["UNPROVEN", "THIN", "GROUNDED"];
  const answers = questions.map((q, i) => ({
    question: q.content,
    score: [58, 64, 41, 72, 55, 68][i % 6],
    structure: [55, 70, 38, 75, 60, 66][i % 6],
    specificity: [50, 60, 35, 70, 52, 64][i % 6],
    relevance: [70, 72, 55, 80, 62, 75][i % 6],
    impact: [42, 55, 30, 65, 48, 60][i % 6],
    whatWorked:
      "You answered the question that was actually asked, and the narrative was easy to follow.",
    whatDidnt:
      "You said you 'improved performance' without a number. An interviewer needs to hear: improved it from what, to what, measured how?",
    // clampReport overwrites claimText and gates the verdict, so this only
    // surfaces where the transcript actually recorded a probe.
    ...(q.probesClaim
      ? { claimVerdict: verdicts[i % verdicts.length] }
      : {}),
    ...(ctx.deep
      ? {
          modelAnswer:
            "I owned the checkout rebuild end to end. Abandonment was sitting at 31%, and our instrumentation showed most drop-off was on the payment step. I rebuilt it in React with an optimistic UI and inline validation, shipped it behind a flag to 10% first, and we took abandonment to 13% over six weeks — about a 12% lift in completed orders.",
        }
      : {}),
  }));

  return {
    overallScore: 59,
    verdict: "Lean no hire",
    summary:
      "A likeable candidate with genuinely relevant experience, but the answers stayed at the level of activity rather than outcome. Almost nothing was quantified, and the TypeScript gap went unaddressed rather than being met head-on.",
    strengths: [
      "Clear communicator — every answer was easy to follow.",
      "Real, hands-on frontend experience that maps to the role.",
      "Honest when they did not know something, rather than bluffing.",
    ],
    redFlags: [
      "Consistently describes duties rather than results. Nothing was measured.",
      "Deflected on TypeScript rather than naming a concrete plan to close the gap.",
    ],
    answers,
    focusNext:
      "Put a number on every story. Before the real interview, take your three strongest projects and write down the before-and-after metric for each. If you genuinely do not have one, say what you would have measured — that alone puts you ahead of most candidates.",
    ...(agg
      ? {
          communication: {
            summary: `You spoke at ${agg.wpm} words a minute with ${agg.fillersPerMin} filler words a minute. The pace is fine; the fillers are what a panel will remember.`,
            notes: [
              `${agg.fillerCount} filler words across ${agg.durationSec} seconds of speech. Silence is better than "um" — a beat of quiet reads as considered, a filler reads as unprepared.`,
              `${agg.hedgeCount} hedging phrases. "I think we improved it" is a weaker claim than "we improved it", and you earned the stronger one.`,
              agg.pauseCount > 0
                ? `${agg.pauseCount} hesitations over 1.5 seconds, the longest ${agg.longestPauseSec}s. Rehearse your three core stories out loud until they start without a run-up.`
                : "No long hesitations — you kept moving, which reads as prepared.",
            ],
          },
        }
      : {}),
    ...(ctx.deep
      ? {
          drillQuestions: [
            "Walk me through the hardest bug you have ever shipped a fix for.",
            "How would you introduce TypeScript to a large untyped React codebase?",
            "Tell me about a time you disagreed with a product decision.",
            "How do you decide what to measure before you start a rebuild?",
            "What is the last thing you learned that changed how you work?",
          ],
        }
      : {}),
  };
}
