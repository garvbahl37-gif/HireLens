import type { Analysis } from "@/lib/ai";
import { DIMENSION_LABELS } from "@/lib/ai";

/**
 * The honest diff between a review and the re-score that followed it.
 *
 * The product line is "we don't guess your new score, we re-run it" — so the
 * headline is the REAL re-scored integer, and everything supporting it is
 * derived ground truth from the two analyses, not a projection. The one thing
 * we refuse to do is compare across a different model or prompt version: that
 * number moving would be noise, and claiming it as progress would be the exact
 * dishonesty the rest of the product is built against.
 */
export type RescoreDelta = {
  /** Same model + prompt version on both runs. False → the delta is not real. */
  comparable: boolean;
  from: number;
  to: number;
  scoreDelta: number;
  /** Keywords that were missing before and are matched now. */
  keywordsResolved: string[];
  /** Dimensions that moved, with their before/after. */
  dimensions: {
    key: keyof Analysis["dimensions"];
    label: string;
    from: number;
    to: number;
  }[];
};

const norm = (s: string) => s.trim().toLowerCase();

export function rescoreDelta(
  parent: { result: Analysis; model: string; promptVersion: string },
  child: { result: Analysis; model: string; promptVersion: string }
): RescoreDelta {
  const comparable =
    parent.model === child.model &&
    parent.promptVersion === child.promptVersion;

  const nowMatched = new Set(child.result.matchedKeywords.map(norm));
  const keywordsResolved = parent.result.missingKeywords.filter((k) =>
    nowMatched.has(norm(k))
  );

  const dimensions = (
    Object.keys(DIMENSION_LABELS) as Array<keyof Analysis["dimensions"]>
  )
    .map((key) => ({
      key,
      label: DIMENSION_LABELS[key],
      from: parent.result.dimensions[key].score,
      to: child.result.dimensions[key].score,
    }))
    .filter((d) => d.from !== d.to);

  return {
    comparable,
    from: parent.result.overallScore,
    to: child.result.overallScore,
    scoreDelta: child.result.overallScore - parent.result.overallScore,
    keywordsResolved,
    dimensions,
  };
}
