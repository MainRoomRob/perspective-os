import type { PerspectiveSlot } from "@perspective-os/core";

export function PerspectiveRosterTags({ slots }: { slots: PerspectiveSlot[] }) {
  return (
    <div className="layout-brief__tags session-roster-tags" aria-label="Expert roster">
      {slots.map((slot) => (
        <span key={slot.id} className="layout-brief__tag">
          {slot.name.replace(/^The /, "")}
        </span>
      ))}
    </div>
  );
}
