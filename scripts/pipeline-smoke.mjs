import { runFullPipeline } from "../packages/ai/src/pipeline.ts";
import { renderFullReport } from "../packages/ai/src/render-markdown.ts";
import { isAiEnabled, resolveLlmProvider } from "../packages/ai/src/llm.ts";

const topic = process.argv[2] ?? "AI agents in enterprise software";
const role = process.argv[3] ?? "VP Marketing at a B2B SaaS company";

const provider = resolveLlmProvider();
console.log(
  provider
    ? `Running pipeline with ${provider}…`
    : "Running pipeline in mock mode (no API key)…",
);
console.log(`Topic: ${topic}`);
console.log(`Role: ${role}\n`);

const brief = {
  topic,
  role,
  decision: process.argv[4] ?? `What should ${role} prioritise regarding ${topic}?`,
  context: process.argv[5],
};

const result = await runFullPipeline(brief);
const report = renderFullReport({
  topic,
  role,
  step1: result.step1,
  step2: result.step2,
  step3: result.step3,
  step4: result.step4,
});

console.log(`Mode: ${result.mock ? "mock" : "live"}`);
console.log(`Perspectives: ${result.step1.perspectives.length}`);
console.log(`Contradictions: ${result.step2.directContradictions.length}`);
console.log(`Key findings: ${result.step3.keyFindings.length}`);
console.log(`Grade: ${result.step4.overallAssessment.grade}`);
console.log(`\n--- Report preview (first 500 chars) ---\n`);
console.log(report.slice(0, 500));
console.log("\nPipeline smoke test passed.");
