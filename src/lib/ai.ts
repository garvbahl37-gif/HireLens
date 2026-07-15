import OpenAI from "openai";
import { z } from "zod";
import { grounder, inventedNumbers } from "@/lib/evidence";

/* ------------------------------------------------------------------ */
/* Result shape                                                        */
/* ------------------------------------------------------------------ */

/**
 * Bump whenever buildSystemPrompt() changes in a way that could move scores.
 * Persisted on every Review, because two scores from different prompts are not
 * comparable and a trend line that mixes them is a lie told with a chart.
 */
export const PROMPT_VERSION = "2026-07-15.claims";

const dimension = z.object({
  score: z.number().min(0).max(100),
  note: z.string(),
});

/**
 * A checkable factual assertion the candidate makes about themselves.
 *
 * This is the seam the whole product turns on: these are the sentences a real
 * interviewer will make them prove. `text` MUST be a verbatim span of the
 * resume -- enforced in code (see src/lib/evidence.ts), not requested in the
 * prompt -- because the interviewer quotes it back at the candidate and a
 * fabricated quote would be indefensible.
 */
export const claimSchema = z.object({
  /** Verbatim from the resume. Verified against it before we keep it. */
  text: z.string().min(8).max(300),
  kind: z.enum(["metric", "scope", "ownership", "tech"]),
  /**
   * What a recruiter will ask for that the resume does not supply.
   * The whole value of the claim: not "this is false" but "you have no
   * evidence story for this yet, and you will be asked for one".
   */
  whatsMissing: z.string().max(300),
  /** How exposed this claim is under questioning. Drives which ones get probed. */
  risk: z.enum(["high", "medium", "low"]),
});
export type Claim = z.infer<typeof claimSchema>;

export const CLAIM_KIND_LABELS: Record<Claim["kind"], string> = {
  metric: "Metric",
  scope: "Scope",
  ownership: "Ownership",
  tech: "Technology",
};

export const analysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  verdict: z.string(),
  summary: z.string(),
  dimensions: z.object({
    jobMatch: dimension,
    atsReadiness: dimension,
    impact: dimension,
    clarity: dimension,
    formatting: dimension,
  }),
  strengths: z.array(z.string()).min(1),
  improvements: z
    .array(
      z.object({
        issue: z.string(),
        severity: z.enum(["high", "medium", "low"]),
        fix: z.string(),
      })
    )
    .min(1),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  sectionFeedback: z.array(
    z.object({
      section: z.string(),
      grade: z.enum(["A", "B", "C", "D", "F"]),
      feedback: z.string(),
    })
  ),
  /**
   * The claims a recruiter will make them defend. Optional because rows
   * written before this feature existed do not have it, and because a claim
   * that fails the verbatim check is dropped rather than faked.
   */
  claims: z.array(claimSchema).optional(),
  // Deep analysis — generated for Pro users only.
  rewrites: z
    .array(
      z.object({
        original: z.string(),
        improved: z.string(),
        why: z.string(),
      })
    )
    .optional(),
  atsOptimizations: z.array(z.string()).optional(),
  interviewQuestions: z.array(z.string()).optional(),
});

export type Analysis = z.infer<typeof analysisSchema>;

/**
 * "atsReadiness" is a lie we no longer tell.
 *
 * No applicant tracking system emits a 0-100 readiness percentage, and the
 * founding statistic of that entire genre ("75% of resumes are auto-rejected")
 * traces to a 2012 sales deck from a company that folded in 2013 without ever
 * publishing a method. Greenhouse's own documentation states that matching more
 * keywords does not raise a candidate's match. An LLM guessing a number about a
 * system it has never touched is exactly the artifact this category is being
 * credibly attacked for.
 *
 * So the label now says what the score actually is: one experienced reader's
 * judgment of whether this resume survives a six-second human skim. The
 * database key stays `atsReadiness` -- renaming it would strand every existing
 * row's JSON, and the honesty problem was the claim, not the identifier.
 */
