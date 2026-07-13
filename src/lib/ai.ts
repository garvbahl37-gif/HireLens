import OpenAI from "openai";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Result shape                                                        */
/* ------------------------------------------------------------------ */

const dimension = z.object({
  score: z.number().min(0).max(100),
  note: z.string(),
});

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

export const DIMENSION_LABELS: Record<keyof Analysis["dimensions"], string> = {
  jobMatch: "Job match",
  atsReadiness: "ATS readiness",
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
  return `You are HireLens, a senior technical recruiter and ATS (applicant tracking system) expert who has screened 50,000+ resumes. You review a candidate's resume against a specific job description and return brutally honest, specific, actionable feedback.

Rules:
- Ground EVERY point in the actual resume text. Quote or reference concrete lines. Never invent experience the candidate doesn't have.
- Calibrate scores honestly: 85+ means "interview-ready for this exact role", 60-84 "solid but fixable gaps", below 60 "significant rework needed". Most real resumes land between 45 and 80.
- matchedKeywords / missingKeywords: the most important hard skills, tools, and qualifications from the JOB DESCRIPTION that do / do not appear in the resume (max 12 each).
- sectionFeedback: one entry per real section of the resume (e.g. Summary, Experience, Projects, Skills, Education). Grade A-F.
- improvements: concrete problems ordered by severity, each with a specific fix.
${
  deep
    ? `- rewrites: pick the 4-6 weakest bullet points VERBATIM from the resume ("original"), rewrite each into a strong, achievement-oriented bullet tailored to this job ("improved"), and explain why ("why"). NEVER invent a metric the candidate didn't provide — where the resume gives no number, leave a clearly-marked placeholder like [X%] or [N] for the candidate to fill in.
- atsOptimizations: 5-8 specific mechanical changes to survive ATS parsing and keyword filters for THIS job.
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
  "sectionFeedback": [{ "section": "...", "grade": "A|B|C|D|F", "feedback": "..." }]${
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
}): Promise<{ result: Analysis; model: string }> {
  const { result, model } = await chat({
    system: buildSystemPrompt(opts.deep),
    user: buildUserPrompt(opts),
    schema: analysisSchema,
    maxTokens: opts.deep ? DEEP_MAX_TOKENS : BASIC_MAX_TOKENS,
    temperature: 0.3,
    mock: () => mockAnalysis(opts.deep),
  });
  return { result: clampScores(result), model };
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(trimmed);
}

function clampScores(a: Analysis): Analysis {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  a.overallScore = clamp(a.overallScore);
  for (const key of Object.keys(a.dimensions) as Array<
    keyof Analysis["dimensions"]
  >) {
    a.dimensions[key].score = clamp(a.dimensions[key].score);
  }
  return a;
}

/* ------------------------------------------------------------------ */
/* Mock (local dev without an API key — MOCK_AI=1)                     */
/* ------------------------------------------------------------------ */

export function mockAnalysis(deep: boolean): Analysis {
  const base: Analysis = {
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
