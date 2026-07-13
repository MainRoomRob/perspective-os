import type {
  ContradictionMapOutput,
  MultiPerspectiveOutput,
  PeerReviewOutput,
  ResearchStep,
  SynthesisOutput,
} from "@perspective-os/core";
import { STEP_LABELS, resolveConfidenceFindingTitle, resolveFindingAuditLabel } from "@perspective-os/core";
import { formatSourceRecency } from "./format-source-recency";

export function renderStepMarkdown(
  step: ResearchStep,
  output:
    | MultiPerspectiveOutput
    | ContradictionMapOutput
    | SynthesisOutput
    | PeerReviewOutput,
): string {
  switch (step) {
    case 1:
      return renderStep1(output as MultiPerspectiveOutput);
    case 2:
      return renderStep2(output as ContradictionMapOutput);
    case 3:
      return renderStep3(output as SynthesisOutput);
    case 4:
      return renderStep4(
        output as PeerReviewOutput,
        undefined,
      );
    default:
      return "";
  }
}

function formatSourceMarkdown(source: {
  title: string;
  publisher: string;
  url?: string;
  publishedAt?: string;
  retrievedAt?: string;
}): string {
  const recency = formatSourceRecency(source);
  const dateSuffix = recency ? `, ${recency}` : "";
  if (source.url) {
    return `[${source.title}](${source.url}) (${source.publisher}${dateSuffix})`;
  }
  return `${source.title} (${source.publisher}${dateSuffix})`;
}

function renderStep1(output: MultiPerspectiveOutput): string {
  const sections = output.perspectives.map((p) => {
    const lines = [
      `### ${p.name}`,
      "",
      `**Core position:** ${p.corePosition}`,
      "",
    ];

    if (p.evidencePoints && p.sources) {
      lines.push("**Evidence:**");
      for (const point of p.evidencePoints) {
        const source = p.sources[point.sourceIndex];
        const sourceLabel = source
          ? formatSourceMarkdown(source)
          : "Unknown source";
        lines.push(`- ${point.claim} — ${sourceLabel}`);
      }
      lines.push("", "**Sources:**");
      for (const source of p.sources) {
        lines.push(`- ${formatSourceMarkdown(source)}`);
      }
    } else if (p.strongestEvidence) {
      lines.push(`**Strongest evidence:** ${p.strongestEvidence}`);
    }

    lines.push("", `**Unique insight:** ${p.uniqueInsight}`);
    return lines.join("\n");
  });

  const note = output.groundingNote
    ? `\n\n*${output.groundingNote}*`
    : "";

  return `# ${STEP_LABELS[1]}\n\n**Topic:** ${output.topic}${note}\n\n${sections.join("\n\n")}`;
}

function renderStep2(output: ContradictionMapOutput): string {
  const contradictions = output.directContradictions
    .map(
      (c, i) => {
        const refs = c.sourceRefs?.length
          ? `\n- **Source refs:** ${c.sourceRefs.map((r) => `${r.perspectiveId}[${r.evidenceIndex}]`).join(", ")}`
          : "";
        return `### Contradiction ${i + 1}

- **Perspectives:** ${c.perspectives.join(", ")}
- **Conflicting claims:** ${c.conflictingClaims}
- **Why they disagree:** ${c.whyTheyDisagree}${refs}`;
      },
    )
    .join("\n\n");

  const ranking = output.evidenceRanking
    .sort((a, b) => a.rank - b.rank)
    .map((r) => `${r.rank}. **${r.perspective}** — ${r.rationale}`)
    .join("\n");

  const consensus = output.areasOfConsensus.map((a) => `- ${a}`).join("\n");

  const legacyUncertainty = output.criticalUncertainty
    ? `\n\n## Critical uncertainty (legacy)\n\n${output.criticalUncertainty}`
    : "";

  return `# ${STEP_LABELS[2]}

## Direct contradictions

${contradictions || "_None identified._"}

## Evidence ranking

${ranking}

## Areas of consensus

${consensus}

## Blind spot

${output.blindSpot}${legacyUncertainty}`;
}