export const DIMENSION_LABELS: Record<keyof Analysis["dimensions"], string> = {
  jobMatch: "Job match",
  atsReadiness: "Recruiter skim",
  impact: "Impact & results",
  clarity: "Clarity",
  formatting: "Structure",
};

/* ------------------------------------------------------------------ */
/* Prompting                                                           */
/* ------------------------------------------------------------------ */

/* ~4 chars per token. Kept tight because input counts against the same
 * per-minute token budget as the response (see BASIC/DEEP_MAX_TOKENS), and a
 * resume past ~8k chars is long past the point the analysis needs. */
const MAX_RESUME_CHARS = 9_000;
const MAX_JD_CHARS = 7_000;

function buildSystemPrompt(deep: boolean) {
  return `You are HireLens, a senior technical recruiter who has screened 50,000+ resumes. You review a candidate's resume against a specific job description and return brutally honest, specific, actionable feedback.

Rules:
- Ground EVERY point in the actual resume text. Quote or reference concrete lines. Never invent experience the candidate doesn't have.
- Calibrate scores honestly: 85+ means "interview-ready for this exact role", 60-84 "solid but fixable gaps", below 60 "significant rework needed". Most real resumes land between 45 and 80.
- matchedKeywords / missingKeywords: the most important hard skills, tools, and qualifications from the JOB DESCRIPTION that do / do not appear in the resume (max 12 each).
- sectionFeedback: one entry per real section of the resume (e.g. Summary, Experience, Projects, Skills, Education). Grade A-F.
- improvements: concrete problems ordered by severity, each with a specific fix.

The "atsReadiness" dimension is NOT a simulation of any applicant tracking system, and you must never claim it is. No ATS emits a readiness percentage, and you have never seen inside one. Score it as what it actually is: whether this resume survives a SIX-SECOND HUMAN SKIM — does the relevant experience jump out, is the hierarchy scannable, is the important thing above the fold. Judge the reader, not the robot.

CLAIMS — the most important thing you produce:
- claims: 4-8 factual assertions the candidate makes about themselves that a real interviewer will make them PROVE. These are the load-bearing sentences of the resume: the numbers, the scale, the ownership, the technologies.
- "text" MUST be copied VERBATIM from the resume, character for character. Do not paraphrase, tidy, re-punctuate or shorten it. It is quoted back to the candidate in an interview, and it is verified against the resume before it is shown — a paraphrase will be silently discarded and your work wasted.
- Prefer the claims that are IMPRESSIVE BUT UNSUPPORTED: a percentage with no baseline, a team size with no role, "led"/"owned"/"architected" with no detail, a technology listed but never evidenced in any bullet.
- "whatsMissing" is the specific thing a recruiter will ask for that the resume does not supply. Be concrete: "No baseline — 40% down from what, measured how?" not "needs more detail". This is never an accusation that the claim is false. It is the evidence they will be asked for and do not yet have on the page.
- "risk": high = they will be asked and currently cannot answer with what is on this page. low = it stands on its own.
${
  deep
    ? `- rewrites: pick the 4-6 weakest bullet points VERBATIM from the resume ("original"), rewrite each into a strong, achievement-oriented bullet tailored to this job ("improved"), and explain why ("why"). NEVER invent a metric the candidate didn't provide — where the resume gives no number, leave a clearly-marked placeholder like [X%] or [N] for the candidate to fill in. Every digit you write in "improved" must already appear in the resume, or be inside a [placeholder]. This is checked in code and violations are discarded.
- atsOptimizations: 5-8 specific MECHANICAL changes that make the file parse cleanly and read fast — section naming, single-column layout, spelled-out acronyms, real text instead of images. Mechanical parse-ability only. Do not promise these will beat a filter or raise a match score; you do not know that and neither does anyone else.
- interviewQuestions: 5 questions an interviewer for THIS role is likely to ask given the resume's gaps.`
    : `- Do NOT include the keys "rewrites", "atsOptimizations" or "interviewQuestions".`
}

