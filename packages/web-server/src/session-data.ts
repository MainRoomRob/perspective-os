import type {
  ContradictionMapOutput,
  MultiPerspectiveOutput,
  PeerReviewOutput,
  ResearchStep,
  SessionBrief,
  SessionBriefExtras,
  SessionExtras,
  SessionStatus,
  StepStatus,
  SynthesisOutput,
} from "@perspective-os/core";
import type { PerspectiveSlot } from "@perspective-os/core";
import { resolveSessionBrief } from "@perspective-os/core";
import {
  getDb,
  researchSessions,
  stepOutputs,
  withDbRetry,
} from "@perspective-os/db";
import { and, asc, desc, eq } from "drizzle-orm";

export type SessionSummary = {
  id: string;
  topic: string;
  role: string;
  status: SessionStatus;
  currentStep: number;
  createdAt: Date;
  updatedAt: Date;
};

export type StepOutputRow = {
  id: string;
  step: ResearchStep;
  status: StepStatus;
  output:
    | MultiPerspectiveOutput
    | ContradictionMapOutput
    | SynthesisOutput
    | PeerReviewOutput
    | null;
  rawMarkdown: string | null;
  error: string | null;
  updatedAt: Date;
};

export type SessionDetail = SessionSummary & {
  brief: SessionBriefExtras | null;
  perspectiveConfig: PerspectiveSlot[] | null;
  sessionExtras: SessionExtras | null;
  steps: StepOutputRow[];
};

export async function listSessions(): Promise<SessionSummary[]> {
  return withDbRetry(async (db) =>
    db
      .select({
        id: researchSessions.id,
        topic: researchSessions.topic,
        role: researchSessions.role,
        status: researchSessions.status,
        currentStep: researchSessions.currentStep,
        createdAt: researchSessions.createdAt,
        updatedAt: researchSessions.updatedAt,
      })
      .from(researchSessions)
      .orderBy(desc(researchSessions.updatedAt)),
  );
}

export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  return withDbRetry(async (db) => {
    const [session] = await db
      .select()
      .from(researchSessions)
      .where(eq(researchSessions.id, sessionId));
    if (!session) return null;

    const steps = await db
      .select({
        id: stepOutputs.id,
        step: stepOutputs.step,
        status: stepOutputs.status,
        output: stepOutputs.output,
        rawMarkdown: stepOutputs.rawMarkdown,
        error: stepOutputs.error,
        updatedAt: stepOutputs.updatedAt,
      })
      .from(stepOutputs)
      .where(eq(stepOutputs.sessionId, sessionId))
      .orderBy(asc(stepOutputs.step));

    return {
      id: session.id,
      topic: session.topic,
      role: session.role,
      brief: session.brief ?? null,
      status: session.status,
      currentStep: session.currentStep,
      perspectiveConfig: session.perspectiveConfig ?? null,
      sessionExtras: session.sessionExtras ?? null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      steps: steps.map((s) => ({
        ...s,
        step: s.step as ResearchStep,
      })),
    };
  });
}

export function buildPipelineContext(detail: SessionDetail) {
  const get = <T>(step: ResearchStep) =>
    detail.steps.find((s) => s.step === step && s.status === "complete")
      ?.output as T | undefined;

  const brief = resolveSessionBrief({
    topic: detail.topic,
    role: detail.role,
    brief: detail.brief,
  });

  return {
    brief,
    topic: brief.topic,
    role: brief.role,
    perspectiveConfig: detail.perspectiveConfig,
    useWebSearch: detail.brief?.useWebSearch ?? false,
    searchRecencyWindow: detail.brief?.searchRecencyWindow,
    step1: get<MultiPerspectiveOutput>(1),
    step2: get<ContradictionMapOutput>(2),
    step3: get<SynthesisOutput>(3),
    step4: get<PeerReviewOutput>(4),
  };
}

export async function ensureStepRows(
  sessionId: string,
): Promise<void> {
  await withDbRetry(async (db) => {
    for (const step of [1, 2, 3, 4] as ResearchStep[]) {
      const [existing] = await db
        .select({ id: stepOutputs.id })
        .from(stepOutputs)
        .where(
          and(
            eq(stepOutputs.sessionId, sessionId),
            eq(stepOutputs.step, step),
          ),
        );
      if (!existing) {
        await db.insert(stepOutputs).values({
          sessionId,
          step,
          status: "pending",
        });
      }
    }
  });
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  currentStep?: number,
): Promise<void> {
  await withDbRetry(async (db) => {
    await db
      .update(researchSessions)
      .set({
        status,
        ...(currentStep !== undefined ? { currentStep } : {}),
        updatedAt: new Date(),
      })
      .where(eq(researchSessions.id, sessionId));
  });
}

export async function clearSessionPipelineFromStep(
  sessionId: string,
  fromStep: ResearchStep,
): Promise<void> {
  await withDbRetry(async (db) => {
    for (const s of [1, 2, 3, 4] as ResearchStep[]) {
      if (s >= fromStep) {
        await db
          .update(stepOutputs)
          .set({
            status: "pending",
            output: null,
            rawMarkdown: null,
            error: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(stepOutputs.sessionId, sessionId),
              eq(stepOutputs.step, s),
            ),
          );
      }
    }
    await db
      .update(researchSessions)
      .set({
        status: "draft",
        currentStep: fromStep - 1,
        sessionExtras: null,
        updatedAt: new Date(),
      })
      .where(eq(researchSessions.id, sessionId));
  });
}
