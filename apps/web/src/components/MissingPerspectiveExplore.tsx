"use client";

import { useCallback, useState, useTransition } from "react";
import type {
  BriefingDelta,
  PeerReviewOutput,
  SessionExtras,
  SupplementaryExpertPerspective,
} from "@perspective-os/core";
import type { PerspectiveSlot } from "@perspective-os/core";
import {
  exploreMissingPerspectiveAction,
  rerunWithMissingPerspectiveAction,
} from "@perspective-os/web-server/actions";
import { useRefreshRouter } from "@/shell/RefreshProvider";
import { AiOperationProgress } from "./AiOperationProgress";
import { SupplementaryPerspectivePanel } from "./SupplementaryPerspectivePanel";
import { BriefingDeltaView } from "./BriefingDeltaView";
import { OutputSection } from "./output/OutputPrimitives";

import { loadCustomPresetDraft, saveCustomPresetDraft } from "@/lib/custom-preset-storage";

export function MissingPerspectiveExplore({
  sessionId,
  output,
  sessionExtras,
  perspectiveConfig,
}: {
  sessionId: string;
  output: PeerReviewOutput;
  sessionExtras: SessionExtras | null;
  perspectiveConfig: PerspectiveSlot[] | null;
}) {
  const { refresh } = useRefreshRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [replaceSlot, setReplaceSlot] = useState(2);

  const built = sessionExtras?.supplementaryPerspective ?? null;
  const delta = sessionExtras?.briefingDelta ?? null;

  const explore = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        await exploreMissingPerspectiveAction(sessionId);
        refresh({ overlay: false });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Explore failed");
      }
    });
  }, [refresh, sessionId]);

  const saveToCustomPreset = useCallback(() => {
    if (!built) return;
    const roster = perspectiveConfig ?? [];
    const slots =
      roster.length === 5
        ? roster.map((s) => ({ ...s }))
        : [];
    while (slots.length < 5) {
      slots.push({
        id: `lens-${slots.length + 1}`,
        name: `Lens ${slots.length + 1}`,
        lens: "",
      });
    }
    slots[0] = {
      id: built.id,
      name: built.name,
      lens: built.corePosition.slice(0, 500),
    };
    saveCustomPresetDraft(slots);
    alert("Saved to custom preset draft — select Custom on your next session.");
  }, [built, perspectiveConfig]);

  const rerunWithLens = useCallback(() => {
    if (
      !confirm(
        `Replace lens ${replaceSlot + 1} and re-run from Scan? This clears all step outputs.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await rerunWithMissingPerspectiveAction(sessionId, replaceSlot);
        refresh({ overlay: false });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Re-run failed");
      }
    });
  }, [refresh, replaceSlot, sessionId]);

  const rosterSlots = perspectiveConfig?.length === 5 ? perspectiveConfig : null;

  return (
    <>
      <AiOperationProgress
        operation="research-explore-missing"
        variant="overlay"
        isActive={pending}
        extendVisible={pending}
        extendMessage="Loading results…"
      />

      <OutputSection
        title="Missing perspective"
        tier="muted"
        className="output-block--missing-perspective"
      >
        <p className="missing-perspective__name text-body">
          {output.missingPerspective.perspective}
        </p>
        <p className="text-caption text-muted">
          {output.missingPerspective.howItWouldChange}
        </p>

        <div className="action-row">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={pending}
            onClick={explore}
          >
            {built ? "Re-explore this perspective" : "Explore this perspective"}
          </button>
        </div>

        {error ? <p className="form-status--error">{error}</p> : null}
      </OutputSection>

      {built && delta ? (
        <div className="stack-gap-6">
          <SupplementaryPerspectivePanel perspective={built} />
          <BriefingDeltaView delta={delta} />
          <section className="supplementary-actions" aria-labelledby="supplementary-actions-title">
            <p id="supplementary-actions-title" className="text-label">
              Apply this lens
            </p>
            <p className="text-caption text-muted supplementary-actions__lead">
              Save it for a future session, or swap it into your roster and
              re-run from Scan.
            </p>

            <div className="supplementary-actions__rerun">
              <p className="text-body supplementary-actions__rerun-title">
                Re-run Scan with this lens
              </p>
              <p className="text-caption text-muted">
                Clears all step outputs and replaces one slot in your current
                roster.
              </p>
              <div className="supplementary-actions__rerun-row">
                <label className="field supplementary-actions__slot-field">
                  <span className="text-label">Replace roster slot</span>
                  <span className="rule" />
                  <select
                    value={replaceSlot}
                    onChange={(e) => setReplaceSlot(Number(e.target.value))}
                    disabled={pending}
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {rosterSlots?.[n]?.name
                          ? `Slot ${n + 1} — ${rosterSlots[n].name}`
                          : `Slot ${n + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn--primary supplementary-actions__rerun-btn"
                  disabled={pending}
                  onClick={rerunWithLens}
                >
                  Re-run Scan
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn--text supplementary-actions__save"
              disabled={pending}
              onClick={saveToCustomPreset}
            >
              Save to custom preset (next session)
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