Respond with ONLY a valid JSON object (no markdown fences, no commentary) with exactly these keys:
{
  "overallScore": number 0-100,
  "verdict": "one punchy sentence, max 14 words",
  "summary": "3-4 sentence overall assessment",
  "dimensions": {
    "jobMatch":     { "score": number, "note": "1-2 sentences" },
    "atsReadiness": { "score": number, "note": "1-2 sentences" },
    "impact":       { "score": number, "note": "1-2 sentences" },
    "clarity":      { "score": number, "note": "1-2 sentences" },
    "formatting":   { "score": number, "note": "1-2 sentences" }
  },
  "strengths": ["...", "..."],
  "improvements": [{ "issue": "...", "severity": "high|medium|low", "fix": "..." }],
  "matchedKeywords": ["..."],
  "missingKeywords": ["..."],
  "sectionFeedback": [{ "section": "...", "grade": "A|B|C|D|F", "feedback": "..." }],
  "claims": [{ "text": "verbatim from the resume", "kind": "metric|scope|ownership|tech", "whatsMissing": "...", "risk": "high|medium|low" }]${
    deep
      ? `,
  "rewrites": [{ "original": "...", "improved": "...", "why": "..." }],
  "atsOptimizations": ["..."],
  "interviewQuestions": ["..."]`
      : ""
  }
}`;
}

function buildUserPrompt(opts: {
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  company?: string | null;
}) {
  const target = opts.company
    ? `${opts.jobTitle} at ${opts.company}`
    : opts.jobTitle;
  return `TARGET ROLE: ${target}

=== JOB DESCRIPTION ===
${opts.jobDescription.slice(0, MAX_JD_CHARS)}

