/**
 * Delivery metrics, measured — not guessed.
 *
 * The point of a voice interview is that HOW you say it is half of what a
 * panel is judging. A transcript alone hides all of it: an answer that reads
 * fine on the page can be delivered at 210 words a minute with a filler every
 * four seconds, and that is what actually loses the offer.
 *
 * These numbers are computed in the browser from the real audio session and
 * carried through to the report, so the coaching can say "you averaged 14
 * fillers a minute" rather than the vague "try to be more concise" that every
 * other tool produces.
 */

/** Counted as fillers. Multi-word entries are matched as phrases. */
export const FILLERS = [
  "um",
  "uh",
  "erm",
  "ah",
  "hmm",
  "like",
  "you know",
  "i mean",
  "basically",
  "actually",
  "literally",
  "obviously",
  "sort of",
  "kind of",
  "kinda",
  "sorta",
  "right",
  "yeah so",
  "so yeah",
] as const;

/** Language that undercuts a claim. Distinct from fillers: these signal doubt. */
export const HEDGES = [
  "i think",
  "i guess",
  "i suppose",
  "maybe",
  "perhaps",
  "probably",
  "possibly",
  "i'm not sure",
  "im not sure",
  "not really sure",
  "i would say",
  "kind of like",
  "or something",
  "or whatever",
  "a little bit",
  "somewhat",
  "i feel like",
  "hopefully",
] as const;

export type Delivery = {
  /** Seconds of the answer, wall-clock from mic-on to mic-off. */
  durationSec: number;
  wordCount: number;
  /** Words per minute. Conversational interview pace is ~130-160. */
  wpm: number;
  fillerCount: number;
  fillersPerMin: number;
  hedgeCount: number;
  /** Silences over PAUSE_THRESHOLD seconds, mid-answer. */
  pauseCount: number;
  longestPauseSec: number;
  /** Which fillers, and how often — so the report can name the specific tic. */
  fillerBreakdown: Record<string, number>;
  hedgeBreakdown: Record<string, number>;
};

/** A silence longer than this, mid-answer, reads as hesitation. */
export const PAUSE_THRESHOLD_SEC = 1.5;

/* ---------------- bands ---------------- */

export type Band = "good" | "warn" | "bad";

export function paceBand(wpm: number): Band {
  if (wpm === 0) return "bad";
  if (wpm >= 125 && wpm <= 165) return "good";
  if (wpm >= 105 && wpm <= 185) return "warn";
  return "bad";
}

export function paceLabel(wpm: number): string {
  if (wpm === 0) return "No speech detected";
  if (wpm < 105) return "Too slow — you sound unsure";
  if (wpm < 125) return "A touch slow";
  if (wpm <= 165) return "Conversational — right where you want to be";
  if (wpm <= 185) return "A little fast";
  return "Too fast — you're rushing, and it reads as nerves";
}

export function fillerBand(perMin: number): Band {
  if (perMin <= 2) return "good";
  if (perMin <= 6) return "warn";
  return "bad";
}

export function fillerLabel(perMin: number): string {
  if (perMin <= 2) return "Barely noticeable";
  if (perMin <= 6) return "Noticeable — a panel will register it";
  if (perMin <= 12) return "Distracting — roughly one every five seconds";
  return "Severe — this is what they'll remember, not your answer";
}

export function hedgeBand(count: number, words: number): Band {
  const per100 = words > 0 ? (count / words) * 100 : 0;
  if (per100 <= 1) return "good";
  if (per100 <= 3) return "warn";
  return "bad";
}

/* ---------------- computation ---------------- */

function normalise(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

/** Count non-overlapping occurrences of a phrase, on word boundaries. */
function countPhrase(haystack: string, phrase: string): number {
  const needle = ` ${phrase} `;
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    count += 1;
    // step past the phrase but keep the trailing space as the next leading one
    from = at + needle.length - 1;
  }
  return count;
}

