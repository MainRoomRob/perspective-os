import { z } from "zod";

export const EXPERT_IDS = [
  "practitioner",
  "academic",
  "skeptic",
  "economist",
  "historian",
] as const;

export type ExpertId = (typeof EXPERT_IDS)[number];

export const expertIdSchema = z.enum(EXPERT_IDS);

export const perspectiveSlugSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-z][a-z0-9-]*$/, "Use lowercase slug (e.g. regulator, end-user)");

export type PerspectiveSlug = z.infer<typeof perspectiveSlugSchema>;

/** Legacy enum ids or session-configured slugs. */
export const perspectiveIdSchema = z.union([
  expertIdSchema,
  perspectiveSlugSchema,
]);

export type PerspectiveId = z.infer<typeof perspectiveIdSchema>;

export const SOURCE_TYPES = [
  "study",
  "report",
  "news",
  "data",
  "book",
  "organisation",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const sourceTypeSchema = z.enum(SOURCE_TYPES);

export const perspectiveSourceSchema = z.object({
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.string().url().optional(),
  sourceType: sourceTypeSchema,
  excerpt: z.string().max(300).optional(),
  publishedAt: z.string().datetime().optional(),
  retrievedAt: z.string().datetime().optional(),
  searchPool: z.enum(["recent", "historical"]).optional(),
});

export type PerspectiveSource = z.infer<typeof perspectiveSourceSchema>;

export const evidencePointSchema = z.object({
  claim: z.string().min(1).max(250),
  sourceIndex: z.number().int().min(0),
});

export type EvidencePoint = z.infer<typeof evidencePointSchema>;

const expertPerspectiveFieldsSchema = z.object({
  id: perspectiveIdSchema,
  name: z.string().min(1),
  corePosition: z.string().min(1).max(400),
  uniqueInsight: z.string().min(1).max(300),
  evidencePoints: z.array(evidencePointSchema).min(2).max(3).optional(),
  sources: z.array(perspectiveSourceSchema).min(2).max(4).optional(),
  /** @deprecated Legacy field — present on outputs before source grounding. */
  strongestEvidence: z.string().min(1).optional(),
});

function refineExpertPerspective(
  data: z.infer<typeof expertPerspectiveFieldsSchema>,
  ctx: z.RefinementCtx,
) {
  const hasNew = data.evidencePoints != null && data.sources != null;
  const hasLegacy = data.strongestEvidence != null;

  if (!hasNew && !hasLegacy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Each perspective must include evidencePoints + sources, or legacy strongestEvidence",
      path: ["evidencePoints"],
    });
    return;
  }

  if (!hasNew) return;

  for (let i = 0; i < data.evidencePoints!.length; i++) {
    const point = data.evidencePoints![i]!;
    if (point.sourceIndex >= data.sources!.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `sourceIndex ${point.sourceIndex} is out of range for sources array`,
        path: ["evidencePoints", i, "sourceIndex"],
      });
    }
  }
}

export const expertPerspectiveSchema = expertPerspectiveFieldsSchema.superRefine(
  refineExpertPerspective,
);

export type ExpertPerspective = z.infer<typeof expertPerspectiveSchema>;

/** Strict schema for new Step 1 LLM outputs (requires grounded sources). */
export const expertPerspectiveNewSchema = expertPerspectiveFieldsSchema
  .extend({
    evidencePoints: z.array(evidencePointSchema).min(2).max(3),
    sources: z.array(perspectiveSourceSchema).min(2).max(4),
  })
  .superRefine(refineExpertPerspective);

/** Supplementary lens built after Peer Review — custom slug allowed. */
export const supplementaryExpertPerspectiveSchema =
  expertPerspectiveNewSchema;

export type SupplementaryExpertPerspective = z.infer<
  typeof supplementaryExpertPerspectiveSchema
>;

export const findingChallengeImpactSchema = z.enum([
  "undermined",
  "qualified",
  "unchanged",
]);

export type FindingChallengeImpact = z.infer<
  typeof findingChallengeImpactSchema
>;

export const briefingDeltaSchema = z.object({
  missingLensId: perspectiveSlugSchema,
  summary: z.string().min(1),
  findingChallenges: z
    .array(
      z.object({
        findingIndex: z.number().int().min(0).max(4),
        impact: findingChallengeImpactSchema,
        reason: z.string().min(1),
      }),
    )
    .length(5),
  newTensions: z.array(
    z.object({
      withPerspective: z.string().min(1),
      tension: z.string().min(1),
    }),
  ),
  revisedActionableInsight: z.string().min(1),
  residualUncertainty: z.string().min(1),
});

export type BriefingDelta = z.infer<typeof briefingDeltaSchema>;

export const sessionExtrasSchema = z.object({
  supplementaryPerspective: supplementaryExpertPerspectiveSchema.optional(),
  briefingDelta: briefingDeltaSchema.optional(),
  gatheredSources: z.array(perspectiveSourceSchema).optional(),
});