=== RESUME ===
${opts.resumeText.slice(0, MAX_RESUME_CHARS)}`;
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

export class AnalysisError extends Error {}

/* Output reservations. Providers meter input + reserved output against the
 * same per-minute token budget, so these are sized to the response we
 * actually need, not set to the model maximum. */
const BASIC_MAX_TOKENS = 2400;
const DEEP_MAX_TOKENS = 4200;

/**
 * Groq's free tier meters tokens-per-minute PER MODEL, and the limits differ
 * sharply (gpt-oss-120b 8k · llama-3.3-70b 12k · llama-4-scout 30k). If the
 * chosen model is capped mid-review we retry on the next one up rather than
 * failing the request, so back-to-back reviews keep working on a free key.
 */
const GROQ_FALLBACKS = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

function modelChain(p: Provider): string[] {
  if (p.name !== "groq") return [p.model];
  return [p.model, ...GROQ_FALLBACKS.filter((m) => m !== p.model)];
}

/** 429 (rate limit) or 413 (request exceeds the per-minute token budget). */
function isRateLimit(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 413;
}

/**
 * Provider resolution. Every supported provider speaks the OpenAI wire
 * format, so only the base URL, key and default model differ. First
 * configured key wins, which keeps deploys a one-variable change.
 */
type Provider = {
  name: string;
  apiKey: string;
  baseURL: string;
  model: string;
};

function resolveProvider(): Provider {
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    return {
      name: "groq",
      apiKey: groq,
      baseURL: "https://api.groq.com/openai/v1",
      // 12k TPM on the free tier vs 8k for gpt-oss-120b, and strong at
      // structured JSON — the best quality/headroom trade for this workload.
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    };
  }

  const xai = process.env.XAI_API_KEY;
  if (xai) {
    return {
      name: "xai",
      apiKey: xai,
      baseURL: "https://api.x.ai/v1",
      model: process.env.XAI_MODEL || "grok-4.5",
    };
  }

  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    return {
      name: "openai",
      apiKey: openai,
      baseURL: "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    };
  }

  throw new AnalysisError(
    "No AI provider configured. Set GROQ_API_KEY (or XAI_API_KEY / OPENAI_API_KEY), or MOCK_AI=1 for offline demo output."
  );
}

function getClient(p: Provider) {
  return new OpenAI({ apiKey: p.apiKey, baseURL: p.baseURL });
}

/* ------------------------------------------------------------------ */
/* Speech-to-text (Whisper)                                            */
/* ------------------------------------------------------------------ */

export class TranscriptionError extends Error {}

/** Which provider + model does audio transcription. Only Groq and OpenAI do. */
function transcriptionProvider(): { provider: Provider; model: string } {
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    return {
      provider: {
        name: "groq",
        apiKey: groq,
        baseURL: "https://api.groq.com/openai/v1",
        model: "",
      },
      // Turbo is real-time-fast on Groq and accurate enough for an interview.
      model: process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo",
    };
  }
  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    return {
      provider: {
        name: "openai",
        apiKey: openai,
        baseURL: "https://api.openai.com/v1",
        model: "",
      },
      model: "whisper-1",
    };
  }
  throw new TranscriptionError(
    "No transcription provider configured. Set GROQ_API_KEY or OPENAI_API_KEY."
  );
}

/**
 * Transcribe a recorded answer.
 *
 * This replaces the browser's Web Speech API, which ships audio to a Google
 * service that fails constantly ("network" errors), doesn't exist in Firefox,
 * and can't be relied on at scale. Recording locally and transcribing here is
 * browser-independent and deterministic.
 */
export async function transcribeAudio(
  file: File,
  { language = "en" }: { language?: string } = {}
): Promise<string> {
  if (process.env.MOCK_AI === "1") {
    return "This is a mock transcript. Set a real GROQ_API_KEY to transcribe your actual answer.";
  }

  const { provider, model } = transcriptionProvider();
  const client = getClient(provider);

  try {
    const res = await client.audio.transcriptions.create({
      file,
      model,
      language,
      // Bias the model toward interview vocabulary; also nudges it to emit the
      // fillers we measure rather than silently cleaning them up.
      prompt:
        "A spoken job-interview answer. Transcribe verbatim, including filler words like um, uh, like, you know.",
      response_format: "json",
      temperature: 0,
    });
    return (res.text ?? "").trim();
  } catch (err) {
    if (isRateLimit(err)) {
      throw new TranscriptionError(
        "Transcription is rate-limited right now. Wait a few seconds and try again."
      );
    }
    console.error("[transcribe] failed:", err);
    throw new TranscriptionError(
      "Couldn't transcribe the audio. Try again, or type your answer."
    );
  }
}

export function aiModel() {
  if (process.env.MOCK_AI === "1") return "mock";
  return resolveProvider().model;
}

/**
 * One schema-validated model call, with every provider concern handled in one
 * place: the retry when the model returns invalid JSON, and the fall-through
 * to a higher-token-limit model when the current one is rate-limited.
 *
 * Every feature that talks to a model goes through here, so none of them have
 * to re-implement the fallback chain (and none of them can forget to).
 */
export async function chat<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  temperature?: number;
  /** Returned verbatim when MOCK_AI=1, so the app runs with no API key. */
  mock: () => T;
}): Promise<{ result: T; model: string }> {
  if (process.env.MOCK_AI === "1") {
    return { result: opts.mock(), model: "mock" };
  }

  const provider = resolveProvider();
  const client = getClient(provider);
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  const chain = modelChain(provider);
  let lastError = "";
  let rateLimited = false;

  for (const model of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let completion;
      try {
        completion = await client.chat.completions.create({
          model,
          messages:
            attempt === 0
              ? messages
              : [
                  ...messages,
                  {
                    role: "user",
                    content: `Your previous response was not valid JSON matching the schema (${lastError}). Respond again with ONLY the corrected JSON object.`,
                  },
                ],
          temperature: opts.temperature ?? 0.3,
          max_tokens: opts.maxTokens,
          response_format: { type: "json_object" },
        });
      } catch (err) {
        if (isRateLimit(err)) {
          // Don't burn the user's time retrying a model that is already capped.
          rateLimited = true;
          lastError = "rate limited";
          break; // fall through to the next model in the chain
        }
        throw err;
      }

      const raw = completion.choices[0]?.message?.content ?? "";
      try {
        return { result: opts.schema.parse(extractJson(raw)), model };
      } catch (err) {
        lastError =
          err instanceof Error ? err.message.slice(0, 500) : "parse error";
      }
    }
  }

  if (rateLimited) {
    throw new AnalysisError(
      "The AI service is rate-limited right now. Wait a few seconds and try again."
    );
  }
  throw new AnalysisError(
    "The AI returned an unexpected format. Please try again."
  );
}

/**
 * Run the resume analysis. `deep` unlocks the Pro-only sections —
 * this is enforced here (the deep content is never generated for free
 * users) rather than hidden client-side.
 */
export async function analyzeResume(opts: {
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  company?: string | null;
  deep: boolean;
  /** A re-score pins this to 0 so the number moving reflects the edit, not
   *  sampling noise. Left at 0.3 for a first pass, where variety reads better. */
  temperature?: number;
}): Promise<{ result: Analysis; model: string; promptVersion: string }> {
  const { result, model } = await chat({
    system: buildSystemPrompt(opts.deep),
    user: buildUserPrompt(opts),
    schema: analysisSchema,
    maxTokens: opts.deep ? DEEP_MAX_TOKENS : BASIC_MAX_TOKENS,
    temperature: opts.temperature ?? 0.3,
    mock: () => mockAnalysis(opts.deep, opts.resumeText),
  });

  return {
    result: clampAnalysis(result, opts.deep, opts.resumeText),
    model,
    promptVersion: PROMPT_VERSION,
  };
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(trimmed);
}

/* ------------------------------------------------------------------ */
/* Cover letter (Pro)                                                  */
/* ------------------------------------------------------------------ */

export const coverLetterSchema = z.object({
  /** The opening line — a specific hook, never "I am writing to apply for". */
  hook: z.string().min(1),
  /** 2-3 body paragraphs, each grounded in a real part of the resume. */
  paragraphs: z.array(z.string().min(1)).min(2).max(3),
  /** The close — forward-looking, not obsequious. */
  closing: z.string().min(1),
});
export type CoverLetter = z.infer<typeof coverLetterSchema>;

const COVER_MAX_TOKENS = 1400;

function coverLetterSystem() {
  return `You are a sharp, senior career writer. You write a cover letter for a specific candidate applying to a specific role, using ONLY what their resume actually supports.

