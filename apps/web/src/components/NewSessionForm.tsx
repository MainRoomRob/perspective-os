"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CLASSIC_PRESET,
  PERSPECTIVE_PRESETS,
  buildLensCatalog,
  type LensCatalogEntry,
  type PresetSlot,
} from "@perspective-os/core/presets-data";
import type { RosterRecommendation } from "@perspective-os/core";
import { slugFromPerspectiveName } from "@perspective-os/core";
import {
  createSession,
  recommendRosterAction,
} from "@perspective-os/web-server/actions";
import { CustomRosterBuilder } from "@/components/CustomRosterBuilder";
import { LensLibraryPanel } from "@/components/LensLibraryPanel";
import { RosterSuggestionPanel } from "@/components/RosterSuggestionPanel";
import {
  loadCustomRosterDraft,
  saveCustomRosterDraft,
} from "@/lib/custom-preset-storage";
import {
  customRosterFilledCount,
  customRosterIsComplete,
  customRosterSlots,
  EMPTY_CUSTOM_ROSTER,
  firstEmptyCustomRosterIndex,
  type CustomRoster,
  type RosterSlotAssignment,
} from "@/lib/custom-roster-types";

const CUSTOM_PRESET_ID = "custom";

function lensDisplayName(name: string): string {
  return name.replace(/^The /, "");
}

