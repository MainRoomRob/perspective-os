/** Pure preset data — safe for client imports (no Zod / schema deps). */

export type PresetSlot = {
  id: string;
  name: string;
  lens: string;
};

export type PresetDefinition = {
  id: string;
  label: string;
  slots: PresetSlot[];
};

export const CLASSIC_PRESET: PresetDefinition = {
  id: "classic",
  label: "Classic five",
  slots: [
    {
      id: "practitioner",
      name: "The Practitioner",
      lens:
        "Someone who works with this every day. Prefer industry surveys, practitioner case studies, vendor reports, and operational data.",
    },
    {
      id: "academic",
      name: "The Academic",
      lens:
        "Someone who has spent years researching this field. Prefer peer-reviewed studies, meta-analyses, and university publications.",
    },
    {
      id: "skeptic",
      name: "The Skeptic",
      lens:
        "Someone who believes the mainstream view is incomplete or wrong. Prefer contrarian analyses, replication failures, and critical reviews.",
    },
    {
      id: "economist",
      name: "The Economist",
      lens:
        "Someone who follows incentives and financial flows. Prefer market data, filings, industry economics reports, and incentive analyses.",
    },
    {
      id: "historian",
      name: "The Historian",
      lens:
        "Someone who has studied how similar situations evolved over time. Prefer historical case studies, archival research, and long-run comparisons.",
    },
  ],
};

export const POLICY_PRESET: PresetDefinition = {
  id: "policy-regulation",
  label: "Policy & regulation",
  slots: [
    {
      id: "regulator",
      name: "The Regulator",
      lens:
        "Focus on compliance timelines, permissible claims, enforcement patterns, and regulatory filings.",
    },
    {
      id: "industry-lobbyist",
      name: "The Industry lobbyist",
      lens:
        "Focus on how incumbents shape rules, lobbying disclosures, and policy capture.",
    },
    {
      id: "public-interest-lawyer",
      name: "The Public interest lawyer",
      lens:
        "Focus on consumer protection, litigation trends, and rights-based constraints.",
    },
    {
      id: "economist",
      name: "The Economist",
      lens:
        "Focus on market structure, incentive misalignment, and fiscal or industrial policy effects.",
    },
    {
      id: "practitioner",
      name: "The Practitioner",
      lens:
        "Focus on operational compliance burden and on-the-ground implementation reality.",
    },
  ],
};

export const PRODUCT_GTM_PRESET: PresetDefinition = {
  id: "product-gtm",
  label: "Product & GTM",
  slots: [
    {
      id: "end-user",
      name: "The Customer / user",
      lens:
        "Focus on jobs-to-be-done, adoption friction, switching costs, and user research.",
    },
    {
      id: "competitor-analyst",
      name: "The Competitor analyst",
      lens:
        "Focus on positioning maps, win/loss patterns, and competitive moats.",
    },
    {
      id: "sales-leader",
      name: "The Sales leader",
      lens:
        "Focus on deal cycles, objections, pipeline reality, and buyer committees.",
    },
    {
      id: "product-manager",
      name: "The Product manager",
      lens:
        "Focus on roadmap trade-offs, discovery evidence, and outcome metrics.",
    },
    {
      id: "skeptic",
      name: "The Skeptic",
      lens:
        "Focus on hype cycles, failed launches, and claims that do not survive contact with buyers.",
    },
  ],
};

export const PERSPECTIVE_PRESETS: PresetDefinition[] = [
  CLASSIC_PRESET,
  POLICY_PRESET,
  PRODUCT_GTM_PRESET,
];

export function getPresetByIdFromData(id: string): PresetDefinition | undefined {
  return PERSPECTIVE_PRESETS.find((p) => p.id === id);
}

export type LensCatalogEntry = PresetSlot & {
  catalogId: string;
  archetypeKey: string;
  sourcePresetId: string;
  sourcePresetLabel: string;
};

export type LensArchetypeGroup = {
  archetypeKey: string;
  name: string;
  variants: LensCatalogEntry[];
};

/** Unique session slugs when the same archetype id appears in multiple packs. */
const CATALOG_VARIANT_SLUGS: Record<string, string> = {
  "policy-regulation:economist": "economist-policy",
  "policy-regulation:practitioner": "practitioner-policy",
  "product-gtm:skeptic": "skeptic-gtm",
};

export function normalizeArchetypeKey(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base.length > 0 ? base : "archetype";
}

function catalogSessionId(presetId: string, slotId: string): string {
  return CATALOG_VARIANT_SLUGS[`${presetId}:${slotId}`] ?? slotId;
}

export function buildLensCatalog(): LensCatalogEntry[] {
  return PERSPECTIVE_PRESETS.flatMap((preset) =>
    preset.slots.map((slot) => ({
      catalogId: `${preset.id}:${slot.id}`,
      archetypeKey: normalizeArchetypeKey(slot.name),
      sourcePresetId: preset.id,
      sourcePresetLabel: preset.label,
      id: catalogSessionId(preset.id, slot.id),
      name: slot.name,
      lens: slot.lens,
    })),
  );
}

export function groupLensCatalogByPreset(
  catalog: LensCatalogEntry[],
): { presetId: string; presetLabel: string; entries: LensCatalogEntry[] }[] {
  return PERSPECTIVE_PRESETS.map((preset) => ({
    presetId: preset.id,
    presetLabel: preset.label,
    entries: catalog.filter((entry) => entry.sourcePresetId === preset.id),
  }));
}

export function groupLensCatalogByArchetype(
  catalog: LensCatalogEntry[],
): LensArchetypeGroup[] {
  const presetOrder = new Map(
    PERSPECTIVE_PRESETS.map((preset, index) => [preset.id, index]),
  );
  const byKey = new Map<string, LensCatalogEntry[]>();

  for (const entry of catalog) {
    const variants = byKey.get(entry.archetypeKey) ?? [];
    variants.push(entry);
    byKey.set(entry.archetypeKey, variants);
  }

  const groups: LensArchetypeGroup[] = [];
  for (const [archetypeKey, variants] of byKey) {
    variants.sort(
      (a, b) =>
        (presetOrder.get(a.sourcePresetId) ?? 0) -
        (presetOrder.get(b.sourcePresetId) ?? 0),
    );
    groups.push({
      archetypeKey,
      name: variants[0]!.name,
      variants,
    });
  }

  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

export function formatLensCatalogForPrompt(catalog: LensCatalogEntry[]): string {
  const groups = groupLensCatalogByArchetype(catalog);

  return groups
    .map((group) => {
      if (group.variants.length === 1) {
        const entry = group.variants[0]!;
        return `- **${entry.name}** (\`catalogId\`: \`${entry.catalogId}\`, slug: \`${entry.id}\`)\n  ${entry.lens}`;
      }

      const variantLines = group.variants
        .map(
          (entry) =>
            `  - **${entry.sourcePresetLabel} framing** (\`catalogId\`: \`${entry.catalogId}\`, slug: \`${entry.id}\`)\n    ${entry.lens}`,
        )
        .join("\n");

      return `### ${group.name}\n${variantLines}`;
    })
    .join("\n\n");
}

export function formatPresetOptionsForPrompt(): string {
  return PERSPECTIVE_PRESETS.map(
    (preset) => `- \`${preset.id}\`: ${preset.label}`,
  ).join("\n");
}
