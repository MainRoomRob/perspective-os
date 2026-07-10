import type { PerspectiveSource } from "@perspective-os/core";

export type ResearchGatherResult = {
  sources: PerspectiveSource[];
  contextBlock: string;
};

/**
 * Optional pre-research pass (web search) before Step 1.
 * Returns null today — future Tavily/Serper integration populates sources + context.
 */
export async function gatherResearchContext(
  _topic: string,
): Promise<ResearchGatherResult | null> {
  return null;
}

export function formatResearchContextBlock(result: ResearchGatherResult): string {
  const lines = result.sources.map((source, index) => {
    const urlPart = source.url ? ` — ${source.url}` : "";
    const excerptPart = source.excerpt ? `\n   Excerpt: ${source.excerpt}` : "";
    return `${index + 1}. **${source.title}** (${source.publisher}, ${source.sourceType})${urlPart}${excerptPart}`;
  });

  return `## Pre-gathered research context

Use these retrieved sources where relevant. Prefer citing from this list when applicable.

${lines.join("\n")}`;
}
