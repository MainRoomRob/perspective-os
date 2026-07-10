"use client";

import { useMemo, useState } from "react";
import {
  buildLensCatalog,
  groupLensCatalogByArchetype,
  type LensCatalogEntry,
} from "@perspective-os/core/presets-data";
import type { CustomRoster } from "@/lib/custom-roster-types";
import {
  customRosterFilledCount,
  customRosterSlots,
} from "@/lib/custom-roster-types";

function lensDisplayName(name: string): string {
  return name.replace(/^The /, "");
}

function framingLabel(sourcePresetLabel: string): string {
  return `${sourcePresetLabel} framing`;
}

function rosterCatalogIds(roster: CustomRoster): Set<string> {
  const ids = new Set<string>();
  for (const assignment of roster) {
    if (assignment?.catalogId) ids.add(assignment.catalogId);
  }
  return ids;
}

function rosterArchetypeKeys(
  roster: CustomRoster,
  catalogById: Map<string, LensCatalogEntry>,
): Set<string> {
  const keys = new Set<string>();
  for (const assignment of roster) {
    if (!assignment?.catalogId) continue;
    const entry = catalogById.get(assignment.catalogId);
    if (entry) keys.add(entry.archetypeKey);
  }
  return keys;
}

function VariantAddButton({
  entry,
  inRoster,
  siblingBlocked,
  onAssign,
}: {
  entry: LensCatalogEntry;
  inRoster: boolean;
  siblingBlocked: boolean;
  onAssign: (entry: LensCatalogEntry) => void;
}) {
  const disabled = inRoster || siblingBlocked;
  let label = "Add";
  if (inRoster) label = "Added";
  else if (siblingBlocked) label = "Already on roster";

  return (
    <button
      type="button"
      className="btn btn--secondary btn--small"
      disabled={disabled}
      onClick={() => onAssign(entry)}
      aria-disabled={disabled}
    >
      {label}
    </button>
  );
}

function ArchetypeVariantRow({
  entry,
  inRoster,
  siblingBlocked,
  justAdded,
  onAssign,
}: {
  entry: LensCatalogEntry;
  inRoster: boolean;
  siblingBlocked: boolean;
  justAdded: boolean;
  onAssign: (entry: LensCatalogEntry) => void;
}) {
  return (
    <li
      className={`lens-archetype-variant${inRoster ? " is-in-roster" : ""}${justAdded ? " is-just-added" : ""}`}
    >
      <div className="lens-archetype-variant__body">
        <p className="text-caption text-muted lens-archetype-variant__pack">
          {framingLabel(entry.sourcePresetLabel)}
        </p>
        <p className="text-caption text-muted lens-archetype-variant__lens">
          {entry.lens}
        </p>
      </div>
      <VariantAddButton
        entry={entry}
        inRoster={inRoster}
        siblingBlocked={siblingBlocked}
        onAssign={onAssign}
      />
    </li>
  );
}

