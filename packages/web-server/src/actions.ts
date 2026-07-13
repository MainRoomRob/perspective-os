"use server";

import {
  exploreMissingPerspective,
  friendlyLlmErrorMessage,
  renderFullReport,
  runRecommendRoster,
  runResearchStep,
} from "@perspective-os/ai/server";
import type { ResearchStep, RosterRecommendation, SessionExtras } from "@perspective-os/core";
import {
  CLASSIC_PRESET,
  type PerspectiveSlot,
  getPresetById,
  parseSessionBriefFromFormData,
  perspectiveSlotSchema,
  resolvePerspectiveConfig,
  sessionBriefExtrasFromBrief,
  sessionBriefSchema,
  slugFromPerspectiveName,
} from "@perspective-os/core";
import { getDb, researchSessions, stepOutputs, withDbRetry } from "@perspective-os/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildPipelineContext,
  clearSessionPipelineFromStep,
  ensureStepRows,
  getSessionDetail,
  updateSessionStatus,
} from "./session-data";

function revalidateSession(sessionId: string) {
  revalidatePath("/");
  revalidatePath(`/sessions/${sessionId}`);
}

function parsePerspectiveConfig(formData: FormData): PerspectiveSlot[] {
  const presetId = String(formData.get("presetId") ?? "classic").trim();
  if (presetId !== "custom") {
    return getPresetById(presetId)?.slots ?? CLASSIC_PRESET.slots;
  }

  const slots: PerspectiveSlot[] = [];
  for (let i = 0; i < 5; i++) {
    const name = String(formData.get(`slot_${i}_name`) ?? "").trim();
    const lens = String(formData.get(`slot_${i}_lens`) ?? "").trim();
    const idRaw = String(formData.get(`slot_${i}_id`) ?? "").trim();
    const id = idRaw || slugFromPerspectiveName(name || `lens-${i + 1}`);
    slots.push(
      perspectiveSlotSchema.parse({
        id,
        name: name || `Lens ${i + 1}`,
        lens: lens || "Describe what this lens prioritises.",
      }),
    );
  }
  return slots;
}

export async function createSession(formData: FormData) {
  const brief = parseSessionBriefFromFormData(formData);
  const perspectiveConfig = parsePerspectiveConfig(formData);
  const { isWebSearchEnabled } = await import("@perspective-os/ai");
  const useWebSearchRequested = formData.get("useWebSearch") === "on";
  const useWebSearch = useWebSearchRequested && isWebSearchEnabled();

  const [session] = await withDbRetry(async (db) =>
    db
      .insert(researchSessions)
      .values({
        topic: brief.topic,
        role: brief.role,
        brief: sessionBriefExtrasFromBrief(brief, { useWebSearch }),
        status: "draft",
        currentStep: 0,
        perspectiveConfig,
      })
      .returning({ id: researchSessions.id }),
  );

  await ensureStepRows(session!.id);
  redirect(`/sessions/${session!.id}`);
}

export async function recommendRosterAction(input: {
  topic: string;
  role: string;
  decision: string;
  context?: string;
}): Promise<RosterRecommendation> {
  const brief = sessionBriefSchema.parse({
    topic: input.topic.trim(),
    role: input.role.trim(),
    decision: input.decision.trim(),
    context: input.context?.trim() || undefined,
  });

  try {
    const result = await runRecommendRoster(brief);
    return result.recommendation;
  } catch (err) {
    throw new Error(friendlyLlmErrorMessage(err));
  }
}

export async function deleteSession(sessionId: string) {
  await withDbRetry(async (db) =>
    db.delete(researchSessions).where(eq(researchSessions.id, sessionId)),
  );
  revalidatePath("/");
  redirect("/");
}

export async function runStepAction(sessionId: string, step: ResearchStep) {
  const detail = await getSessionDetail(sessionId);
  if (!detail) throw new Error("Session not found");

  if (step > 1) {
    const prior = detail.steps.find(
      (s) => s.step === step - 1 && s.status === "complete",
    );
    if (!prior) {
      throw new Error(`Complete step ${step - 1} first`);
    }
  }

  await updateSessionStatus(sessionId, "running", detail.currentStep);
  await withDbRetry(async (db) => {
    await db
      .update(stepOutputs)
      .set({ status: "running", error: null, updatedAt: new Date() })
      .where(
        and(
          eq(stepOutputs.sessionId, sessionId),
          eq(stepOutputs.step, step),
        ),
      );
  });

  try {
    const ctx = buildPipelineContext(detail);
    const result = await runResearchStep(step, ctx);

    await withDbRetry(async (db) => {
      await db
        .update(stepOutputs)
        .set({
          status: "complete",
          output: result.output,
          rawMarkdown: result.rawMarkdown,
          error: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(stepOutputs.sessionId, sessionId),
            eq(stepOutputs.step, step),
          ),
        );

      const allComplete = step === 4;
      await db
        .update(researchSessions)
        .set({
          status: allComplete ? "complete" : "draft",
          currentStep: step,
          updatedAt: new Date(),
        })
        .where(eq(researchSessions.id, sessionId));
    });
  } catch (err) {
    const message = friendlyLlmErrorMessage(err);
    await withDbRetry(async (db) => {
      await db
        .update(stepOutputs)
        .set({
          status: "failed",
          error: message,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(stepOutputs.sessionId, sessionId),
            eq(stepOutputs.step, step),
          ),
        );
      await db
        .update(researchSessions)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(researchSessions.id, sessionId));
    });
    throw new Error(message);
  } finally {
    revalidateSession(sessionId);
  }
}

