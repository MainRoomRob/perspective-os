import {
  CLASSIC_PRESET,
  type ContradictionMapOutput,
  type ExpertId,
  type MultiPerspectiveOutput,
  type PeerReviewOutput,
  type PerspectiveSlot,
  type PerspectiveSource,
  type SynthesisOutput,
  contradictionMapOutputNewSchema,
  multiPerspectiveOutputNewSchema,
  peerReviewOutputNewSchema,
  synthesisOutputNewSchema,
} from "@perspective-os/core";

const MOCK_RETRIEVED_AT = "2026-06-01T12:00:00.000Z";
const MOCK_PUBLISHED_AT = "2025-11-15T00:00:00.000Z";

const MOCK_SOURCES: Record<ExpertId, PerspectiveSource[]> = {
  practitioner: [
    {
      title: "State of the Industry Survey 2024",
      publisher: "Gartner",
      url: "https://www.gartner.com/en/newsroom",
      sourceType: "report",
      publishedAt: MOCK_PUBLISHED_AT,
      retrievedAt: MOCK_RETRIEVED_AT,
    },
    {
      title: "Field Operations Benchmark Study",
      publisher: "McKinsey Operations Practice",
      sourceType: "study",
      retrievedAt: MOCK_RETRIEVED_AT,
    },
  ],
  academic: [
    {
      title: "Systematic review of peer-reviewed literature",
      publisher: "Journal of Applied Research",
      sourceType: "study",
      publishedAt: "2025-09-20T00:00:00.000Z",
    },
    {
      title: "Meta-analysis of randomised controlled trials",
      publisher: "Cochrane Library",
      url: "https://www.cochranelibrary.com",
      sourceType: "study",
      publishedAt: MOCK_PUBLISHED_AT,
      retrievedAt: MOCK_RETRIEVED_AT,
    },
  ],
  skeptic: [
    {
      title: "Replication failures in headline claims",
      publisher: "Center for Open Science",
      sourceType: "study",
      retrievedAt: MOCK_RETRIEVED_AT,
    },
    {
      title: "Critical review of dominant industry narrative",
      publisher: "Boston Review",
      sourceType: "news",
      publishedAt: "2026-01-10T00:00:00.000Z",
    },
  ],
  economist: [
    {
      title: "Market structure and incentive analysis",
      publisher: "Federal Reserve Economic Data",
      url: "https://fred.stlouisfed.org",
      sourceType: "data",
      publishedAt: MOCK_PUBLISHED_AT,
      retrievedAt: MOCK_RETRIEVED_AT,
    },
    {
      title: "Annual industry economics report",
      publisher: "Deloitte Insights",
      sourceType: "report",
      retrievedAt: MOCK_RETRIEVED_AT,
    },
  ],
  historian: [
    {
      title: "Historical parallels in technology adoption cycles",
      publisher: "Cambridge University Press",
      sourceType: "book",
      publishedAt: "2024-06-01T00:00:00.000Z",
    },
    {
      title: "Archive-based case study series",
      publisher: "Smithsonian Institution",
      sourceType: "organisation",
      retrievedAt: MOCK_RETRIEVED_AT,
    },
  ],
};

function defaultSourcesForSlot(id: string): PerspectiveSource[] {
  if (isKnownExpertId(id)) {
    return MOCK_SOURCES[id];
  }
  return [
    {
      title: `Sector analysis relevant to ${id.replace(/-/g, " ")}`,
      publisher: "Industry Research Consortium",
      sourceType: "report",
    },
    {
      title: "Primary source review",
      publisher: "Independent policy institute",
      sourceType: "study",
    },
  ];
}

function isKnownExpertId(id: string): id is ExpertId {
  return id in MOCK_SOURCES;
}

export function mockMultiPerspective(
  topic: string,
  config: PerspectiveSlot[] = CLASSIC_PRESET.slots,
): MultiPerspectiveOutput {
  const perspectives = config.map((slot) => {
    const sources = defaultSourcesForSlot(slot.id);
    return {
      id: slot.id,
      name: slot.name,
      corePosition: `On "${topic}", ${slot.name.toLowerCase()} sees entrenched assumptions that rarely get stress-tested in public debate, with operational reality diverging from headline narratives.`,
      sources,
      evidencePoints: [
        {
          claim: `${sources[0]!.publisher} documents measurable gaps between stated strategy and on-the-ground practice for topics like "${topic}".`,
          sourceIndex: 0,
        },
        {
          claim: `${sources[1]!.title} highlights recurring patterns that challenge the consensus view held in media coverage.`,
          sourceIndex: 1,
        },
      ],
      uniqueInsight: `${slot.name} would emphasise a constraint or incentive that other perspectives treat as background noise.`,
    };
  });

  return multiPerspectiveOutputNewSchema.parse({
    topic,
    groundingNote:
      "Sources are model-identified references — verify before citing externally.",
    perspectives,
  });
}