export type SessionExtras = z.infer<typeof sessionExtrasSchema>;

export const multiPerspectiveOutputSchema = z.object({
  topic: z.string().min(1),
  perspectives: z.array(expertPerspectiveSchema).length(5),
  groundingNote: z.string().optional(),
});

export type MultiPerspectiveOutput = z.infer<typeof multiPerspectiveOutputSchema>;

export const multiPerspectiveOutputNewSchema = multiPerspectiveOutputSchema.extend({
  perspectives: z.array(expertPerspectiveNewSchema).length(5),
});

export const contradictionSourceRefSchema = z.object({
  perspectiveId: perspectiveIdSchema,
  evidenceIndex: z.number().int().min(0).max(2),
});

export type ContradictionSourceRef = z.infer<typeof contradictionSourceRefSchema>;

export const contradictionSchema = z.object({
  perspectives: z.array(z.string().min(1)).min(2),
  conflictingClaims: z.string().min(1),
  whyTheyDisagree: z.string().min(1),
  sourceRefs: z.array(contradictionSourceRefSchema).min(1).optional(),
});

export type Contradiction = z.infer<typeof contradictionSchema>;

export const evidenceRankingSchema = z.object({
  perspective: z.string().min(1),
  rank: z.number().int().min(1).max(5),
  rationale: z.string().min(1),
});

export type EvidenceRanking = z.infer<typeof evidenceRankingSchema>;

export const contradictionMapOutputSchema = z.object({
  directContradictions: z.array(contradictionSchema),
  evidenceRanking: z.array(evidenceRankingSchema).length(5),
  areasOfConsensus: z.array(z.string().min(1)),
  blindSpot: z.string().min(1),
  /** @deprecated Moved to Step 3 synthesis output. */
  criticalUncertainty: z.string().min(1).optional(),
});

export type ContradictionMapOutput = z.infer<typeof contradictionMapOutputSchema>;

export const contradictionMapOutputNewSchema = contradictionMapOutputSchema.omit({
  criticalUncertainty: true,
});

export const reliabilityLevelSchema = z.enum(["high", "medium", "low"]);

export type ReliabilityLevel = z.infer<typeof reliabilityLevelSchema>;

export const findingDerivedFromSchema = z.object({
  contradictionIndices: z.array(z.number().int().min(0)).optional(),
  perspectiveIds: z.array(perspectiveIdSchema).optional(),
});

export type FindingDerivedFrom = z.infer<typeof findingDerivedFromSchema>;

export const keyFindingSchema = z.object({
  finding: z.string().min(1),
  reliabilityLevel: reliabilityLevelSchema,
  supportingPerspectives: z.array(z.string().min(1)),
  challengingPerspectives: z.array(z.string().min(1)),
  derivedFrom: findingDerivedFromSchema.optional(),
});

export type KeyFinding = z.infer<typeof keyFindingSchema>;

export const synthesisOutputSchema = z.object({
  executiveSummary: z.string().min(1),
  keyFindings: z.array(keyFindingSchema).length(5),
  hiddenConnection: z.string().min(1),
  actionableInsight: z.string().min(1),
  criticalUncertainty: z.string().min(1).optional(),
  /** @deprecated Replaced by criticalUncertainty on Step 3. */
  frontierQuestion: z.string().min(1).optional(),
});

export type SynthesisOutput = z.infer<typeof synthesisOutputSchema>;

export const synthesisOutputNewSchema = synthesisOutputSchema
  .omit({ frontierQuestion: true })
  .extend({
    criticalUncertainty: z.string().min(1),
  });

const confidenceScoreFieldsSchema = z.object({
  findingIndex: z.number().int().min(0).max(4).optional(),
  /** @deprecated Use findingIndex; UI resolves title from Step 3. */
  finding: z.string().min(1).optional(),
  score: z.number().int().min(1).max(10),
  rationale: z.string().min(1),
  uncertainty: z.string().min(1),
});

function refineConfidenceScore(
  data: z.infer<typeof confidenceScoreFieldsSchema>,
  ctx: z.RefinementCtx,
) {
  if (data.findingIndex == null && data.finding == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide findingIndex or legacy finding text",
      path: ["findingIndex"],
    });
  }
}

export const confidenceScoreSchema = confidenceScoreFieldsSchema.superRefine(
  refineConfidenceScore,
);

export type ConfidenceScore = z.infer<typeof confidenceScoreSchema>;

export const confidenceScoreNewSchema = confidenceScoreFieldsSchema
  .extend({
    findingIndex: z.number().int().min(0).max(4),
  })
  .superRefine(refineConfidenceScore);

export const findingVerdictSchema = z.enum([
  "holds",
  "conditional",
  "unsupported",
]);

export type FindingVerdict = z.infer<typeof findingVerdictSchema>;

export const reliabilityAdjustmentSchema = z.enum([
  "confirmed",
  "downgrade",
  "upgrade",
]);

