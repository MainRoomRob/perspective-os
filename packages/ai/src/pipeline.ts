import type {
  ContradictionMapOutput,
  MultiPerspectiveOutput,
  PeerReviewOutput,
  ResearchStep,
  SessionBrief,
  SynthesisOutput,
} from "@perspective-os/core";
import {
  type PerspectiveSlot,
  contradictionMapOutputNewSchema,
  formatPerspectiveRoster,
  formatSessionBriefBlock,
  multiPerspectiveOutputNewSchema,
  peerReviewOutputNewSchema,
  resolvePerspectiveConfig,
  synthesisOutputNewSchema,
} from "@perspective-os/core";
import { fillPrompt, loadPrompt } from "./load-prompt";
import { completeJson, isAiEnabled } from "./llm";
import {
  mockContradictionMap,
  mockMultiPerspective,
  mockPeerReview,
  mockSynthesis,
} from "./mock-fixtures";
import { parseJsonResponse } from "./parse-json";
import { renderStepMarkdown } from "./render-markdown";
import {
  formatResearchContextBlock,
  gatherResearchContext,
} from "./research-gather";

const PROMPT_FILES: Record<ResearchStep, string> = {
  1: "step-1-multi-perspective.md",
  2: "step-2-contradiction-map.md",
  3: "step-3-synthesis.md",
  4: "step-4-peer-review.md",
};

const SCHEMAS = {
  1: multiPerspectiveOutputNewSchema,
  2: contradictionMapOutputNewSchema,
  3: synthesisOutputNewSchema,
  4: peerReviewOutputNewSchema,
} as const;

export type PipelineContext = {
  brief: SessionBrief;
  perspectiveConfig?: PerspectiveSlot[] | null;
  step1?: MultiPerspectiveOutput;
  step2?: ContradictionMapOutput;
  step3?: SynthesisOutput;
};

export type StepRunResult<T> = {
  output: T;
  rawMarkdown: string;
  mock: boolean;
  model?: string;
  provider?: string;
};

