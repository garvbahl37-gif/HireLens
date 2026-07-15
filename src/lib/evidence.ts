/**
 * Is this quote actually in the resume?
 *
 * The analysis prompt asks the model to quote the candidate's bullets VERBATIM.
 * A prompt is a request, not a guarantee, and the failure mode is the worst one
 * this product has: showing a person a sentence they never wrote, in quotation
 * marks, as their own. So the quote is checked here, in code, and a claim that
 * fails the check is dropped before it ever reaches the user.
 *
 * Exact string matching does not survive contact with a PDF. `unpdf` returns
 * text littered with ligatures, soft hyphens, non-breaking spaces, bullet
 * glyphs and line wraps inserted mid-sentence, and the model silently
 * normalises all of it when it quotes. So we normalise both sides the same way
 * and then ask a softer question -- is nearly every trigram of the quote
 * present in the resume -- which tolerates a smart-quote or a dropped hyphen
 * but not an invented sentence.
 */

/** Fold away everything a PDF extractor or a model might have mangled. */
export function normalize(s: string): string {
  return (
    s
      .normalize("NFKD")
      // Ligatures NFKD misses, soft hyphens, zero-width and bullet glyphs.
      .replace(/[­​-‍﻿]/g, "")
      .replace(/[•▪●·‣⁃]/g, " ")
      // Every flavour of dash and quote the model might "improve" on the way out.
      .replace(/[‐-―−]/g, "-")
      .replace(/[‘’‛′]/g, "'")
      .replace(/[“”‟″]/g, '"')
      .toLowerCase()
      // Keep only what carries meaning; punctuation is where quotes drift most.
      .replace(/[^a-z0-9%$.+\-/'\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function trigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i + 3 <= s.length; i++) out.push(s.slice(i, i + 3));
  return out;
}

/**
 * What fraction of the quote's trigrams appear in the resume. 1 = every one.
 *
 * Trigram *containment*, not Jaccard similarity: the resume is thousands of
 * characters and the quote is one line, so a symmetric measure would score
 * every true quote near zero. The only question that matters is whether the
 * quote is inside the haystack.
 */
export function containment(quote: string, haystack: string): number {
  const q = normalize(quote);
  const h = normalize(haystack);
  if (q.length < 3) return 0;
  // Short enough to be a substring check, which is exact and cheaper.
  if (h.includes(q)) return 1;

  const hay = new Set(trigrams(h));
  const grams = trigrams(q);
  if (grams.length === 0) return 0;

  let hit = 0;
  for (const g of grams) if (hay.has(g)) hit++;
  return hit / grams.length;
}

/** A quote is grounded when almost all of it is demonstrably in the resume. */
export const GROUNDING_THRESHOLD = 0.9;

export function isGroundedIn(quote: string, resumeText: string): boolean {
  return containment(quote, resumeText) >= GROUNDING_THRESHOLD;
}

/**
 * Build a grounding check bound to one resume.
 *
 * Returned as a closure so callers (the `verify` hook in chat()) can filter a
 * whole array of model output against a single haystack without re-normalising
 * it on every element -- the resume is up to 9k chars and normalising it per
 * claim is the difference between a microsecond and a millisecond per call.
 */
export function grounder(resumeText: string) {
  const h = normalize(resumeText);
  const hay = new Set(trigrams(h));

  return (quote: string): boolean => {
    const q = normalize(quote);
    if (q.length < 3) return false;
    if (h.includes(q)) return true;
    const grams = trigrams(q);
    if (grams.length === 0) return false;
    let hit = 0;
    for (const g of grams) if (hay.has(g)) hit++;
    return hit / grams.length >= GROUNDING_THRESHOLD;
  };
}

/* ------------------------------------------------------------------ */
/* The number guard                                                    */
/* ------------------------------------------------------------------ */

const SPELLED: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
  twenty: "20",
  thirty: "30",
  forty: "40",
  fifty: "50",
  hundred: "100",
  thousand: "1000",
  million: "1000000",
};

/** Every number in the text, digits and spelled-out alike, as a comparable set. */
function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  const t = text.toLowerCase();

  // Digits, with thousands separators and decimals folded away so "40,000"
  // and "40000" are the same number.
  for (const m of t.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const raw = m[0].replace(/,/g, "");
    out.add(raw);
    // "23.0" and "23" are the same claim.
    if (raw.includes(".")) out.add(String(parseFloat(raw)));
  }
  for (const [word, digit] of Object.entries(SPELLED)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) out.add(digit);
  }
  return out;
}

/**
 * A rewritten bullet may not contain a number the resume never stated.
 *
 * This is the single most consequential guardrail in the product. The prompt
 * already asks for it politely ("NEVER invent a metric the candidate didn't
 * provide"); competitors ship the same request and their tools hallucinate
 * "reduced latency 40%" onto resumes that never said 40. A fabricated metric on
 * a resume is not a quality nit, it is something a candidate gets caught lying
 * about in the room.
 *
 * Placeholders are the sanctioned escape hatch: [X%], [N], [X] are how the
 * model is told to say "your number goes here", so digits inside brackets are
 * exempt.
 *
 * Returns the offending numbers, empty when the rewrite is clean.
 */
export function inventedNumbers(improved: string, resumeText: string): string[] {
  // Strip the sanctioned placeholders before looking for digits.
  const stripped = improved.replace(/\[[^\]]*\]/g, " ");
  const claimed = numbersIn(stripped);
  if (claimed.size === 0) return [];

  // Strict on purpose: any number not traceable to the resume is invented,
  // including an innocuous-looking "3 engineers". There is no number the
  // candidate did not supply that we have any business putting on their
  // resume, and a rewrite that needs one has [N] to ask for it.
  const known = numbersIn(resumeText);
  return [...claimed].filter((n) => !known.has(n));
}
