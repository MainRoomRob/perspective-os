"use client";

import type { RosterRecommendation } from "@perspective-os/core";
import {
  PERSPECTIVE_PRESETS,
  buildLensCatalog,
} from "@perspective-os/core/presets-data";

function lensDisplayName(name: string): string {
  return name.replace(/^The /, "");
}

function recommendedLensNames(
  recommendation: RosterRecommendation,
): string[] {
  if (recommendation.recommendationType === "preset" && recommendation.presetId) {
    const preset = PERSPECTIVE_PRESETS.find((p) => p.id === recommendation.presetId);
    return preset?.slots.map((slot) => lensDisplayName(slot.name)) ?? [];
  }

  if (!recommendation.slots) return [];

  const catalog = buildLensCatalog();
  const byId = new Map(catalog.map((entry) => [entry.catalogId, entry]));
  return recommendation.slots.map((slot) => {
    const entry = byId.get(slot.catalogId);
    return entry ? lensDisplayName(entry.name) : slot.catalogId;
  });
}

export function RosterSuggestionPanel({
  recommendation,
  onApply,
  onDismiss,
}: {
  recommendation: RosterRecommendation;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const presetLabel =
    recommendation.recommendationType === "preset"
      ? PERSPECTIVE_PRESETS.find((p) => p.id === recommendation.presetId)?.label ??
        recommendation.presetId
      : null;
  const lensNames = recommendedLensNames(recommendation);

  return (
    <section className="roster-suggestion stack-gap-3" aria-live="polite">
      <p className="text-label">Suggested roster</p>
      <p className="text-body roster-suggestion__headline">
        {recommendation.recommendationType === "preset" && presetLabel
          ? `${presetLabel} pack`
          : "Custom mix"}
      </p>
      <p className="text-body text-muted">{recommendation.rationale}</p>

      {lensNames.length > 0 ? (
        <ul className="roster-suggestion__lenses">
          {lensNames.map((name, index) => (
            <li key={`${name}-${index}`}>
              <span className="roster-suggestion__lens-name">{name}</span>
              {recommendation.slotRationale?.[index] ? (
                <span className="text-caption text-muted roster-suggestion__lens-why">
                  {recommendation.slotRationale[index]}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="action-row">
        <button type="button" className="btn btn--primary btn--small" onClick={onApply}>
          Apply suggestion
        </button>
        <button type="button" className="btn btn--secondary btn--small" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </section>
  );
}
