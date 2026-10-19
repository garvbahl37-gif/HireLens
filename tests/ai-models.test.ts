/**
 * Pins how the AI layer copes with Groq's model catalogue changing under it.
 *
 * In October 2026 Groq retired llama-3.3-70b-versatile and llama-4-scout —
 * the app's default and its only fallback — so every review and interview
 * failed with a 404 model_not_found that was thrown instead of falling
 * through. And its replacement candidate, gpt-oss-120b, spends its small
 * token budgets on hidden reasoning, so Groq truncates and rejects the JSON
 * server-side (400 json_validate_failed), which also used to be thrown.
 *
 * Run with: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groqModelChain,
  isJsonGenerationFailure,
  isModelUnavailable,
} from "@/lib/ai";

test("the default Groq chain only uses models Groq still serves", () => {
  const chain = groqModelChain(undefined);
  assert.deepEqual(chain, ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"]);
  assert.ok(!chain.includes("llama-3.3-70b-versatile"));
});

test("a configured model goes first, then the fallbacks, without duplicates", () => {
  assert.deepEqual(groqModelChain("openai/gpt-oss-120b"), [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
  ]);
  // A stale GROQ_MODEL left in a deploy's env still gets a working fallback.
  assert.deepEqual(groqModelChain("llama-3.3-70b-versatile"), [
    "llama-3.3-70b-versatile",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
  ]);
});

test("a retired or missing model is recognised, so the chain moves on", () => {
  assert.equal(isModelUnavailable({ status: 404, code: "model_not_found" }), true);
  assert.equal(isModelUnavailable({ status: 400, code: "model_decommissioned" }), true);
  assert.equal(isModelUnavailable({ status: 400, code: "json_validate_failed" }), false);
  assert.equal(isModelUnavailable({ status: 429 }), false);
  assert.equal(isModelUnavailable(new Error("network down")), false);
});

test("Groq rejecting the JSON server-side is a format failure to retry", () => {
  assert.equal(isJsonGenerationFailure({ status: 400, code: "json_validate_failed" }), true);
  assert.equal(isJsonGenerationFailure({ status: 400, code: "model_decommissioned" }), false);
  assert.equal(isJsonGenerationFailure({ status: 404, code: "model_not_found" }), false);
});
