"use client";

import type { CustomRoster } from "@/lib/custom-roster-types";
import {
  customRosterFilledCount,
  customRosterIsComplete,
} from "@/lib/custom-roster-types";

function lensDisplayName(name: string): string {
  return name.replace(/^The /, "");
}

export function CustomRosterBuilder({
  roster,
  activeSlotIndex,
  onActiveSlotChange,
  onClearSlot,
}: {
  roster: CustomRoster;
  activeSlotIndex: number;
  onActiveSlotChange: (index: number) => void;
  onClearSlot: (index: number) => void;
}) {
  const filledCount = customRosterFilledCount(roster);
  const rosterComplete = customRosterIsComplete(roster);

  return (
    <div className="custom-roster-builder stack-gap-3">
      <p className="text-label">Your roster ({filledCount} / 5)</p>
      <ol className="custom-roster-slots" aria-label="Custom roster slots">
        {roster.map((assignment, index) => {
          const isActive = activeSlotIndex === index;
          const isFilled = assignment != null;

          return (
            <li key={index}>
              <div
                className={`custom-roster-slot${isActive ? " is-active" : ""}${isFilled ? " is-filled" : " is-empty"}`}
              >
                <button
                  type="button"
                  className="custom-roster-slot__select"
                  aria-pressed={isActive}
                  aria-label={
                    isFilled
                      ? `Slot ${index + 1}: ${assignment.slot.name}. ${isActive ? "Selected" : "Select to assign a lens here"}`
                      : `Slot ${index + 1}: empty. ${isActive ? "Selected" : "Select to assign a lens here"}`
                  }
                  onClick={() => onActiveSlotChange(index)}
                >
                  <span className="custom-roster-slot__index text-caption text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="custom-roster-slot__body">
                    {isFilled ? (
                      <>
                        <span className="custom-roster-slot__name">
                          {lensDisplayName(assignment.slot.name)}
                        </span>
                        {assignment.sourcePresetLabel ? (
                          <span className="custom-roster-slot__source text-caption text-muted">
                            {assignment.sourcePresetLabel} framing
                          </span>
                        ) : assignment.isCustom ? (
                          <span className="custom-roster-slot__source text-caption text-muted">
                            Custom lens
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="custom-roster-slot__placeholder text-muted">
                        Choose a lens
                      </span>
                    )}
                  </span>
                </button>
                {isFilled ? (
                  <button
                    type="button"
                    className="custom-roster-slot__clear text-caption text-muted"
                    aria-label={`Remove lens from slot ${index + 1}`}
                    onClick={() => onClearSlot(index)}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {!rosterComplete ? (
        <p className="text-caption text-muted custom-roster-builder__hint">
          Pick 5 lenses from the library →
        </p>
      ) : null}

      {roster.map((assignment, index) =>
        assignment ? (
          <span key={`fields-${index}`} hidden>
            <input
              type="hidden"
              name={`slot_${index}_id`}
              value={assignment.slot.id}
            />
            <input
              type="hidden"
              name={`slot_${index}_name`}
              value={assignment.slot.name}
            />
            <input
              type="hidden"
              name={`slot_${index}_lens`}
              value={assignment.slot.lens}
            />
          </span>
        ) : null,
      )}
    </div>
  );
}
