import type { PerspectiveSource, SessionBrief } from "@perspective-os/core";
import { isWebSearchEnabled } from "./web-search-status";
import { searchWeb } from "./web-search";

export type ResearchGatherResult = {
  sources: PerspectiveSource[];
  contextBlock: string;
};

function buildSearchQuery(brief: SessionBrief): string {
  const parts = [brief.topic, brief.decision];
  if (brief.context) parts.push(brief.context);
  return parts.join(" — ");
}

export async function gatherResearchContext(
  brief: SessionBrief,
  options: { useWebSearch?: boolean },
): Promise<ResearchGatherResult | null> {
  if (!options.useWebSearch || !isWebSearchEnabled()) {
    return null;
  }

  const sources = await searchWeb(buildSearchQuery(brief));
  if (sources.length === 0) {
    throw new Error("Web search returned no sources for this topic");
  }

  const result: ResearchGatherResult = {
    sources,
    contextBlock: "",
  };
  result.contextBlock = formatResearchContextBlock(result);
  return result;
}

export function formatResearchContextBlock(result: ResearchGatherResult): string {
  const lines = result.sources.map((source, index) => {
    const urlPart = source.url ? ` — ${source.url}` : "";
    const excerptPart = source.excerpt ? `\n   Excerpt: ${source.excerpt}` : "";
    return `${index + 1}. **${source.title}** (${source.publisher}, ${source.sourceType})${urlPart}${excerptPart}`;
  });

  return `## Pre-gathered research context

The following sources were retrieved via web search before this step. Prefer citing from this list when applicable. Set \`groundingNote\` to acknowledge these are web-retrieved sources.

${lines.join("\n")}`;
}
