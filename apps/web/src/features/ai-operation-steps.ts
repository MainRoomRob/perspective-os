export type AiOperationId =
  | "research-step-1"
  | "research-step-2"
  | "research-step-3"
  | "research-step-4"
  | "research-run-all"
  | "research-explore-missing";

export type AiOperationContext = {
  /** Display names for the session roster (without "The "). */
  lensNames?: string[];
};

export type AiOperationStep = {
  message: string | ((ctx: AiOperationContext) => string);
};

export type AiOperationConfig = {
  title: string;
  durationHint?: string;
  advanceMs: number;
  steps: AiOperationStep[];
  tips?: string[];
};

function lensDisplayName(name: string): string {
  return name.replace(/^The /, "");
}

function formatLensList(names: string[]): string {
  if (names.length === 0) return "expert views";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function splitLensNames(names: string[]): [string[], string[]] {
  const display = names.map(lensDisplayName);
  const mid = Math.ceil(display.length / 2);
  return [display.slice(0, mid), display.slice(mid)];
}

function step1SimulatingMessage(
  ctx: AiOperationContext,
  batch: "first" | "second",
): string {
  const names = ctx.lensNames ?? [];
  if (names.length === 0) {
    return batch === "first"
      ? "Simulating expert perspectives…"
      : "Simulating remaining perspectives…";
  }

  const [first, second] = splitLensNames(names);
  const batchNames = batch === "first" ? first : second;
  if (batchNames.length === 0) {
    return batch === "second"
      ? "Cross-checking perspectives against the brief…"
      : "Simulating expert perspectives…";
  }
  return `Simulating ${formatLensList(batchNames)}…`;
}

export const AI_OPERATIONS: Record<AiOperationId, AiOperationConfig> = {
  "research-step-1": {
    title: "Multi-Perspective Scan",
    durationHint: "Usually 1–2 minutes.",
    advanceMs: 22_000,
    steps: [
      {
        message: (ctx) =>
          ctx.lensNames?.length
            ? `Preparing ${formatLensList(ctx.lensNames.map(lensDisplayName))}…`
            : "Preparing five expert perspectives…",
      },
      { message: (ctx) => step1SimulatingMessage(ctx, "first") },
      { message: (ctx) => step1SimulatingMessage(ctx, "second") },
      { message: "Structuring perspective outputs…" },
    ],
    tips: [
      "Each perspective must be genuinely distinct—not five variations of the same mainstream view.",
    ],
  },
  "research-step-2": {
    title: "Contradiction Map",
    durationHint: "Usually 20–40 seconds.",
    advanceMs: 8_000,
    steps: [
      { message: "Comparing perspectives for agreements…" },
      { message: "Mapping direct contradictions…" },
      { message: "Ranking evidence strength…" },
      { message: "Identifying blind spots and uncertainties…" },
    ],
    tips: [
      "Conflicts are as valuable as consensus—they reveal where the evidence is genuinely contested.",
    ],
  },
  "research-step-3": {
    title: "Synthesis",
    durationHint: "Usually 20–40 seconds.",
    advanceMs: 8_000,
    steps: [
      { message: "Reviewing contradiction map…" },
      { message: "Drafting executive summary…" },
      { message: "Extracting key findings for your role…" },
      { message: "Formulating actionable insight…" },
    ],
    tips: [
      "The actionable insight should be specific to your role—not generic advice anyone could use.",
    ],
  },
  "research-step-4": {
    title: "Peer Review",
    durationHint: "Usually 20–40 seconds.",
    advanceMs: 8_000,
    steps: [
      { message: "Scoring confidence on key findings…" },
      { message: "Checking for bias and weak links…" },
      { message: "Assessing missing perspectives…" },
      { message: "Compiling overall assessment…" },
    ],
    tips: [
      "A strong peer review challenges the synthesis—not just rubber-stamps it.",
    ],
  },
  "research-run-all": {
    title: "Full research pipeline",
    durationHint: "Usually 2–4 minutes.",
    advanceMs: 55_000,
    steps: [
      { message: "Running multi-perspective scan…" },
      { message: "Building contradiction map…" },
      { message: "Synthesising briefing…" },
      { message: "Running peer review…" },
    ],
    tips: [
      "Each step builds on the last—perspectives inform contradictions, which inform synthesis.",
    ],
  },
  "research-explore-missing": {
    title: "Explore missing perspective",
    durationHint: "Usually 30–60 seconds.",
    advanceMs: 18_000,
    steps: [
      { message: "Building supplementary expert panel…" },
      { message: "Tracing evidence and sources…" },
      { message: "Analysing briefing impact…" },
      { message: "Drafting revised actionable insight…" },
    ],
    tips: [
      "This adds a lens Peer Review identified — then shows what would change in your briefing.",
    ],
  },
};

export function resolveStepMessage(
  step: AiOperationStep,
  context: AiOperationContext,
): string {
  return typeof step.message === "function" ? step.message(context) : step.message;
}

export function researchStepOperationId(
  step: 1 | 2 | 3 | 4,
): Exclude<AiOperationId, "research-run-all"> {
  return `research-step-${step}` as Exclude<AiOperationId, "research-run-all">;
}
