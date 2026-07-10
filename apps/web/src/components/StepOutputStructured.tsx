import type {
  ContradictionMapOutput,
  ExpertPerspective,
  MultiPerspectiveOutput,
  PeerReviewOutput,
  ResearchStep,
  SessionExtras,
  SynthesisOutput,
} from "@perspective-os/core";
import type { PerspectiveSlot } from "@perspective-os/core";
import { computeFindingAuditConfidencePercent, resolveConfidenceFindingTitle } from "@perspective-os/core";
import { ConfidenceBarsMeter } from "./meters/ConfidenceBarsMeter";
import { EvidenceRankMeter } from "./meters/EvidenceRankMeter";
import { GradeArcMeter } from "./meters/GradeArcMeter";
import { MissingPerspectiveExplore } from "./MissingPerspectiveExplore";
import {
  ConsensusList,
  EvidenceList,
  FindingAuditList,
  FindingProvenance,
  OutputField,
  OutputLead,
  OutputSection,
  PerspectiveTags,
  RankedItem,
  ReliabilityMeter,
  SourceLinkList,
  SourceRefTags,
} from "./output/OutputPrimitives";

const DEFAULT_GROUNDING_NOTE =
  "Sources are model-identified references — verify before citing externally.";

function hasGroundedEvidence(perspective: ExpertPerspective): boolean {
  return (
    perspective.evidencePoints != null &&
    perspective.sources != null &&
    perspective.evidencePoints.length > 0 &&
    perspective.sources.length > 0
  );
}

export function StepOutputStructured({
  step,
  output,
  synthesisOutput,
  sessionId,
  sessionExtras,
  perspectiveConfig,
}: {
  step: ResearchStep;
  output:
    | MultiPerspectiveOutput
    | ContradictionMapOutput
    | SynthesisOutput
    | PeerReviewOutput;
  synthesisOutput?: SynthesisOutput;
  sessionId?: string;
  sessionExtras?: SessionExtras | null;
  perspectiveConfig?: PerspectiveSlot[] | null;
}) {
  switch (step) {
    case 1:
      return <Step1View output={output as MultiPerspectiveOutput} />;
    case 2:
      return <Step2View output={output as ContradictionMapOutput} />;
    case 3:
      return <Step3View output={output as SynthesisOutput} />;
    case 4:
      return (
        <Step4View
          output={output as PeerReviewOutput}
          synthesisOutput={synthesisOutput}
          sessionId={sessionId}
          sessionExtras={sessionExtras}
          perspectiveConfig={perspectiveConfig}
        />
      );
    default:
      return null;
  }
}

function Step1View({ output }: { output: MultiPerspectiveOutput }) {
  const showDisclaimer = output.perspectives.some(hasGroundedEvidence);

  return (
    <div className="output-reading">
      {output.perspectives.map((p) => (
        <article key={p.id} className="expert-panel">
          <header className="expert-panel__head">
            <h3 className="text-h4">{p.name}</h3>
          </header>
          <div className="expert-panel__body stack-gap-4">
            <OutputField label="Core position">{p.corePosition}</OutputField>
            {hasGroundedEvidence(p) ? (
              <>
                <div className="output-field">
                  <p className="text-label output-field__label">Evidence</p>
                  <EvidenceList
                    evidencePoints={p.evidencePoints!}
                    sources={p.sources!}
                  />
                </div>
                <div className="output-field">
                  <p className="text-label output-field__label">Sources</p>
                  <SourceLinkList sources={p.sources!} />
                </div>
              </>
            ) : p.strongestEvidence ? (
              <OutputField label="Strongest evidence">
                {p.strongestEvidence}
              </OutputField>
            ) : null}
            <OutputField label="Only they would say" highlight>
              {p.uniqueInsight}
            </OutputField>
          </div>
        </article>
      ))}
      {showDisclaimer ? (
        <p className="text-caption text-muted grounding-note">
          {output.groundingNote ?? DEFAULT_GROUNDING_NOTE}
        </p>
      ) : null}
    </div>
  );
}

function Step2View({ output }: { output: ContradictionMapOutput }) {
  return (
    <div className="output-reading stack-gap-6">
      <OutputSection
        title="Where they agree"
        lead="Highest-confidence conclusions."
        tier="primary"
      >
        <ConsensusList items={output.areasOfConsensus} />
      </OutputSection>

      <OutputSection
        title="Where they clash"
        lead={`${output.directContradictions.length} tension${output.directContradictions.length === 1 ? "" : "s"} to resolve.`}
        tier="secondary"
      >
        <div className="stack-gap-4">
          {output.directContradictions.map((c, i) => (
            <article key={i} className="contradiction-item contradiction-item--tension">
              <PerspectiveTags names={c.perspectives} />
              <p className="text-body contradiction-item__claim">{c.conflictingClaims}</p>
              <p className="text-caption text-muted">{c.whyTheyDisagree}</p>
              {c.sourceRefs?.length ? (
                <SourceRefTags refs={c.sourceRefs} />
              ) : null}
            </article>
          ))}
        </div>
      </OutputSection>

      <OutputSection title="Evidence strength" tier="secondary">
        <EvidenceRankMeter rankings={output.evidenceRanking} />
        <div className="stack-gap-3 output-block__notes">
          {[...output.evidenceRanking]
            .sort((a, b) => a.rank - b.rank)
            .map((r) => (
              <p key={r.perspective} className="text-caption text-muted">
                <strong>{r.perspective}</strong> — {r.rationale}
              </p>
            ))}
        </div>
      </OutputSection>

      <OutputSection title="Blind spot" tier="muted">
        <p className="text-body">{output.blindSpot}</p>
      </OutputSection>
    </div>
  );
}