function ensureUniqueSlug(base: string, roster: CustomRoster): string {
  const used = new Set(customRosterSlots(roster).map((slot) => slot.id));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function canSuggestLenses(topic: string, role: string, decision: string): boolean {
  return topic.trim().length > 0 && role.trim().length > 0 && decision.trim().length > 0;
}

function PresetLensList({ slots }: { slots: PresetSlot[] }) {
  if (slots.length === 0) return null;

  return (
    <ul className="roster-preset-card__lenses" aria-label="Lenses in this pack">
      {slots.map((slot) => (
        <li key={slot.id}>{lensDisplayName(slot.name)}</li>
      ))}
    </ul>
  );
}

function RosterPractitionerPanel({
  label,
  slots,
  panelKey,
}: {
  label: string;
  slots: PresetSlot[];
  panelKey: string;
}) {
  return (
    <aside
      className="roster-practitioner-panel"
      aria-labelledby="roster-practitioner-panel-title"
      aria-live="polite"
    >
      <header className="roster-practitioner-panel__head stack-gap-2">
        <p className="text-label">{label}</p>
        <h2 id="roster-practitioner-panel-title" className="text-h3">
          Expert lenses
        </h2>
        <p className="text-caption text-muted">
          Each lens steers search and synthesis toward a distinct viewpoint.
        </p>
      </header>
      <ol key={panelKey} className="roster-practitioner-list">
        {slots.map((slot, index) => (
          <li key={slot.id} className="roster-practitioner">
            <span className="roster-practitioner__index text-caption text-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="roster-practitioner__body">
              <h3 className="roster-practitioner__name">{slot.name}</h3>
              <p className="text-body text-muted roster-practitioner__lens">
                {slot.lens}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function NewSessionForm() {
  const [topic, setTopic] = useState("");
  const [role, setRole] = useState("");
  const [decision, setDecision] = useState("");
  const [context, setContext] = useState("");
  const [presetId, setPresetId] = useState(CLASSIC_PRESET.id);
  const [customRoster, setCustomRoster] = useState<CustomRoster>([
    ...EMPTY_CUSTOM_ROSTER,
  ]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [recentlyAddedCatalogId, setRecentlyAddedCatalogId] = useState<
    string | null
  >(null);
  const [suggestion, setSuggestion] = useState<RosterRecommendation | null>(
    null,
  );
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestPending, startSuggestTransition] = useTransition();

  const showCustom = presetId === CUSTOM_PRESET_ID;
  const selectedPreset =
    PERSPECTIVE_PRESETS.find((p) => p.id === presetId) ?? CLASSIC_PRESET;
  const previewLabel = showCustom ? "Custom" : selectedPreset.label;
  const previewSlots = showCustom
    ? customRosterSlots(customRoster)
    : selectedPreset.slots;
  const previewKey = showCustom ? "custom" : presetId;
  const rosterComplete = customRosterIsComplete(customRoster);
  const suggestEnabled = canSuggestLenses(topic, role, decision);

  useEffect(() => {
    setCustomRoster(loadCustomRosterDraft());
  }, []);

  useEffect(() => {
    if (!showCustom) return;
    saveCustomRosterDraft(customRoster);
  }, [customRoster, showCustom]);

  useEffect(() => {
    if (!recentlyAddedCatalogId) return;
    const timer = window.setTimeout(() => setRecentlyAddedCatalogId(null), 600);
    return () => window.clearTimeout(timer);
  }, [recentlyAddedCatalogId]);

  function handlePresetChange(next: string) {
    setPresetId(next);
    if (next === CUSTOM_PRESET_ID) {
      setActiveSlotIndex(firstEmptyCustomRosterIndex(customRoster));
    }
  }

  function assignToSlot(
    index: number,
    assignment: RosterSlotAssignment,
  ): CustomRoster {
    const next = [...customRoster];
    next[index] = assignment;
    return next;
  }

  function resolveTargetSlotIndex(
    roster: CustomRoster,
    activeIndex: number,
  ): number {
    if (roster[activeIndex] == null) return activeIndex;
    const emptyIndex = roster.findIndex((slot) => slot == null);
    return emptyIndex === -1 ? activeIndex : emptyIndex;
  }

  function handleAssignCatalogEntry(entry: LensCatalogEntry) {
    const targetIndex = resolveTargetSlotIndex(customRoster, activeSlotIndex);
    const next = assignToSlot(targetIndex, {
      slot: {
        id: entry.id,
        name: entry.name,
        lens: entry.lens,
      },
      catalogId: entry.catalogId,
      sourcePresetLabel: entry.sourcePresetLabel,
    });
    setCustomRoster(next);
    setRecentlyAddedCatalogId(entry.catalogId);
    setActiveSlotIndex(firstEmptyCustomRosterIndex(next));
  }

  function handleCreateCustomLens(name: string, lens: string) {
    const baseId = slugFromPerspectiveName(name);
    const id = ensureUniqueSlug(baseId, customRoster);
    const targetIndex = resolveTargetSlotIndex(customRoster, activeSlotIndex);

    const next = assignToSlot(targetIndex, {
      slot: { id, name, lens },
      isCustom: true,
    });
    setCustomRoster(next);
    setActiveSlotIndex(firstEmptyCustomRosterIndex(next));
  }

  function handleClearSlot(index: number) {
    const next = [...customRoster];
    next[index] = null;
    setCustomRoster(next);
    setActiveSlotIndex(index);
  }

  function applySuggestion(recommendation: RosterRecommendation) {
    if (recommendation.recommendationType === "preset" && recommendation.presetId) {
      handlePresetChange(recommendation.presetId);
      setSuggestion(null);
      return;
    }

    if (recommendation.recommendationType === "custom" && recommendation.slots) {
      const catalog = buildLensCatalog();
      const byId = new Map(catalog.map((entry) => [entry.catalogId, entry]));
      const next: CustomRoster = recommendation.slots.map((slot) => {
        const entry = byId.get(slot.catalogId);
        if (!entry) return null;
        return {
          slot: {
            id: entry.id,
            name: entry.name,
            lens: entry.lens,
          },
          catalogId: entry.catalogId,
          sourcePresetLabel: entry.sourcePresetLabel,
        };
      });

      if (next.some((slot) => slot == null)) {
        setSuggestError("Could not apply suggestion — invalid catalog entries.");
        return;
      }

      setPresetId(CUSTOM_PRESET_ID);
      setCustomRoster(next);
      setActiveSlotIndex(0);
      setSuggestion(null);
    }
  }

  function handleSuggestLenses() {
    setSuggestError(null);
    startSuggestTransition(async () => {
      try {
        const result = await recommendRosterAction({
          topic: topic.trim(),
          role: role.trim(),
          decision: decision.trim(),
          context: context.trim() || undefined,
        });
        setSuggestion(result);
      } catch (err) {
        setSuggestion(null);
        setSuggestError(
          err instanceof Error ? err.message : "Could not suggest lenses",
        );
      }
    });
  }

  return (
    <div className="new-session-layout">
      <form action={createSession} className="card form-stack new-session-form">
        <label className="field">
          <span className="text-label">Topic</span>
          <span className="rule" />
          <input
            name="topic"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. AI agents in enterprise software"
          />
        </label>
        <label className="field">
          <span className="text-label">Your role</span>
          <span className="rule" />
          <input
            name="role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. VP Marketing at a B2B SaaS company"
          />
        </label>
        <label className="field">
          <span className="text-label">Decision to inform</span>
          <span className="rule" />
          <input
            name="decision"
            required
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            placeholder="e.g. Whether to reposition our product around agents vs. copilots"
          />
        </label>
        <div className="field">
          <label className="text-label" htmlFor="session-context">
            Additional context
          </label>
          <span className="rule" />
          <textarea
            id="session-context"
            name="context"
            rows={2}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Constraints, audience, timeframe, prior assumptions (optional)"
          />
        </div>

        <p className="text-caption text-muted">
          The decision field helps each lens focus on what you need to judge —
          not generic commentary on the topic.
        </p>

        <div className="roster-suggest-row action-row">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={!suggestEnabled || suggestPending}
            onClick={handleSuggestLenses}
          >
            {suggestPending ? "Suggesting lenses…" : "Suggest lenses"}
          </button>
        </div>

        {suggestError ? (
          <p className="form-status form-status--error">{suggestError}</p>
        ) : null}

        {suggestion ? (
          <RosterSuggestionPanel
            recommendation={suggestion}
            onApply={() => applySuggestion(suggestion)}
            onDismiss={() => setSuggestion(null)}
          />
        ) : null}

        <fieldset className="roster-fieldset">
          <legend className="text-label">Expert roster</legend>
          <div className="roster-preset-list">
            {PERSPECTIVE_PRESETS.map((preset) => (
              <label
                key={preset.id}
                className={`roster-preset-card${presetId === preset.id ? " is-selected radio--active" : " radio--inactive"}`}
              >
                <input
                  type="radio"
                  name="presetId"
                  value={preset.id}
                  checked={presetId === preset.id}
                  onChange={() => handlePresetChange(preset.id)}
                  className="sr-only"
                />
                <span className="radio__circle" aria-hidden="true" />
                <div className="roster-preset-card__body">
                  <span className="roster-preset-card__title">{preset.label}</span>
                  <PresetLensList slots={preset.slots} />
                </div>
              </label>
            ))}
            <label
              className={`roster-preset-card${presetId === CUSTOM_PRESET_ID ? " is-selected radio--active" : " radio--inactive"}`}
            >
              <input
                type="radio"
                name="presetId"
                value={CUSTOM_PRESET_ID}
                checked={presetId === CUSTOM_PRESET_ID}
                onChange={() => handlePresetChange(CUSTOM_PRESET_ID)}
                className="sr-only"
              />
              <span className="radio__circle" aria-hidden="true" />
              <div className="roster-preset-card__body">
                <span className="roster-preset-card__title">Custom</span>
                <p className="text-caption text-muted roster-preset-card__lead">
                  Build your roster from the full lens library
                </p>
                {showCustom ? (
                  <PresetLensList slots={previewSlots} />
                ) : null}
              </div>
            </label>
          </div>
        </fieldset>

        {showCustom ? (
          <CustomRosterBuilder
            roster={customRoster}
            activeSlotIndex={activeSlotIndex}
            onActiveSlotChange={setActiveSlotIndex}
            onClearSlot={handleClearSlot}
          />
        ) : null}

        <p className="text-caption text-muted">
          {showCustom
            ? `${customRosterFilledCount(customRoster)} of 5 lenses chosen — pick from the library on the right.`
            : "Five lenses per session — choose a preset or build a custom roster."}
        </p>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={showCustom && !rosterComplete}
        >
          Create session
        </button>
      </form>

      {showCustom ? (
        <LensLibraryPanel
          roster={customRoster}
          activeSlotIndex={activeSlotIndex}
          onAssignCatalogEntry={handleAssignCatalogEntry}
          onCreateCustomLens={handleCreateCustomLens}
          recentlyAddedCatalogId={recentlyAddedCatalogId}
        />
      ) : (
        <RosterPractitionerPanel
          label={previewLabel}
          slots={previewSlots}
          panelKey={previewKey}
        />
      )}
    </div>
  );
}