function renderStep3(output: SynthesisOutput): string {
  const findings = output.keyFindings
    .map(
      (f, i) => {
        const provenance = f.derivedFrom
          ? `\n- **Derived from:** ${[
              f.derivedFrom.contradictionIndices?.length
                ? `contradictions ${f.derivedFrom.contradictionIndices.map((n) => n + 1).join(", ")}`
                : null,
              f.derivedFrom.perspectiveIds?.length
                ? `perspectives ${f.derivedFrom.perspectiveIds.join(", ")}`
                : null,
            ]
              .filter(Boolean)
              .join("; ")}`
          : "";
        return `### ${i + 1}. ${f.finding}

- **Reliability:** ${f.reliabilityLevel}
- **Supporting:** ${f.supportingPerspectives.join(", ") || "—"}
- **Challenging:** ${f.challengingPerspectives.join(", ") || "—"}${provenance}`;
      },
    )
    .join("\n\n");

  const openQuestion =
    output.criticalUncertainty ??
    output.frontierQuestion ??
    "_Not specified._";

  return `# ${STEP_LABELS[3]}

## Executive summary

${output.executiveSummary}

## Key findings

${findings}

## Hidden connection

${output.hiddenConnection}

## Actionable insight

${output.actionableInsight}

## Critical uncertainty

${openQuestion}`;
}

function renderStep4(
  output: PeerReviewOutput,
  step3?: SynthesisOutput,
): string {
  const keyFindings = step3?.keyFindings ?? [];

  const findingSection = output.findingAudits?.length
    ? output.findingAudits
        .map((audit) => {
          const title = resolveFindingAuditLabel(audit, keyFindings);
          const adjustment = audit.reliabilityAdjustment
            ? `\n- **Reliability adjustment:** ${audit.reliabilityAdjustment}`
            : "";
          const verify = audit.evidenceToVerify
            ? `\n- **Evidence to verify:** ${audit.evidenceToVerify}`
            : "";
          return `### Finding ${audit.findingIndex + 1}: ${title}

- **Verdict:** ${audit.verdict}
- **Chain check:** ${audit.chainCheck}
- **Primary gap:** ${audit.primaryGap}${verify}${adjustment}`;
        })
        .join("\n\n")
    : output.confidenceScores
      ? output.confidenceScores
          .map((s, i) => {
            const title = resolveConfidenceFindingTitle(s, keyFindings);
            const indexLabel =
              s.findingIndex != null
                ? `Finding ${s.findingIndex + 1}`
                : `Finding ${i + 1}`;
            return `### ${indexLabel}: ${title}

- **Score:** ${s.score}/10
- **Rationale:** ${s.rationale}
- **Uncertainty:** ${s.uncertainty}`;
          })
          .join("\n\n")
      : "_No finding review available._";

  const findingHeading = output.findingAudits?.length
    ? "Finding audits"
    : "Confidence scores";

  const strengths = output.overallAssessment.strengths.map((s) => `- ${s}`).join("\n");
  const weaknesses = output.overallAssessment.weaknesses.map((s) => `- ${s}`).join("\n");
  const improvements = output.overallAssessment.improvements.map((s) => `- ${s}`).join("\n");

  return `# ${STEP_LABELS[4]}

## ${findingHeading}

${findingSection}

## Weakest link

**Claim:** ${output.weakestLink.claim}

**Why:** ${output.weakestLink.why}

**Evidence needed:** ${output.weakestLink.evidenceNeeded}

## Bias check

- **Overrepresented:** ${output.biasCheck.overrepresentedPerspective}
- **Dominated conclusions:** ${output.biasCheck.dominatedConclusions ? "Yes" : "No"}
- **Influence:** ${output.biasCheck.influence}

## Missing perspective

**${output.missingPerspective.perspective}** — ${output.missingPerspective.howItWouldChange}

## Overall assessment

**Grade:** ${output.overallAssessment.grade}

### Strengths

${strengths}

### Weaknesses

${weaknesses}

### Improvements

${improvements}`;
}

export function renderFullReport(input: {
  topic: string;
  role: string;
  step1?: MultiPerspectiveOutput;
  step2?: ContradictionMapOutput;
  step3?: SynthesisOutput;
  step4?: PeerReviewOutput;
}): string {
  const parts = [
    `# Research Briefing: ${input.topic}`,
    `**Role:** ${input.role}`,
    `**Generated:** ${new Date().toISOString()}`,
    "",
  ];

  if (input.step1) parts.push(renderStep1(input.step1), "");
  if (input.step2) parts.push(renderStep2(input.step2), "");
  if (input.step3) parts.push(renderStep3(input.step3), "");
  if (input.step4) {
    parts.push(renderStep4(input.step4, input.step3), "");
  }

  return parts.join("\n");
}