function CustomRosterPreview({ roster }: { roster: CustomRoster }) {
  const filled = customRosterSlots(roster);
  if (filled.length === 0) return null;

  return (
    <section className="lens-library-panel__preview" aria-label="Your roster preview">
      <p className="text-label">Your roster</p>
      <ol className="roster-practitioner-list roster-practitioner-list--compact">
        {filled.map((slot, index) => (
          <li key={`${slot.id}-${index}`} className="roster-practitioner">
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
    </section>
  );
}

export function LensLibraryPanel({
  roster,
  activeSlotIndex,
  onAssignCatalogEntry,
  onCreateCustomLens,
  recentlyAddedCatalogId,
}: {
  roster: CustomRoster;
  activeSlotIndex: number;
  onAssignCatalogEntry: (entry: LensCatalogEntry) => void;
  onCreateCustomLens: (name: string, lens: string) => void;
  recentlyAddedCatalogId: string | null;
}) {
  const catalog = useMemo(() => buildLensCatalog(), []);
  const catalogById = useMemo(
    () => new Map(catalog.map((entry) => [entry.catalogId, entry])),
    [catalog],
  );
  const groups = useMemo(() => groupLensCatalogByArchetype(catalog), [catalog]);
  const usedCatalogIds = useMemo(() => rosterCatalogIds(roster), [roster]);
  const usedArchetypeKeys = useMemo(
    () => rosterArchetypeKeys(roster, catalogById),
    [roster, catalogById],
  );
  const filledCount = customRosterFilledCount(roster);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customLens, setCustomLens] = useState("");

  function handleCreateCustomLens(event: React.FormEvent) {
    event.preventDefault();
    const name = customName.trim();
    const lens = customLens.trim();
    if (!name || !lens) return;
    onCreateCustomLens(name, lens);
    setCustomName("");
    setCustomLens("");
    setShowCreateForm(false);
  }

  function variantState(entry: LensCatalogEntry) {
    const inRoster = usedCatalogIds.has(entry.catalogId);
    const siblingBlocked =
      !inRoster && usedArchetypeKeys.has(entry.archetypeKey);
    const justAdded = recentlyAddedCatalogId === entry.catalogId;
    return { inRoster, siblingBlocked, justAdded };
  }

  return (
    <aside
      className="roster-practitioner-panel lens-library-panel"
      aria-labelledby="lens-library-panel-title"
    >
      <header className="roster-practitioner-panel__head stack-gap-2">
        <p className="text-label">Custom · {filledCount} / 5</p>
        <h2 id="lens-library-panel-title" className="text-h3">
          Lens library
        </h2>
        <p className="text-caption text-muted">
          Assigning to slot {activeSlotIndex + 1}. Each expert may have
          different framings depending on the pack they came from — pick the one
          that fits your topic.
        </p>
      </header>

      <CustomRosterPreview roster={roster} />

      <div className="lens-archetype-groups">
        {groups.map((group) => {
          const isMultiVariant = group.variants.length > 1;
          const single = group.variants[0]!;

          if (!isMultiVariant) {
            const { inRoster, siblingBlocked, justAdded } = variantState(single);

            return (
              <section
                key={group.archetypeKey}
                className={`lens-archetype-group lens-archetype-group--single${justAdded ? " is-just-added" : ""}${inRoster ? " is-in-roster" : ""}`}
              >
                <div className="lens-archetype-group__body">
                  <h3 className="lens-archetype-group__name">
                    {lensDisplayName(group.name)}
                  </h3>
                  <p className="text-caption text-muted lens-archetype-group__lens">
                    {single.lens}
                  </p>
                </div>
                <VariantAddButton
                  entry={single}
                  inRoster={inRoster}
                  siblingBlocked={siblingBlocked}
                  onAssign={onAssignCatalogEntry}
                />
              </section>
            );
          }

          return (
            <section key={group.archetypeKey} className="lens-archetype-group">
              <header className="lens-archetype-group__head">
                <h3 className="lens-archetype-group__name">
                  {lensDisplayName(group.name)}
                </h3>
                <p className="text-caption text-muted lens-archetype-group__meta">
                  {group.variants.length} framings
                </p>
              </header>
              <ul className="lens-archetype-group__variants">
                {group.variants.map((entry) => {
                  const { inRoster, siblingBlocked, justAdded } =
                    variantState(entry);

                  return (
                    <ArchetypeVariantRow
                      key={entry.catalogId}
                      entry={entry}
                      inRoster={inRoster}
                      siblingBlocked={siblingBlocked}
                      justAdded={justAdded}
                      onAssign={onAssignCatalogEntry}
                    />
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="lens-library-create">
        {showCreateForm ? (
          <form
            className="lens-library-create__form stack-gap-3"
            onSubmit={handleCreateCustomLens}
          >
            <p className="text-label">Create custom lens</p>
            <div className="field">
              <label className="text-label" htmlFor="custom-lens-name">
                Name
              </label>
              <span className="rule" />
              <input
                id="custom-lens-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. The Journalist"
                required
              />
            </div>
            <div className="field">
              <label className="text-label" htmlFor="custom-lens-description">
                Lens description
              </label>
              <span className="rule" />
              <textarea
                id="custom-lens-description"
                rows={2}
                value={customLens}
                onChange={(e) => setCustomLens(e.target.value)}
                placeholder="What should this lens prioritise?"
                required
              />
            </div>
            <div className="action-row">
              <button type="submit" className="btn btn--primary btn--small">
                Add to slot {activeSlotIndex + 1}
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="btn btn--secondary lens-library-create__toggle"
            onClick={() => setShowCreateForm(true)}
          >
            + Create custom lens
          </button>
        )}
      </div>
    </aside>
  );
}
