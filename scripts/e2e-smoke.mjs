/**
 * End-to-end smoke: pipeline + optional DB session flow when DATABASE_URL is set.
 */
import { runFullPipeline } from "../packages/ai/src/pipeline.ts";
import { renderFullReport } from "../packages/ai/src/render-markdown.ts";
import { getDb, researchSessions, stepOutputs } from "@perspective-os/db";
import { and, eq } from "drizzle-orm";
import {
  buildPipelineContext,
  ensureStepRows,
  getSessionDetail,
} from "@perspective-os/web-server/session-data";
import { exportSessionMarkdown } from "@perspective-os/web-server/actions";

const topic = "Remote work and productivity";
const role = "Chief People Officer";
const brief = {
  topic,
  role,
  decision: "Whether to mandate return-to-office for hybrid teams",
};

console.log("1. Pipeline (mock or live)…");
const pipeline = await runFullPipeline(brief);
const report = renderFullReport({
  topic,
  role,
  step1: pipeline.step1,
  step2: pipeline.step2,
  step3: pipeline.step3,
  step4: pipeline.step4,
});

if (pipeline.step1.perspectives.length !== 5) {
  throw new Error("Expected 5 perspectives");
}
for (const perspective of pipeline.step1.perspectives) {
  if (!perspective.evidencePoints || perspective.evidencePoints.length < 2) {
    throw new Error(`Expected ≥2 evidencePoints for ${perspective.name}`);
  }
  if (!perspective.sources || perspective.sources.length < 2) {
    throw new Error(`Expected ≥2 sources for ${perspective.name}`);
  }
}
if (pipeline.step3.keyFindings.length !== 5) {
  throw new Error("Expected 5 key findings");
}
if (!report.includes("Research Briefing")) {
  throw new Error("Report missing title");
}
console.log("   Pipeline OK");

if (!process.env.DATABASE_URL) {
  console.log("2. DB flow skipped (DATABASE_URL not set)");
  console.log("\nE2E smoke passed (pipeline + export only).");
  process.exit(0);
}

console.log("2. DB session flow…");
const db = getDb();
const [session] = await db
  .insert(researchSessions)
  .values({
    topic,
    role,
    brief: { decision: brief.decision },
    status: "draft",
    currentStep: 0,
  })
  .returning();

if (!session) throw new Error("Failed to create session");

await ensureStepRows(session.id);

for (const step of [1, 2, 3, 4]) {
  const detail = await getSessionDetail(session.id);
  if (!detail) throw new Error("Session not found");
  const ctx = buildPipelineContext(detail);
  const { runResearchStep } = await import("../packages/ai/src/pipeline.ts");
  const result = await runResearchStep(step, ctx);
  await db
    .update(stepOutputs)
    .set({
      status: "complete",
      output: result.output,
      rawMarkdown: result.rawMarkdown,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(stepOutputs.sessionId, session.id),
        eq(stepOutputs.step, step),
      ),
    );
}

const exported = await exportSessionMarkdown(session.id);
if (!exported.includes(pipeline.step3.executiveSummary.slice(0, 40))) {
  throw new Error("Exported markdown missing synthesis content");
}

await db.delete(researchSessions).where(eq(researchSessions.id, session.id));
console.log("   DB session OK");
console.log("\nE2E smoke passed.");
