import "server-only";

import briefingDelta from "../prompts/v1/briefing-delta.md";
import buildMissingPerspective from "../prompts/v1/build-missing-perspective.md";
import recommendRoster from "../prompts/v1/recommend-roster.md";
import step1MultiPerspective from "../prompts/v1/step-1-multi-perspective.md";
import step2ContradictionMap from "../prompts/v1/step-2-contradiction-map.md";
import step3Synthesis from "../prompts/v1/step-3-synthesis.md";
import step4PeerReview from "../prompts/v1/step-4-peer-review.md";

const PROMPTS: Record<string, string> = {
  "step-1-multi-perspective.md": step1MultiPerspective,
  "step-2-contradiction-map.md": step2ContradictionMap,
  "step-3-synthesis.md": step3Synthesis,
  "step-4-peer-review.md": step4PeerReview,
  "build-missing-perspective.md": buildMissingPerspective,
  "briefing-delta.md": briefingDelta,
  "recommend-roster.md": recommendRoster,
};

export function loadPrompt(name: string): string {
  const text = PROMPTS[name];
  if (!text) throw new Error(`Unknown prompt: ${name}`);
  return text;
}

export function fillPrompt(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