export function computeDelivery(opts: {
  transcript: string;
  durationSec: number;
  /** Durations of mid-answer silences, in seconds. */
  pauses: number[];
}): Delivery {
  const text = normalise(opts.transcript);
  const words = text.trim() ? text.trim().split(" ").length : 0;
  const duration = Math.max(0, opts.durationSec);

  const fillerBreakdown: Record<string, number> = {};
  let fillerCount = 0;
  // Longest phrases first, so "you know" isn't double-counted as "know".
  for (const f of [...FILLERS].sort((a, b) => b.length - a.length)) {
    const n = countPhrase(text, f);
    if (n > 0) {
      fillerBreakdown[f] = n;
      fillerCount += n;
    }
  }

  const hedgeBreakdown: Record<string, number> = {};
  let hedgeCount = 0;
  for (const h of [...HEDGES].sort((a, b) => b.length - a.length)) {
    const n = countPhrase(text, h);
    if (n > 0) {
      hedgeBreakdown[h] = n;
      hedgeCount += n;
    }
  }

  const longPauses = opts.pauses.filter((p) => p >= PAUSE_THRESHOLD_SEC);

  const minutes = duration / 60;
  return {
    durationSec: Math.round(duration),
    wordCount: words,
    wpm: minutes > 0 ? Math.round(words / minutes) : 0,
    fillerCount,
    fillersPerMin:
      minutes > 0 ? Math.round((fillerCount / minutes) * 10) / 10 : 0,
    hedgeCount,
    pauseCount: longPauses.length,
    longestPauseSec:
      longPauses.length > 0
        ? Math.round(Math.max(...longPauses) * 10) / 10
        : 0,
    fillerBreakdown,
    hedgeBreakdown,
  };
}

/** Roll per-answer metrics up into one session-level view. */
export function aggregate(all: Delivery[]): Delivery {
  if (all.length === 0) {
    return {
      durationSec: 0,
      wordCount: 0,
      wpm: 0,
      fillerCount: 0,
      fillersPerMin: 0,
      hedgeCount: 0,
      pauseCount: 0,
      longestPauseSec: 0,
      fillerBreakdown: {},
      hedgeBreakdown: {},
    };
  }

  const durationSec = all.reduce((s, d) => s + d.durationSec, 0);
  const wordCount = all.reduce((s, d) => s + d.wordCount, 0);
  const fillerCount = all.reduce((s, d) => s + d.fillerCount, 0);
  const hedgeCount = all.reduce((s, d) => s + d.hedgeCount, 0);

  const merge = (key: "fillerBreakdown" | "hedgeBreakdown") => {
    const out: Record<string, number> = {};
    for (const d of all) {
      for (const [k, v] of Object.entries(d[key])) {
        out[k] = (out[k] ?? 0) + v;
      }
    }
    return out;
  };

  const minutes = durationSec / 60;
  return {
    durationSec,
    wordCount,
    // Recomputed from the totals, not averaged — averaging per-answer WPM
    // would weight a 5-second answer the same as a 90-second one.
    wpm: minutes > 0 ? Math.round(wordCount / minutes) : 0,
    fillerCount,
    fillersPerMin:
      minutes > 0 ? Math.round((fillerCount / minutes) * 10) / 10 : 0,
    hedgeCount,
    pauseCount: all.reduce((s, d) => s + d.pauseCount, 0),
    longestPauseSec: Math.max(0, ...all.map((d) => d.longestPauseSec)),
    fillerBreakdown: merge("fillerBreakdown"),
    hedgeBreakdown: merge("hedgeBreakdown"),
  };
}

/** A 0-100 delivery score, from the measurements alone. */
export function deliveryScore(d: Delivery): number {
  if (d.wordCount === 0) return 0;

  // Pace: full marks in the conversational band, falling away either side.
  const pacePenalty =
    d.wpm >= 125 && d.wpm <= 165
      ? 0
      : Math.min(30, Math.abs(d.wpm - 145) / 2.2);

  // Fillers: the single most damaging habit, so it carries the most weight.
  const fillerPenalty = Math.min(35, d.fillersPerMin * 3.2);

  // Hedging, relative to how much they said.
  const hedgeRate = (d.hedgeCount / Math.max(1, d.wordCount)) * 100;
  const hedgePenalty = Math.min(20, hedgeRate * 5);

  // Hesitation.
  const pausePenalty = Math.min(15, d.pauseCount * 2.5);

  return Math.max(
    0,
    Math.round(100 - pacePenalty - fillerPenalty - hedgePenalty - pausePenalty)
  );
}
