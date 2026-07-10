import type { PresetSlot } from "@perspective-os/core/presets-data";

export type RosterSlotAssignment = {
  slot: PresetSlot;
  catalogId?: string;
  sourcePresetLabel?: string;
  isCustom?: boolean;
};

export type CustomRoster = (RosterSlotAssignment | null)[];

export const EMPTY_CUSTOM_ROSTER: CustomRoster = [
  null,
  null,
  null,
  null,
  null,
];

export function customRosterFilledCount(roster: CustomRoster): number {
  return roster.filter(Boolean).length;
}

export function customRosterIsComplete(roster: CustomRoster): boolean {
  return customRosterFilledCount(roster) === 5;
}

export function customRosterSlots(roster: CustomRoster): PresetSlot[] {
  return roster.flatMap((assignment) => (assignment ? [assignment.slot] : []));
}

export function firstEmptyCustomRosterIndex(roster: CustomRoster): number {
  const index = roster.findIndex((slot) => slot == null);
  return index === -1 ? 0 : index;
}
