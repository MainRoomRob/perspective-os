import type { PresetSlot } from "@perspective-os/core/presets-data";
import type { CustomRoster, RosterSlotAssignment } from "./custom-roster-types";
import { EMPTY_CUSTOM_ROSTER } from "./custom-roster-types";

export const CUSTOM_PRESET_STORAGE_KEY = "perspective-os-custom-preset";

type StoredRosterSlot = PresetSlot & {
  catalogId?: string;
  sourcePresetLabel?: string;
  isCustom?: boolean;
};

function toStoredRoster(roster: CustomRoster): (StoredRosterSlot | null)[] {
  return roster.map((assignment) =>
    assignment
      ? {
          ...assignment.slot,
          catalogId: assignment.catalogId,
          sourcePresetLabel: assignment.sourcePresetLabel,
          isCustom: assignment.isCustom,
        }
      : null,
  );
}

function fromStoredRoster(stored: (StoredRosterSlot | null)[]): CustomRoster {
  if (stored.length !== 5) return [...EMPTY_CUSTOM_ROSTER];
  return stored.map((item) =>
    item
      ? {
          slot: {
            id: item.id,
            name: item.name,
            lens: item.lens,
          },
          catalogId: item.catalogId,
          sourcePresetLabel: item.sourcePresetLabel,
          isCustom: item.isCustom,
        }
      : null,
  );
}

/** @deprecated Use loadCustomRosterDraft — kept for MissingPerspectiveExplore save flow. */
export function loadCustomPresetDraft(): PresetSlot[] | null {
  const roster = loadCustomRosterDraft();
  if (!roster.every(Boolean)) return null;
  return roster.map((assignment) => assignment!.slot);
}

export function loadCustomRosterDraft(): CustomRoster {
  if (typeof window === "undefined") return [...EMPTY_CUSTOM_ROSTER];
  try {
    const raw = localStorage.getItem(CUSTOM_PRESET_STORAGE_KEY);
    if (!raw) return [...EMPTY_CUSTOM_ROSTER];
    const parsed = JSON.parse(raw) as (StoredRosterSlot | null)[];
    return fromStoredRoster(parsed);
  } catch {
    return [...EMPTY_CUSTOM_ROSTER];
  }
}

export function saveCustomPresetDraft(slots: PresetSlot[]): void {
  const roster: CustomRoster = slots.map((slot) => ({ slot, isCustom: true }));
  saveCustomRosterDraft(roster);
}

export function saveCustomRosterDraft(roster: CustomRoster): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    CUSTOM_PRESET_STORAGE_KEY,
    JSON.stringify(toStoredRoster(roster)),
  );
}