async function runWithLlm<T>(
  step: ResearchStep,
  vars: Record<string, string>,
  schema: import("zod").ZodSchema<T>,
): Promise<{ output: T; model: string; provider: string }> {
  const prompt = fillPrompt(loadPrompt(PROMPT_FILES[step]), vars);
  const system =
    "You are a rigorous research analyst. Return valid JSON only — no markdown fences or commentary outside the JSON object.";

  let lastError = "Unknown parse error";
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response failed validation: ${lastError}. Return corrected JSON matching the schema exactly.`;

    const { content, model, provider } = await completeJson({
      system,
      user,
      temperature: 0.4,
    });

    const parsed = parseJsonResponse(content, schema);
    if (parsed.ok) {
      return { output: parsed.data, model, provider };
    }
    lastError = parsed.error;
  }

  throw new Error(`Failed to parse step ${step} output: ${lastError}`);
}

export async function runStep1(
  brief: SessionBrief,
  perspectiveConfig?: PerspectiveSlot[] | null,
): Promise<StepRunResult<MultiPerspectiveOutput>> {
  const roster = resolvePerspectiveConfig(perspectiveConfig);
  const briefBlock = formatSessionBriefBlock(brief);

  if (!isAiEnabled()) {
    const output = mockMultiPerspective(brief.topic, roster);
    return { output, rawMarkdown: renderStepMarkdown(1, output), mock: true };
  }

  const gathered = await gatherResearchContext(brief.topic);
  const researchContext = gathered
    ? `${formatResearchContextBlock(gathered)}\n`
    : "";

  const { output, model, provider } = await runWithLlm(
    1,
    {
      topic: brief.topic,
      briefBlock,
      researchContext,
      perspectiveRoster: formatPerspectiveRoster(roster),
    },
    SCHEMAS[1],
  );
  return {
    output,
    rawMarkdown: renderStepMarkdown(1, output),
    mock: false,
    model,
    provider,
  };
}

export async function runStep2(
  brief: SessionBrief,
  step1: MultiPerspectiveOutput,
): Promise<StepRunResult<ContradictionMapOutput>> {
  if (!isAiEnabled()) {
    const output = mockContradictionMap(step1);
    return { output, rawMarkdown: renderStepMarkdown(2, output), mock: true };
  }

  const { output, model, provider } = await runWithLlm(
    2,
    {
      topic: brief.topic,
      briefBlock: formatSessionBriefBlock(brief),
      step1: JSON.stringify(step1),
    },
    SCHEMAS[2],
  );
  return {
    output,
    rawMarkdown: renderStepMarkdown(2, output),
    mock: false,
    model,
    provider,
  };
}

export async function runStep3(
  brief: SessionBrief,
  step1: MultiPerspectiveOutput,
  step2: ContradictionMapOutput,
): Promise<StepRunResult<SynthesisOutput>> {
  if (!isAiEnabled()) {
    const output = mockSynthesis(brief.topic, brief.role, step1, step2);
    return { output, rawMarkdown: renderStepMarkdown(3, output), mock: true };
  }

  const { output, model, provider } = await runWithLlm(
    3,
    {
      topic: brief.topic,
      role: brief.role,
      briefBlock: formatSessionBriefBlock(brief),
      step1: JSON.stringify(step1),
      step2: JSON.stringify(step2),
    },
    SCHEMAS[3],
  );
  return {
    output,
    rawMarkdown: renderStepMarkdown(3, output),
    mock: false,
    model,
    provider,
  };
}

export async function runStep4(
  brief: SessionBrief,
  step1: MultiPerspectiveOutput,
  step2: ContradictionMapOutput,
  step3: SynthesisOutput,
): Promise<StepRunResult<PeerReviewOutput>> {
  if (!isAiEnabled()) {
    const output = mockPeerReview(step3);
    return { output, rawMarkdown: renderStepMarkdown(4, output), mock: true };
  }

  const { output, model, provider } = await runWithLlm(
    4,
    {
      topic: brief.topic,
      role: brief.role,
      step1: JSON.stringify(step1),
      step2: JSON.stringify(step2),
      step3: JSON.stringify(step3),
    },
    SCHEMAS[4],
  );
  return {
    output,
    rawMarkdown: renderStepMarkdown(4, output),
    mock: false,
    model,
    provider,
  };
}

export async function runResearchStep(
  step: ResearchStep,
  ctx: PipelineContext,
): Promise<
  StepRunResult<
    | MultiPerspectiveOutput
    | ContradictionMapOutput
    | SynthesisOutput
    | PeerReviewOutput
  >
> {
  switch (step) {
    case 1:
      return runStep1(ctx.brief, ctx.perspectiveConfig);
    case 2:
      if (!ctx.step1) throw new Error("Step 1 must complete before step 2");
      return runStep2(ctx.brief, ctx.step1);
    case 3:
      if (!ctx.step1 || !ctx.step2) {
        throw new Error("Steps 1–2 must complete before step 3");
      }
      return runStep3(ctx.brief, ctx.step1, ctx.step2);
    case 4:
      if (!ctx.step1 || !ctx.step2 || !ctx.step3) {
        throw new Error("Steps 1–3 must complete before step 4");
      }
      return runStep4(ctx.brief, ctx.step1, ctx.step2, ctx.step3);
    default:
      throw new Error(`Invalid step: ${step}`);
  }
}

export async function runFullPipeline(
  brief: SessionBrief,
  perspectiveConfig?: PerspectiveSlot[] | null,
): Promise<{
  step1: MultiPerspectiveOutput;
  step2: ContradictionMapOutput;
  step3: SynthesisOutput;
  step4: PeerReviewOutput;
  mock: boolean;
}> {
  const r1 = await runStep1(brief, perspectiveConfig);
  const r2 = await runStep2(brief, r1.output);
  const r3 = await runStep3(brief, r1.output, r2.output);
  const r4 = await runStep4(brief, r1.output, r2.output, r3.output);
  return {
    step1: r1.output,
    step2: r2.output,
    step3: r3.output,
    step4: r4.output,
    mock: r1.mock && r2.mock && r3.mock && r4.mock,
  };
}