export function mockContradictionMap(
  step1: MultiPerspectiveOutput,
): ContradictionMapOutput {
  const names = step1.perspectives.map((p) => p.name);
  return contradictionMapOutputNewSchema.parse({
    directContradictions: [
      {
        perspectives: [names[0]!, names[2]!],
        conflictingClaims: `${names[0]} treats adoption as evidence of value; ${names[2]} argues adoption often reflects inertia and marketing.`,
        whyTheyDisagree:
          "Different standards of proof — operational success vs. structural critique.",
        sourceRefs: [
          { perspectiveId: "practitioner", evidenceIndex: 0 },
          { perspectiveId: "skeptic", evidenceIndex: 1 },
        ],
      },
      {
        perspectives: [names[1]!, names[3]!],
        conflictingClaims: `${names[1]} cites published studies; ${names[3]} argues funding shapes which studies get done.`,
        whyTheyDisagree: "Epistemic vs. incentive-based framing of the same data.",
        sourceRefs: [
          { perspectiveId: "academic", evidenceIndex: 0 },
          { perspectiveId: "economist", evidenceIndex: 0 },
        ],
      },
    ],
    evidenceRanking: names.map((name, i) => ({
      perspective: name,
      rank: i + 1,
      rationale: `Rank ${i + 1} based on specificity of claims and traceability to sources.`,
    })),
    areasOfConsensus: [
      "The topic is undergoing rapid change.",
      "Stakeholder incentives strongly influence public discourse.",
      "More longitudinal data is needed.",
    ],
    blindSpot:
      "Regulatory and geopolitical constraints were under-weighted across all five perspectives.",
  });
}

export function mockSynthesis(
  topic: string,
  role: string,
  step1: MultiPerspectiveOutput,
  step2: ContradictionMapOutput,
): SynthesisOutput {
  return synthesisOutputNewSchema.parse({
    executiveSummary: `As ${role}, research on "${topic}" shows practitioner experience, academic evidence, and incentive structures tell partially compatible stories. The strongest cross-lens signal is accelerating change — but whether current adoption reflects genuine value or structural lock-in remains unresolved and directly affects resource allocation decisions.`,
    keyFindings: [
      {
        finding: `Accelerating change in "${topic}" is the only conclusion all five lenses support once operational, published, and incentive-based evidence are combined.`,
        reliabilityLevel: "high",
        supportingPerspectives: step1.perspectives
          .slice(0, 4)
          .map((p) => p.name),
        challengingPerspectives: [],
        derivedFrom: { perspectiveIds: ["practitioner", "academic", "economist"] },
      },
      {
        finding: `Adoption metrics and value claims diverge because practitioners measure implementation while skeptics measure falsifiable outcomes — neither alone predicts ROI for ${role}.`,
        reliabilityLevel: "medium",
        supportingPerspectives: [step1.perspectives[0]!.name, step1.perspectives[2]!.name],
        challengingPerspectives: [step1.perspectives[1]!.name],
        derivedFrom: { contradictionIndices: [0], perspectiveIds: ["practitioner", "skeptic"] },
      },
      {
        finding: `Regulatory and geopolitical constraints were absent from every lens, yet they likely bound what ${role} can claim or deploy in the next planning cycle.`,
        reliabilityLevel: "medium",
        supportingPerspectives: [],
        challengingPerspectives: step1.perspectives.map((p) => p.name),
        derivedFrom: { perspectiveIds: ["historian"] },
      },
      {
        finding: `Funding structures explain why academic and economist lenses surface different "strongest" evidence — synthesis suggests triangulating both before trusting any single study.`,
        reliabilityLevel: "medium",
        supportingPerspectives: [step1.perspectives[1]!.name, step1.perspectives[3]!.name],
        challengingPerspectives: [step1.perspectives[0]!.name],
        derivedFrom: { contradictionIndices: [1], perspectiveIds: ["academic", "economist"] },
      },
      {
        finding: `Someone in the role of ${role} should treat headline claims with calibrated skepticism until an independent measurement resolves the adoption-vs-value tension.`,
        reliabilityLevel: "low",
        supportingPerspectives: [step1.perspectives[2]!.name, step1.perspectives[3]!.name],
        challengingPerspectives: [step1.perspectives[0]!.name],
      },
    ],
    hiddenConnection:
      "The economist's incentive analysis and the historian's parallel cases converge on the same prediction: incumbents will frame uncertainty as temporary while consolidating advantage.",
    actionableInsight: `As ${role}, run a small experiment that tests the practitioner-skeptic disagreement before committing resources. Document assumptions that would falsify your current plan.`,
    criticalUncertainty: `Whether the dominant narrative about "${topic}" holds under rigorous, independent measurement.`,
  });
}