function Step3View({ output }: { output: SynthesisOutput }) {
  const openQuestion =
    output.criticalUncertainty ?? output.frontierQuestion ?? null;

  return (
    <div className="output-reading stack-gap-6">
      <OutputLead label="Executive summary" tier="critical">
        {output.executiveSummary}
      </OutputLead>

      {openQuestion ? (
        <OutputLead label="Critical uncertainty" tier="critical">
          {openQuestion}
        </OutputLead>
      ) : null}

      <OutputLead label="What to do differently" tier="action">
        {output.actionableInsight}
      </OutputLead>

      <OutputSection
        title="Key findings"
        lead="Synthetic conclusions ranked by reliability — each combines multiple lenses."
        tier="primary"
      >
        <div className="findings-grid">
          {output.keyFindings.map((f, i) => (
            <article
              key={f.finding}
              className={`finding-card finding-card--${f.reliabilityLevel}`}
            >
              <div className="finding-card__copy">
                <p className="text-label finding-card__rank">Finding {i + 1}</p>
                <p className="text-body finding-card__title">{f.finding}</p>
                {f.derivedFrom ? (
                  <FindingProvenance derivedFrom={f.derivedFrom} />
                ) : null}
                {f.challengingPerspectives.length > 0 ? (
                  <p className="text-caption text-muted">
                    Challenged by {f.challengingPerspectives.join(", ")}
                  </p>
                ) : null}
              </div>
              <ReliabilityMeter level={f.reliabilityLevel} />
            </article>
          ))}
        </div>
      </OutputSection>

      <OutputSection title="Hidden connection" tier="muted">
        <p className="text-body">{output.hiddenConnection}</p>
      </OutputSection>
    </div>
  );
}

function Step4View({
  output,
  synthesisOutput,
  sessionId,
  sessionExtras,
  perspectiveConfig,
}: {
  output: PeerReviewOutput;
  synthesisOutput?: SynthesisOutput;
  sessionId?: string;
  sessionExtras?: SessionExtras | null;
  perspectiveConfig?: PerspectiveSlot[] | null;
}) {
  const keyFindings = synthesisOutput?.keyFindings ?? [];
  const findingAudits = output.findingAudits;
  const legacyScores = output.confidenceScores;

  const confidencePercent = findingAudits?.length
    ? computeFindingAuditConfidencePercent(findingAudits)
    : legacyScores?.length
      ? (legacyScores.reduce((sum, s) => sum + s.score, 0) /
          legacyScores.length /
          10) *
        100
      : 0;

  return (
    <div className="output-reading stack-gap-6">
      <div className="review-hero">
        <GradeArcMeter
          grade={output.overallAssessment.grade}
          confidencePercent={confidencePercent}
          caption={output.overallAssessment.strengths[0]}
        />
      </div>

      {findingAudits?.length ? (
        <OutputSection
          title="Finding audits"
          lead="Evidence-chain stress test — verdict and gaps per finding (see Briefing for full text)."
          tier="primary"
        >
          <FindingAuditList audits={findingAudits} keyFindings={keyFindings} />
        </OutputSection>
      ) : legacyScores?.length ? (
        <OutputSection
          title="Finding confidence"
          lead="Quality stress-test — scores and uncertainty only (see Briefing for full findings)."
          tier="primary"
        >
          <ConfidenceBarsMeter scores={legacyScores} keyFindings={keyFindings} />
          <div className="stack-gap-4 output-block__notes">
            {legacyScores.map((s, index) => {
              const findingNumber =
                s.findingIndex != null ? s.findingIndex + 1 : index + 1;
              const resolvedTitle = resolveConfidenceFindingTitle(s, keyFindings);
              const showResolvedTitle =
                keyFindings.length === 0 && s.finding != null;

              return (
                <RankedItem
                  key={`${findingNumber}-${index}`}
                  rank={findingNumber}
                  title={
                    showResolvedTitle
                      ? resolvedTitle
                      : `Finding ${findingNumber}`
                  }
                  detail={[s.uncertainty, s.rationale].filter(Boolean).join(" — ")}
                  tier={s.score <= 4 ? "secondary" : "primary"}
                  meta={<span className="score-pill">{s.score}/10</span>}
                />
              );
            })}
          </div>
        </OutputSection>
      ) : null}

      <OutputSection title="Weakest link" tier="secondary">
        <div className="caution-callout">
          <p className="text-body">{output.weakestLink.claim}</p>
          <p className="text-caption text-muted">{output.weakestLink.why}</p>
          <p className="text-caption text-muted">{output.weakestLink.evidenceNeeded}</p>
        </div>
      </OutputSection>

      <OutputSection title="Bias check" tier="secondary">
        <p className="text-body">{output.biasCheck.overrepresentedPerspective}</p>
        <p className="text-caption text-muted">
          {output.biasCheck.dominatedConclusions
            ? "This perspective dominated conclusions."
            : "Did not dominate conclusions."}{" "}
          {output.biasCheck.influence}
        </p>
      </OutputSection>

      {sessionId ? (
        <MissingPerspectiveExplore
          sessionId={sessionId}
          output={output}
          sessionExtras={sessionExtras ?? null}
          perspectiveConfig={perspectiveConfig ?? null}
        />
      ) : (
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
        </OutputSection>
      )}
    </div>
  );
}
