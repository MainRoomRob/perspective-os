import type { RosterRecommendation, SessionBrief } from "@perspective-os/core";
import {
  CLASSIC_PRESET,
  PERSPECTIVE_PRESETS,
  buildLensCatalog,
  formatLensCatalogForPrompt,
  formatPresetOptionsForPrompt,
  getPresetByIdFromData,
  rosterRecommendationSchema,
} from "@perspective-os/core";
import { fillPrompt, loadPrompt } from "./load-prompt";
import { completeJson, isAiEnabled } from "./llm";
import { parseJsonResponse } from "./parse-json";

export type RecommendRosterResult = {
  recommendation: RosterRecommendation;
  mock: boolean;
  model?: string;
  provider?: string;
};

function mockRecommendRoster(brief: SessionBrief): RosterRecommendation {
  const decision = brief.decision.toLowerCase();
  let presetId = CLASSIC_PRESET.id;

  if (
    decision.includes("regulat") ||
    decision.includes("compliance") ||
    decision.includes("policy") ||
    decision.includes("legal")
  ) {
    presetId = "policy-regulation";
  } else if (
    decision.includes("product") ||
    decision.includes("gtm") ||
    decision.includes("launch") ||
    decision.includes("position") ||
    decision.includes("buyer") ||
    decision.includes("customer")
  ) {
    presetId = "product-gtm";
  }

  const preset = getPresetByIdFromData(presetId) ?? CLASSIC_PRESET;

  return rosterRecommendationSchema.parse({
    recommendationType: "preset",
    presetId: preset.id,
    rationale: `For "${brief.decision}", the ${preset.label} pack surfaces lenses aligned with how this decision is usually stress-tested. Adjust if your constraints differ.`,
    slotRationale: preset.slots.map(
      (slot) =>
        `${slot.name.replace(/^The /, "")} helps test assumptions relevant to your decision from a ${slot.lens.slice(0, 80).toLowerCase()}…`,
    ),
  });
}

function validatePresetRecommendation(
  recommendation: RosterRecommendation,
): RosterRecommendation {
  if (recommendation.recommendationType !== "preset" || !recommendation.presetId) {
    return recommendation;
  }

  const preset = getPresetByIdFromData(recommendation.presetId);
  if (!preset) {
    return rosterRecommendationSchema.parse({
      ...recommendation,
      recommendationType: "preset",
      presetId: CLASSIC_PRESET.id,
      rationale: `${recommendation.rationale} (Adjusted to Classic five — suggested preset was unavailable.)`,
    });
  }

  return recommendation;
}

function validateCustomRecommendation(
  recommendation: RosterRecommendation,
): RosterRecommendation {
  if (recommendation.recommendationType !== "custom" || !recommendation.slots) {
    return recommendation;
  }

  const catalog = buildLensCatalog();
  const byId = new Map(catalog.map((entry) => [entry.catalogId, entry]));
  const seenArchetypes = new Set<string>();
  const resolved = [];

  for (const slot of recommendation.slots) {
    const entry = byId.get(slot.catalogId);
    if (!entry) {
      throw new Error(`Invalid catalogId in recommendation: ${slot.catalogId}`);
    }
    if (seenArchetypes.has(entry.archetypeKey)) {
      throw new Error(
        `Duplicate archetype in recommendation: ${entry.archetypeKey}`,
      );
    }
    seenArchetypes.add(entry.archetypeKey);
    resolved.push(entry);
  }

  return recommendation;
}

export async function runRecommendRoster(
  brief: SessionBrief,
): Promise<RecommendRosterResult> {
  if (!isAiEnabled()) {
    return {
      recommendation: mockRecommendRoster(brief),
      mock: true,
    };
  }

  const catalog = buildLensCatalog();
  const prompt = fillPrompt(loadPrompt("recommend-roster.md"), {
    briefBlock: [
      `- Topic: ${brief.topic}`,
      `- Reader role: ${brief.role}`,
      `- Decision to inform: ${brief.decision}`,
      brief.context ? `- Additional context: ${brief.context}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    presetOptions: formatPresetOptionsForPrompt(),
    lensCatalog: formatLensCatalogForPrompt(catalog),
  });

  const system =
    "You are a research strategist. Return valid JSON only — no markdown fences or commentary outside the JSON object.";

  let lastError = "Unknown parse error";
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response failed validation: ${lastError}. Return corrected JSON matching the schema exactly.`;

    const { content, model, provider } = await completeJson({
      system,
      user,
      temperature: 0.3,
    });

    const parsed = parseJsonResponse(content, rosterRecommendationSchema);
    if (!parsed.ok) {
      lastError = parsed.error;
      continue;
    }

    try {
      const recommendation =
        parsed.data.recommendationType === "preset"
          ? validatePresetRecommendation(parsed.data)
          : validateCustomRecommendation(parsed.data);

      return { recommendation, mock: false, model, provider };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(`Failed to parse roster recommendation: ${lastError}`);
}

export function presetLabelForRecommendation(
  recommendation: RosterRecommendation,
): string | null {
  if (recommendation.recommendationType !== "preset" || !recommendation.presetId) {
    return null;
  }
  return (
    PERSPECTIVE_PRESETS.find((preset) => preset.id === recommendation.presetId)
      ?.label ?? recommendation.presetId
  );
}