Rules:
- GROUND EVERY CLAIM in the resume. Reference real experience, real projects, real skills the candidate lists. Never invent a job, a company, a metric, or a responsibility they do not have.
- NEVER invent a number. If a sentence wants a metric the resume does not give, write a clearly-marked placeholder like [X%] or [N] for the candidate to fill in. A fabricated number is a fireable offense — this is checked in code.
- Tie the candidate's real strengths to THIS job's top 2-3 requirements. Be specific about the match; a generic letter is worthless.
- No clichés. Never write "I am writing to apply", "team player", "hit the ground running", "passionate about", "perfect fit". Open with a specific, concrete hook.
- Confident, warm, human. Short sentences. Around 220-320 words total across the paragraphs.
- Do not restate the whole resume. Pick the 2-3 things that matter most for this role and go deep.

Respond with ONLY a valid JSON object, no markdown fences:
{
  "hook": "the opening line — specific and concrete",
  "paragraphs": ["body paragraph 1", "body paragraph 2", "optional paragraph 3"],
  "closing": "a forward-looking closing line"
}`;
}

/**
 * A cover letter grounded in the resume. Pro-gated (enforced at the route).
 *
 * The number guard from the resume rewrites applies here too: a cover letter is
 * a draft the candidate sends under their own name, so an invented metric is the
 * same landmine. Paragraphs that fabricate a number are flagged and the whole
 * thing is regenerated once with the offense named; if it still invents, the
 * offending digits are replaced with a [ ] placeholder rather than shipped.
 */
export async function generateCoverLetter(opts: {
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  company?: string | null;
}): Promise<{ result: CoverLetter; model: string }> {
  const target = opts.company
    ? `${opts.jobTitle} at ${opts.company}`
    : opts.jobTitle;
  const user = `TARGET ROLE: ${target}

