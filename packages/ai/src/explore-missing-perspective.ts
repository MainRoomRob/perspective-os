import type {
  BriefingDelta,
  MultiPerspectiveOutput,
  PeerReviewOutput,
  SupplementaryExpertPerspective,
  SynthesisOutput,
} from "@perspective-os/core";
import {
  briefingDeltaSchema,
  supplementaryExpertPerspectiveSchema,
} from "@perspective-os/core";
import { slugFromPerspectiveName } from "@perspective-os/core";
import { fillPrompt, loadPrompt } from "./load-prompt";
import { completeJson, isAiEnabled } from "./llm";
import { parseJsonResponse } from "./parse-json";

export type ExploreMissingResult = {
  supplementaryPerspective: SupplementaryExpertPerspective;
  briefingDelta: BriefingDelta;
  mock: boolean;
};

function mockSupplementaryPerspective(
  topic: string,
  missingName: string,
): SupplementaryExpertPerspective {
  const id = slugFromPerspectiveName(missingName);
  return supplementaryExpertPerspectiveSchema.parse({
    id,
    name: missingName.startsWith("The ") ? missingName : `The ${missingName}`,
    corePosition: `On "${topic}", ${missingName.replace(/^The\s+/i, "")} would stress constraints and incentives the original five lenses under-weighted — especially compliance, stakeholder power, and what organisations can legally claim or deploy.`,
    sources: [
      {
        title: "Regulatory and policy impact assessment",
        publisher: "OECD Regulatory Policy Outlook",
        sourceType: "report",
      },
      {
        title: "Sector compliance and enforcement trends",
        publisher: "Government accountability office",
        sourceType: "study",
      },
    ],
    evidencePoints: [
      {
        claim: `Recent policy guidance shifts permissible claims and deployment timelines for topics like "${topic}".`,
        sourceIndex: 0,
      },
      {
        claim: "Enforcement patterns show a gap between public narrative and what regulators treat as substantiated.",
        sourceIndex: 1,
      },
    ],
    uniqueInsight: `${missingName} would ask what you are allowed to say and do next quarter — not just what the market finds exciting.`,
  });
}

function mockBriefingDelta(
  step3: SynthesisOutput,
  perspective: SupplementaryExpertPerspective,
  missingImpact: string,
): BriefingDelta {
  return briefingDeltaSchema.parse({
    missingLensId: perspective.id,
    summary: `Adding ${perspective.name} qualifies the briefing: adoption and value claims that looked robust must be read against compliance and permissible-claim constraints. ${missingImpact}`,
    findingChallenges: step3.keyFindings.map((f, i) => ({
      findingIndex: i,
      impact:
        i === 2 ? "undermined" : i === 1 || i === 4 ? "qualified" : "unchanged",
      reason:
        i === 2
          ? `${perspective.name} shows the finding extrapolates beyond evidence the original scan could support.`
          : i === 1 || i === 4
            ? `${perspective.name} adds deployment and claims constraints not reflected in the original synthesis.`
            : "Still supported after adding the new lens.",
    })),
    newTensions: [
      {
        withPerspective: step3.keyFindings[0]?.supportingPerspectives[0] ?? "The Practitioner",
        tension: `${perspective.name} treats operational adoption as insufficient without regulatory clearance for stated outcomes.`,
      },
    ],
    revisedActionableInsight: `Before acting on the original briefing, map which recommendations remain permissible under current rules; pilot only claims ${perspective.name} would treat as defensible.`,
    residualUncertainty: "Whether upcoming rule changes accelerate or block the revised plan.",
  });
}

async function runWithLlm<T>(
  promptFile: string,
  vars: Record<string, string>,
  schema: import("zod").ZodSchema<T>,
): Promise<T> {
  const prompt = fillPrompt(loadPrompt(promptFile), vars);
  const system =
    "You are a rigorous research analyst. Return valid JSON only — no markdown fences or commentary outside the JSON object.";

  let lastError = "Unknown parse error";
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response failed validation: ${lastError}. Return corrected JSON matching the schema exactly.`;

    const { content } = await completeJson({
      system,
      user,
      temperature: 0.4,
    });

    const parsed = parseJsonResponse(content, schema);
    if (parsed.ok) return parsed.data;
    lastError = parsed.error;
  }

  throw new Error(`Failed to parse ${promptFile}: ${lastError}`);
}

export async function exploreMissingPerspective(input: {
  topic: string;
  role: string;
  step1: MultiPerspectiveOutput;
  step3: SynthesisOutput;
  step4: PeerReviewOutput;
}): Promise<ExploreMissingResult> {
  const missingName = input.step4.missingPerspective.perspective;
  const missingImpact = input.step4.missingPerspective.howItWouldChange;

  if (!isAiEnabled()) {
    const supplementaryPerspective = mockSupplementaryPerspective(
      input.topic,
      missingName,
    );
    const briefingDelta = mockBriefingDelta(
      input.step3,
      supplementaryPerspective,
      missingImpact,
    );
    return { supplementaryPerspective, briefingDelta, mock: true };
  }

  const supplementaryPerspective = await runWithLlm(
    "build-missing-perspective.md",
    {
      topic: input.topic,
      role: input.role,
      missingPerspectiveName: missingName,
      missingPerspectiveImpact: missingImpact,
      step1: JSON.stringify(input.step1),
      step3: JSON.stringify(input.step3),
    },
    supplementaryExpertPerspectiveSchema,
  );

  const briefingDelta = await runWithLlm(
    "briefing-delta.md",
    {
      topic: input.topic,
      role: input.role,
      step3: JSON.stringify(input.step3),
      newPerspective: JSON.stringify(supplementaryPerspective),
      missingPerspectiveName: missingName,
      missingPerspectiveImpact: missingImpact,
    },
    briefingDeltaSchema,
  );

  return { supplementaryPerspective, briefingDelta, mock: false };
}
