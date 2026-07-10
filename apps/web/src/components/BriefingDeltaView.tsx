import type { BriefingDelta } from "@perspective-os/core";
import {
  OutputLead,
  OutputSection,
  PerspectiveTags,
} from "./output/OutputPrimitives";

const IMPACT_LABELS: Record<
  BriefingDelta["findingChallenges"][number]["impact"],
  string
> = {
  undermined: "Undermined",
  qualified: "Qualified",
  unchanged: "Unchanged",
};

export function BriefingDeltaView({ delta }: { delta: BriefingDelta }) {
  return (
    <div className="output-reading stack-gap-6 briefing-delta">
      <OutputLead label="What changes" tier="critical">
        {delta.summary}
      </OutputLead>

      <OutputSection
        title="Finding impact"
        lead="How the new lens affects each Briefing finding."
        tier="primary"
      >
        <div className="stack-gap-3">
          {delta.findingChallenges
            .sort((a, b) => a.findingIndex - b.findingIndex)
            .map((challenge) => (
              <article
                key={challenge.findingIndex}
                className={`finding-challenge finding-challenge--${challenge.impact}`}
              >
                <div className="finding-challenge__head">
                  <span className="text-label">
                    Finding {challenge.findingIndex + 1}
                  </span>
                  <span
                    className={`verdict-badge verdict-badge--${challenge.impact === "unchanged" ? "holds" : challenge.impact === "qualified" ? "conditional" : "unsupported"}`}
                  >
                    {IMPACT_LABELS[challenge.impact]}
                  </span>
                </div>
                <p className="text-caption text-muted">{challenge.reason}</p>
              </article>
            ))}
        </div>
      </OutputSection>

      {delta.newTensions.length > 0 ? (
        <OutputSection title="New tensions" tier="secondary">
          <div className="stack-gap-3">
            {delta.newTensions.map((t) => (
              <div key={`${t.withPerspective}-${t.tension}`}>
                <PerspectiveTags names={[t.withPerspective]} />
                <p className="text-body">{t.tension}</p>
              </div>
            ))}
          </div>
        </OutputSection>
      ) : null}

      <OutputLead label="Revised actionable insight" tier="action">
        {delta.revisedActionableInsight}
      </OutputLead>

      <OutputSection title="Residual uncertainty" tier="muted">
        <p className="text-body">{delta.residualUncertainty}</p>
      </OutputSection>
    </div>
  );
}