export type ReliabilityAdjustment = z.infer<typeof reliabilityAdjustmentSchema>;

const findingAuditFieldsSchema = z.object({
  findingIndex: z.number().int().min(0).max(4),
  verdict: findingVerdictSchema,
  chainCheck: z.string().min(1),
  primaryGap: z.string().min(1),
  evidenceToVerify: z.string().optional(),
  reliabilityAdjustment: reliabilityAdjustmentSchema.optional(),
});

function refineFindingAudit(
  data: z.infer<typeof findingAuditFieldsSchema>,
  ctx: z.RefinementCtx,
) {
  const verify = data.evidenceToVerify?.trim();
  if (
    data.verdict !== "holds" &&
    (verify == null || verify.length === 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "evidenceToVerify is required when verdict is conditional or unsupported",
      path: ["evidenceToVerify"],
    });
  }
}

export const findingAuditSchema = findingAuditFieldsSchema.superRefine(
  refineFindingAudit,
);

export type FindingAudit = z.infer<typeof findingAuditSchema>;

export const findingAuditNewSchema = findingAuditSchema;

const peerReviewFieldsSchema = z.object({
  /** @deprecated Replaced by findingAudits. */
  confidenceScores: z.array(confidenceScoreSchema).length(5).optional(),
  findingAudits: z.array(findingAuditSchema).length(5).optional(),
  weakestLink: z.object({
    claim: z.string().min(1),
    why: z.string().min(1),
    evidenceNeeded: z.string().min(1),
  }),
  biasCheck: z.object({
    overrepresentedPerspective: z.string().min(1),
    dominatedConclusions: z.boolean(),
    influence: z.string().min(1),
  }),
  missingPerspective: z.object({
    perspective: z.string().min(1),
    howItWouldChange: z.string().min(1),
  }),
  overallAssessment: z.object({
    grade: z.string().min(1),
    strengths: z.array(z.string().min(1)),
    weaknesses: z.array(z.string().min(1)),
    improvements: z.array(z.string().min(1)),
  }),
});

function refinePeerReviewOutput(
  data: z.infer<typeof peerReviewFieldsSchema>,
  ctx: z.RefinementCtx,
) {
  const hasAudits = (data.findingAudits?.length ?? 0) === 5;
  const hasScores = (data.confidenceScores?.length ?? 0) === 5;
  if (!hasAudits && !hasScores) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide findingAudits or legacy confidenceScores (5 entries)",
      path: ["findingAudits"],
    });
  }
}

export const peerReviewOutputSchema =
  peerReviewFieldsSchema.superRefine(refinePeerReviewOutput);

export type PeerReviewOutput = z.infer<typeof peerReviewOutputSchema>;

export const peerReviewOutputNewSchema = peerReviewFieldsSchema
  .extend({
    findingAudits: z.array(findingAuditNewSchema).length(5),
    confidenceScores: z.undefined().optional(),
  })
  .superRefine(refinePeerReviewOutput);

export function resolveConfidenceFindingTitle(
  score: ConfidenceScore,
  keyFindings: KeyFinding[],
): string {
  const index = score.findingIndex;
  if (index != null) {
    return keyFindings[index]?.finding ?? `Finding ${index + 1}`;
  }
  return score.finding ?? "Finding";
}

export function resolveFindingAuditLabel(
  audit: FindingAudit,
  keyFindings: KeyFinding[],
): string {
  return (
    keyFindings[audit.findingIndex]?.finding ??
    `Finding ${audit.findingIndex + 1}`
  );
}

export function computeFindingAuditConfidencePercent(
  audits: FindingAudit[],
): number {
  if (audits.length === 0) return 0;
  const total = audits.reduce((sum, audit) => {
    if (audit.verdict === "holds") return sum + 100;
    if (audit.verdict === "conditional") return sum + 50;
    return sum;
  }, 0);
  return total / audits.length;
}

export const RESEARCH_STEPS = [1, 2, 3, 4] as const;
export type ResearchStep = (typeof RESEARCH_STEPS)[number];

export const sessionStatusSchema = z.enum([
  "draft",
  "running",
  "complete",
  "failed",
]);

export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const stepStatusSchema = z.enum([
  "pending",
  "running",
  "complete",
  "failed",
]);

export type StepStatus = z.infer<typeof stepStatusSchema>;

export type StepOutputMap = {
  1: MultiPerspectiveOutput;
  2: ContradictionMapOutput;
  3: SynthesisOutput;
  4: PeerReviewOutput;
};

export const EXPERT_LABELS: Record<ExpertId, string> = {
  practitioner: "The Practitioner",
  academic: "The Academic",
  skeptic: "The Skeptic",
  economist: "The Economist",
  historian: "The Historian",
};

export const STEP_LABELS: Record<ResearchStep, string> = {
  1: "Multi-Perspective Scan",
  2: "Contradiction Map",
  3: "Synthesis",
  4: "Peer Review",
};
