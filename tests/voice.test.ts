/**
 * The browser-voice fallback must pick the most human voice the device has.
 *
 * It plays whenever the studio voice (ElevenLabs) isn't available, and the old
 * picker took the first English voice matching a loose pattern — on a Mac that
 * was usually the dated "Samantha", even with "Ava (Premium)" installed, and
 * nothing stopped it landing on a novelty voice. So the ranking gets pinned.
 *
 * Run with: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rankVoices, type VoiceLike } from "@/lib/tts";

const v = (name: string, lang = "en-US"): VoiceLike => ({ name, lang });

test("neural 'Natural' voices beat everything else", () => {
  const best = rankVoices([
    v("Samantha"),
    v("Google US English"),
    v("Microsoft Ava Online (Natural) - English (United States)"),
    v("Ava (Premium)"),
  ]);
  assert.equal(best?.name, "Microsoft Ava Online (Natural) - English (United States)");
});

test("Apple's premium and enhanced voices beat the compact ones", () => {
  assert.equal(rankVoices([v("Samantha"), v("Ava (Premium)")])?.name, "Ava (Premium)");
  assert.equal(rankVoices([v("Samantha"), v("Evan (Enhanced)")])?.name, "Evan (Enhanced)");
  assert.equal(rankVoices([v("Fred"), v("Google US English")])?.name, "Google US English");
});

test("novelty voices are never chosen", () => {
  const best = rankVoices([v("Zarvox"), v("Bad News"), v("Whisper"), v("Trinoids"), v("Albert")]);
  assert.equal(best, null);
});

test("US English is preferred over other English at the same quality", () => {
  const best = rankVoices([v("Daniel (Enhanced)", "en-GB"), v("Evan (Enhanced)", "en-US")]);
  assert.equal(best?.name, "Evan (Enhanced)");
});

test("another English voice is still better than none", () => {
  assert.equal(rankVoices([v("Daniel", "en-GB")])?.name, "Daniel");
  assert.equal(rankVoices([v("Amélie", "fr-CA")]), null);
});