=== JOB DESCRIPTION ===
${opts.jobDescription.slice(0, MAX_JD_CHARS)}

=== RESUME ===
${opts.resumeText.slice(0, MAX_RESUME_CHARS)}`;

  const { result, model } = await chat({
    system: coverLetterSystem(),
    user,
    schema: coverLetterSchema,
    maxTokens: COVER_MAX_TOKENS,
    temperature: 0.4,
    mock: () => mockCoverLetter(opts),
  });

  // Defence in depth: no digit in the letter that the resume never stated,
  // unless it's inside a [placeholder]. Replace any invented number with a
  // blank placeholder rather than let the candidate send a fabrication.
  const guard = (s: string) => {
    const invented = inventedNumbers(s, opts.resumeText);
    if (invented.length === 0) return s;
    console.warn(`[cover-letter] neutralised invented numbers: ${invented.join(", ")}`);
    let out = s;
    for (const n of invented) {
      out = out.replace(new RegExp(`\\b${n}\\b`, "g"), "[ ]");
    }
    return out;
  };

  return {
    result: {
      hook: guard(result.hook),
      paragraphs: result.paragraphs.map(guard),
      closing: guard(result.closing),
    },
    model,
  };
}

function mockCoverLetter(opts: {
  jobTitle: string;
  company?: string | null;
}): CoverLetter {
  const co = opts.company ?? "your team";
  return {
    hook: `The line in your ${opts.jobTitle} posting about owning reliability end-to-end is exactly the work I reached for at my last role.`,
    paragraphs: [
      `I rebuilt a checkout flow in React and cut cart abandonment by [X%], and I owned the six Node.js services behind it at 99.95% uptime. That mix — shipping user-facing product and holding the line on reliability — is what your posting asks for, and it is the part of the job I actually enjoy.`,
      `Where I would ramp fastest at ${co} is the migration work. I have led a React migration without freezing feature delivery, which meant staging it behind flags and measuring the rollout rather than betting the release. I would bring the same "prove it with numbers before you scale it" instinct to your stack.`,
    ],
    closing: `I would welcome the chance to walk through how I would approach your first 90 days. Thank you for the consideration.`,
  };
}

/**
 * Everything the model is TRUSTED to do, re-checked in code.
 *
 * Three jobs, in order of how much damage they prevent:
 *
 *  1. THE PAYWALL. `deep` gating used to live only in the system prompt — a
 *     sentence asking the model not to emit the Pro keys — while every one of
 *     them is `.optional()` in the schema and so validates fine if it does. A
 *     stray token, a retry, or a resume carrying an injected instruction handed
 *     a free user the entire Pro deliverable. The interview side has always
 *     stripped these in code (clampReport); the review side merely asked
 *     nicely. Now it doesn't ask.
 *
 *  2. THE QUOTES. A claim whose `text` is not actually in the resume is
 *     dropped. The interviewer reads these back to the candidate verbatim —
 *     showing someone a sentence they never wrote, in quotation marks, as their
 *     own, is the single worst thing this product could do.
 *
 *  3. THE NUMBERS. A rewrite may not contain a metric the resume never stated.
 *     This is the guardrail every competitor requests in a prompt and none of
 *     them enforces, which is why theirs invent "reduced latency 40%" for a
 *     candidate who never measured it — and why that candidate gets caught.
 *
 * All three FAIL SOFT: bad items are dropped, never thrown. A grounding miss is
 * a quality problem, and turning it into a 502 on the primary revenue path
 * would trade a small quality problem for a total outage.
 */
function clampAnalysis(a: Analysis, deep: boolean, resumeText: string): Analysis {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  a.overallScore = clamp(a.overallScore);
  for (const key of Object.keys(a.dimensions) as Array<
    keyof Analysis["dimensions"]
  >) {
    a.dimensions[key].score = clamp(a.dimensions[key].score);
  }

  /* ---- 2. claims must be real quotes ---- */
  if (a.claims?.length) {
    const isGrounded = grounder(resumeText);
    const kept = a.claims.filter((c) => isGrounded(c.text));
    const dropped = a.claims.length - kept.length;
    if (dropped > 0) {
      // PDF text is a swamp and the model paraphrases under pressure. A high
      // drop rate silently guts the feature, so it has to be visible.
      console.warn(
        `[claims] dropped ${dropped}/${a.claims.length} — not verbatim in the resume`
      );
    }
    a.claims = kept.slice(0, 8);
  }

  /* ---- 1. the paywall, enforced in code ---- */
  if (!deep) {
    a.rewrites = undefined;
    a.atsOptimizations = undefined;
    a.interviewQuestions = undefined;
    return a;
  }

  /* ---- 3. no invented metrics ---- */
  if (a.rewrites?.length) {
    a.rewrites = a.rewrites.filter((r) => {
      const invented = inventedNumbers(r.improved, resumeText);
      if (invented.length > 0) {
        console.warn(
          `[rewrites] dropped — invented ${invented.join(", ")}: "${r.improved.slice(0, 80)}"`
        );
        return false;
      }
      return true;
    });
  }

  return a;
}

/* ------------------------------------------------------------------ */
/* Mock (local dev without an API key — MOCK_AI=1)                     */
/* ------------------------------------------------------------------ */

/**
 * The mock's claims are lifted from the REAL resume, not hardcoded.
 *
 * A fixed set of fake claims would be dropped by the grounding check in
 * clampAnalysis (they aren't in the user's resume), so the offline demo would
 * show an empty claim list — the one feature you most want to see working
 * would be the one feature that looked broken. Picking real spans also means
 * MOCK_AI=1 genuinely exercises the verbatim path instead of tiptoeing around
 * it.
 */
function mockClaims(resumeText: string): Claim[] {
  const kinds = ["metric", "scope", "ownership", "tech"] as const;
  const missing = [
    "No baseline. Down from what, measured how, over what period?",
    "The resume says what happened but not what you owned. Whose decision was it?",
    "\"Led\" is doing a lot of work here. How many people, and what did you actually decide?",
    "Listed as a skill but never evidenced in a single bullet. Where did you use it?",
  ];

  const lines = resumeText
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•▪●·‣\-*]+/, "").trim())
    .filter((l) => l.length >= 30 && l.length <= 220);

  // The interesting bullets are the ones carrying a number or an ownership verb.
  const juicy = lines.filter((l) =>
    /\d|led|owned|built|architected|designed|managed|migrated/i.test(l)
  );
  const picked = (juicy.length >= 3 ? juicy : lines).slice(0, 4);

  return picked.map((text, i) => ({
    text,
    kind: kinds[i % kinds.length],
    whatsMissing: missing[i % missing.length],
    risk: (i === 0 ? "high" : i === 1 ? "high" : "medium") as Claim["risk"],
  }));
}

export function mockAnalysis(deep: boolean, resumeText = ""): Analysis {
  const base: Analysis = {
    claims: mockClaims(resumeText),
    overallScore: 68,
    verdict: "Strong engineering story, but the resume undersells measurable impact.",
    summary:
      "This resume shows solid full-stack experience and relevant technologies for the role, with a clear career progression. However, most bullets describe responsibilities instead of quantified outcomes, and several high-priority keywords from the job description are missing. With targeted rewrites and keyword alignment it could move from 'maybe' to 'interview' quickly.",
    dimensions: {
      jobMatch: {
        score: 71,
        note: "Core stack (React, Node.js, Postgres) aligns well; missing the infrastructure-as-code and observability experience the JD emphasizes.",
      },
      atsReadiness: {
        score: 62,
        note: "Parseable single-column layout, but key JD terms like 'Kubernetes' and 'CI/CD' never appear verbatim.",
      },
      impact: {
        score: 55,
        note: "Only 2 of 11 bullets contain numbers. Most read as task lists rather than achievements.",
      },
      clarity: {
        score: 78,
        note: "Concise writing and consistent tense; a few bullets run past two lines.",
      },
      formatting: {
        score: 74,
        note: "Clean section order; dates are right-aligned inconsistently in the Experience section.",
      },
    },
    strengths: [
      "Relevant modern stack: React, TypeScript, Node.js and Postgres all match the job's core requirements.",
      "Clear ownership signals — 'led migration', 'designed schema' — show progression beyond ticket work.",
      "Side projects demonstrate genuine initiative and full product lifecycle experience.",
    ],
    improvements: [
      {
        issue: "Bullets describe duties, not outcomes ('worked on checkout flow').",
        severity: "high",
        fix: "Rewrite each bullet as achievement + metric + method, e.g. 'Cut checkout abandonment 18% by rebuilding the payment flow in React'.",
      },
      {
        issue: "Missing 6 of the JD's hard requirements as keywords (Kubernetes, Terraform, CI/CD, monitoring).",
        severity: "high",
        fix: "Add an 'Infrastructure' line to Skills and weave the terms you've genuinely used into Experience bullets.",
      },
      {
        issue: "Summary is generic and role-agnostic.",
        severity: "medium",
        fix: "Rewrite the summary to mirror this job title and its top 3 requirements in one sentence.",
      },
    ],
    matchedKeywords: ["React", "TypeScript", "Node.js", "PostgreSQL", "REST APIs", "Git"],
    missingKeywords: ["Kubernetes", "Terraform", "CI/CD", "Datadog", "GraphQL", "AWS"],
    sectionFeedback: [
      {
        section: "Summary",
        grade: "C",
        feedback: "Generic. Could be attached to any engineering resume — tailor it to this role.",
      },
      {
        section: "Experience",
        grade: "B",
        feedback: "Good scope and progression, but quantify outcomes and front-load the strongest bullets.",
      },
      {
        section: "Skills",
        grade: "B",
        feedback: "Well organised. Add the missing JD keywords you can honestly claim.",
      },
      {
        section: "Education",
        grade: "A",
        feedback: "Concise and correctly placed at the bottom for an experienced candidate.",
      },
    ],
  };

  if (deep) {
    base.rewrites = [
      {
        original: "Worked on the checkout flow and payment integrations.",
        improved:
          "Rebuilt the checkout flow in React + Stripe, cutting payment failures 23% and abandonment 18% for 40k monthly orders.",
        why: "Adds ownership, metrics, scale and the exact technologies the JD asks for.",
      },
      {
        original: "Responsible for maintaining backend services.",
        improved:
          "Owned 6 Node.js microservices (99.95% uptime), reducing p95 latency 40% by adding Redis caching and query tuning.",
        why: "Converts a passive duty into a measurable reliability and performance achievement.",
      },
      {
        original: "Helped with code reviews and mentoring.",
        improved:
          "Mentored 3 junior engineers and drove code-review standards that cut regression bugs 30% quarter-over-quarter.",
        why: "Shows leadership with a concrete, believable metric — exactly what senior roles screen for.",
      },
    ];
    base.atsOptimizations = [
      "Add 'Kubernetes' and 'Terraform' to a dedicated Infrastructure skills line (the ATS keyword filter for this JD will look for both verbatim).",
      "Rename 'Work History' to the standard 'Experience' so section detection is reliable.",
      "Replace the two-column skills table with a single-column comma list — column layouts scramble in older ATS parsers.",
      "Spell out 'CI/CD (GitHub Actions)' once; acronym-only mentions can miss keyword matchers.",
      "Export as a text-based PDF (no scanned images); this file parses cleanly but keep it that way.",
    ];
    base.interviewQuestions = [
      "Your resume doesn't mention Kubernetes, which we use heavily — walk me through your container orchestration experience.",
      "Tell me about the checkout rebuild: what did you measure before and after, and how?",
      "How have you handled schema migrations on a live Postgres database with zero downtime?",
      "The JD emphasises observability. How have you debugged a production incident without existing dashboards?",
      "What's the largest system you've owned end-to-end, and what would you redesign today?",
    ];
  }

  return base;
}