export function mockPeerReview(
  step3: SynthesisOutput,
): PeerReviewOutput {
  return peerReviewOutputNewSchema.parse({
    findingAudits: [
      {
        findingIndex: 0,
        verdict: "holds",
        chainCheck:
          "Clash 0 not required — derivedFrom practitioner, academic, economist; Practitioner E1 and Academic E1 both cite named publishers supporting accelerating change.",
        primaryGap:
          "All three cited sources are model-identified and not independently verified.",
        reliabilityAdjustment: "confirmed",
      },
      {
        findingIndex: 1,
        verdict: "conditional",
        chainCheck:
          "Traces to Clash 1 via derivedFrom practitioner + skeptic; Practitioner E1 and Skeptic E2 support the tension but measure different outcomes.",
        primaryGap:
          "Synthesis assumes ROI relevance for the reader role without operational metrics linking adoption to value.",
        evidenceToVerify:
          "A/B test or cohort study comparing adoption metrics to falsifiable outcome measures.",
        reliabilityAdjustment: "confirmed",
      },
      {
        findingIndex: 2,
        verdict: "unsupported",
        chainCheck:
          "derivedFrom historian only, but Step 2 blind spot — no Step 1 perspective addressed regulatory constraints; Historian E1 discusses adoption cycles, not regulation.",
        primaryGap:
          "Finding extrapolates from a blind-spot observation without grounding in any Step 1 evidence claim.",
        evidenceToVerify:
          "Regulatory timeline analysis or policy-maker perspective with cited compliance constraints.",
        reliabilityAdjustment: "downgrade",
      },
      {
        findingIndex: 3,
        verdict: "conditional",
        chainCheck:
          "Clash 2 + academic/economist via derivedFrom; Academic E1 and Economist E1 exist but funding-bias link is inferential, not sourced.",
        primaryGap:
          "Triangulation recommendation is sound logic but Economist E1 does not explicitly document which studies were funded by whom.",
        evidenceToVerify:
          "Disclosed funding metadata for cited studies or independent replication audit.",
        reliabilityAdjustment: "confirmed",
      },
      {
        findingIndex: 4,
        verdict: "conditional",
        chainCheck:
          "No derivedFrom — draws on skeptic + economist tension from Clash 1 subtext; Skeptic E2 challenges consensus but does not resolve the measurement question.",
        primaryGap:
          "Low reliability finding correctly flagged in Step 3, but audit cannot confirm falsification criteria are actionable for the reader role.",
        evidenceToVerify:
          "Pre-registered experiment with explicit assumptions that would falsify the current plan.",
        reliabilityAdjustment: "confirmed",
      },
    ],
    weakestLink: {
      claim: step3.keyFindings[3]?.finding ?? step3.keyFindings[0]!.finding,
      why: "Least grounded in verifiable external data.",
      evidenceNeeded: "Independent longitudinal study or audited operational metrics.",
    },
    biasCheck: {
      overrepresentedPerspective: "The Academic",
      dominatedConclusions: false,
      influence: "Academic framing may overweight published literature vs. tacit practitioner knowledge.",
    },
    missingPerspective: {
      perspective: "The Regulator / Policy Maker",
      howItWouldChange:
        "Could reframe the actionable insight around compliance timelines and permissible claims.",
    },
    overallAssessment: {
      grade: "B+",
      strengths: [
        "Clear multi-perspective structure",
        "Explicit contradiction mapping",
        "Role-specific actionable insight",
      ],
      weaknesses: [
        "Simulated experts, not primary sources",
        "Evidence rankings are subjective",
      ],
      improvements: [
        "Ground at least two perspectives in cited sources",
        "Add quantitative confidence intervals where possible",
      ],
    },
  });
}
