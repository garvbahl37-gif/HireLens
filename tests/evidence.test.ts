/**
 * The first tests in the repo, and deliberately these ones.
 *
 * src/lib/evidence.ts is what makes two of the product's load-bearing promises
 * TRUE rather than merely requested in a prompt: "the interviewer only quotes
 * lines you actually wrote" and "a rewrite never invents a number you didn't
 * state". If either of these regresses, the honesty positioning becomes a lie
 * and a user can get caught out in a real interview. So they get pinned.
 *
 * Run with: npm test  (node's built-in runner via tsx, no extra deps).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  containment,
  isGroundedIn,
  grounder,
  inventedNumbers,
} from "../src/lib/evidence";

const RESUME = `
John Doe — Senior Software Engineer

• Rebuilt the checkout flow in React, cutting cart abandonment by 18%.
• Led a team of 6 engineers across two time zones.
• Reduced p99 latency 40% by adding a Redis cache layer.
• Skills: TypeScript, PostgreSQL, Kubernetes, GraphQL.
`;

test("a verbatim resume line is grounded", () => {
  assert.equal(
    isGroundedIn("Led a team of 6 engineers across two time zones.", RESUME),
    true
  );
});

test("a fabricated quote is not grounded", () => {
  assert.equal(
    isGroundedIn("Architected a distributed ML platform from scratch.", RESUME),
    false
  );
});

test("PDF artifacts (smart quotes, bullet glyphs, soft hyphens) still ground", () => {
  // What unpdf + a model paraphrase-on-copy typically does to a real line.
  const mangled = "Reduced p99 la­tency 40 % by adding a Redis cache layer";
  assert.ok(containment(mangled, RESUME) >= 0.9);
});

test("a near-quote with one word changed still grounds; a rewritten one does not", () => {
  assert.equal(
    isGroundedIn("Rebuilt the checkout flow in React, cutting cart abandonment by 18%", RESUME),
    true
  );
  assert.equal(
    isGroundedIn("Single-handedly owned the entire payments org for three years", RESUME),
    false
  );
});

test("grounder() closure matches the standalone check", () => {
  const g = grounder(RESUME);
  assert.equal(g("Skills: TypeScript, PostgreSQL, Kubernetes, GraphQL."), true);
  assert.equal(g("Fluent in Rust, Go, and Haskell."), false);
});

test("inventedNumbers flags a metric the resume never stated", () => {
  const invented = inventedNumbers(
    "Reduced p99 latency 73% by adding a Redis cache layer.",
    RESUME
  );
  assert.deepEqual(invented, ["73"]);
});

test("inventedNumbers passes a number that IS in the resume", () => {
  assert.deepEqual(
    inventedNumbers("Cut cart abandonment 18% in the first quarter.", RESUME),
    []
  );
});

test("a [placeholder] is the sanctioned way to ask for a missing number", () => {
  assert.deepEqual(
    inventedNumbers("Reduced p99 latency [X%] by adding a Redis cache layer.", RESUME),
    []
  );
});

test("spelled-out invented numbers are caught too", () => {
  // "eight" -> 8, which the resume never states.
  const invented = inventedNumbers("Mentored eight junior engineers.", RESUME);
  assert.ok(invented.includes("8"));
});

test("thousands separators and the same number match across formats", () => {
  const resume = "Processed 40,000 orders per month.";
  assert.deepEqual(
    inventedNumbers("Processed 40000 orders per month.", resume),
    []
  );
});