export async function runAllRemainingAction(sessionId: string) {
  const detail = await getSessionDetail(sessionId);
  if (!detail) throw new Error("Session not found");

  const nextStep =
    ([1, 2, 3, 4] as ResearchStep[]).find(
      (s) =>
        !detail.steps.some(
          (row) => row.step === s && row.status === "complete",
        ),
    ) ?? null;

  if (!nextStep) return;

  for (const step of [1, 2, 3, 4] as ResearchStep[]) {
    const row = (await getSessionDetail(sessionId))!;
    const complete = row.steps.some(
      (s) => s.step === step && s.status === "complete",
    );
    if (!complete) {
      await runStepAction(sessionId, step);
    }
  }
}

export async function rerunStepAction(sessionId: string, step: ResearchStep) {
  await withDbRetry(async (db) => {
    for (const s of [1, 2, 3, 4] as ResearchStep[]) {
      if (s >= step) {
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
        currentStep: step - 1,
        updatedAt: new Date(),
      })
      .where(eq(researchSessions.id, sessionId));
  });

  revalidateSession(sessionId);
  await runStepAction(sessionId, step);
}

export async function exportSessionMarkdown(
  sessionId: string,
): Promise<string> {
  const detail = await getSessionDetail(sessionId);
  if (!detail) throw new Error("Session not found");

  const ctx = buildPipelineContext(detail);
  return renderFullReport({
    topic: detail.topic,
    role: detail.role,
    step1: ctx.step1,
    step2: ctx.step2,
    step3: ctx.step3,
    step4: ctx.step4,
  });
}

export async function getLlmStatusAction() {
  const { isAiEnabled, resolveLlmProvider } = await import("@perspective-os/ai");
  return {
    enabled: isAiEnabled(),
    provider: resolveLlmProvider(),
  };
}

export async function getWebSearchStatusAction() {
  const { isWebSearchEnabled } = await import("@perspective-os/ai");
  return {
    enabled: isWebSearchEnabled(),
  };
}

export async function exploreMissingPerspectiveAction(sessionId: string) {
  const detail = await getSessionDetail(sessionId);
  if (!detail) throw new Error("Session not found");

  const ctx = buildPipelineContext(detail);
  if (!ctx.step1 || !ctx.step3 || !ctx.step4) {
    throw new Error("Complete steps 1–4 before exploring a missing perspective");
  }

  try {
    const result = await exploreMissingPerspective({
      topic: detail.topic,
      role: detail.role,
      step1: ctx.step1,
      step3: ctx.step3,
      step4: ctx.step4,
    });

    const sessionExtras: SessionExtras = {
      supplementaryPerspective: result.supplementaryPerspective,
      briefingDelta: result.briefingDelta,
    };

    await withDbRetry(async (db) => {
      await db
        .update(researchSessions)
        .set({ sessionExtras, updatedAt: new Date() })
        .where(eq(researchSessions.id, sessionId));
    });
  } catch (err) {
    throw new Error(friendlyLlmErrorMessage(err));
  } finally {
    revalidateSession(sessionId);
  }
}

export async function rerunWithMissingPerspectiveAction(
  sessionId: string,
  replaceSlotIndex: number,
) {
  if (replaceSlotIndex < 0 || replaceSlotIndex > 4) {
    throw new Error("replaceSlotIndex must be 0–4");
  }

  const detail = await getSessionDetail(sessionId);
  if (!detail) throw new Error("Session not found");

  const extras = detail.sessionExtras;
  if (!extras?.supplementaryPerspective) {
    throw new Error("Explore the missing perspective first");
  }

  const roster = [...resolvePerspectiveConfig(detail.perspectiveConfig)];
  const built = extras.supplementaryPerspective;
  roster[replaceSlotIndex] = {
    id: built.id,
    name: built.name,
    lens: built.corePosition.slice(0, 500),
  };

  await withDbRetry(async (db) => {
    await db
      .update(researchSessions)
      .set({
        perspectiveConfig: roster,
        updatedAt: new Date(),
      })
      .where(eq(researchSessions.id, sessionId));
  });

  await clearSessionPipelineFromStep(sessionId, 1);
  revalidateSession(sessionId);
  await runStepAction(sessionId, 1);
}
