import { z } from "zod";
import type { ExpertId } from "./schemas";
import { EXPERT_IDS, perspectiveSlugSchema } from "./schemas";
import {
  CLASSIC_PRESET,
  PERSPECTIVE_PRESETS,
  POLICY_PRESET,
  PRODUCT_GTM_PRESET,
  type PresetDefinition,
} from "./presets-data";

export {
  CLASSIC_PRESET,
  PERSPECTIVE_PRESETS,
  POLICY_PRESET,
  PRODUCT_GTM_PRESET,
};
export type {
  PresetDefinition,
  PresetSlot,
  LensCatalogEntry,
  LensArchetypeGroup,
} from "./presets-data";
export {
  buildLensCatalog,
  groupLensCatalogByPreset,
  groupLensCatalogByArchetype,
  normalizeArchetypeKey,
} from "./presets-data";

export const perspectiveSlotSchema = z.object({
  id: perspectiveSlugSchema,
  name: z.string().min(1).max(80),
  lens: z.string().min(1).max(500),
});

export type PerspectiveSlot = z.infer<typeof perspectiveSlotSchema>;

export const perspectivePresetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  slots: z.array(perspectiveSlotSchema).length(5),
});

export type PerspectivePreset = z.infer<typeof perspectivePresetSchema>;

export function getPresetById(id: string): PresetDefinition | undefined {
  return PERSPECTIVE_PRESETS.find((p) => p.id === id);
}

export function resolvePerspectiveConfig(
  config: PerspectiveSlot[] | null | undefined,
): PerspectiveSlot[] {
  return config?.length === 5 ? config : CLASSIC_PRESET.slots;
}

export function formatPerspectiveRoster(slots: PerspectiveSlot[]): string {
  return slots
    .map(
      (slot, i) =>
        `${i + 1}. **${slot.id}** — ${slot.name}. ${slot.lens}`,
    )
    .join("\n");
}

export function perspectiveLabelForId(
  id: string,
  config: PerspectiveSlot[] | null | undefined,
): string {
  const slots = resolvePerspectiveConfig(config);
  const match = slots.find((s) => s.id === id);
  if (match) return match.name;
  const classic = CLASSIC_PRESET.slots.find((s) => s.id === id);
  if (classic) return classic.name;
  return id;
}

export function isKnownExpertId(id: string): id is ExpertId {
  return (EXPERT_IDS as readonly string[]).includes(id);
}

export function slugFromPerspectiveName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base.length > 0 ? base : "missing-lens";
}
