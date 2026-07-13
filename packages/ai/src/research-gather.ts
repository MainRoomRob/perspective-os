import type { PerspectiveSource, SearchRecencyWindow, SessionBrief } from "@perspective-os/core";
import { formatSourceDateLine } from "./format-source-recency";
import { isWebSearchEnabled } from "./web-search-status";
import { searchWeb } from "./web-search";

export type ResearchGatherResult = {
  sources: PerspectiveSource[];
  contextBlock: string;
};

const RECENCY_WINDOW_LABELS: Record<SearchRecencyWindow, string> = {
  week: "past week",
  month: "past month",
  year: "past year",
};

function buildSearchQuery(brief: SessionBrief): string {
  const parts = [brief.topic, brief.decision];
  if (brief.context) parts.push(brief.context);
  return parts.join(" — ");
}

function formatSourceLine(source: PerspectiveSource, index: number): string {
  const urlPart = source.url ? ` — ${source.url}` : "";
  const excerptPart = source.excerpt ? `\n   Excerpt: ${source.excerpt}` : "";
  const datePart = formatSourceDateLine(source);
  return `${index + 1}. **${source.title}** (${source.publisher}, ${source.sourceType})${urlPart}${datePart}${excerptPart}`;
}

function mergeSearchPools(
  recent: PerspectiveSource[],
  historical: PerspectiveSource[],
): PerspectiveSource[] {
  const recentUrls = new Set(
    recent.map((source) => source.url).filter((url): url is string => Boolean(url)),
  );

  const taggedRecent = recent.map((source) => ({
    ...source,
    searchPool: "recent" as const,
  }));

  const taggedHistorical = historical
    .filter((source) => !source.url || !recentUrls.has(source.url))
    .map((source) => ({
      ...source,
      searchPool: "historical" as const,
    }));

  return [...taggedRecent, ...taggedHistorical];
}

export async function gatherResearchContext(
  brief: SessionBrief,
  options: {
    useWebSearch?: boolean;
    searchRecencyWindow?: SearchRecencyWindow;
  },
): Promise<ResearchGatherResult | null> {
  if (!options.useWebSearch || !isWebSearchEnabled()) {
    return null;
  }

  const query = buildSearchQuery(brief);
  let sources: PerspectiveSource[];

  if (options.searchRecencyWindow) {
    const window = options.searchRecencyWindow;
    const [recent, historical] = await Promise.all([
      searchWeb(query, {
        timeRange: window,
        topic: window === "year" ? "general" : "news",
      }),
      searchWeb(query),
    ]);

    if (recent.length === 0 && historical.length === 0) {
      throw new Error("Web search returned no sources for this topic");
    }

    sources = mergeSearchPools(recent, historical);
  } else {
    sources = await searchWeb(query);
    if (sources.length === 0) {
      throw new Error("Web search returned no sources for this topic");
    }
  }

  const result: ResearchGatherResult = {
    sources,
    contextBlock: "",
  };
  result.contextBlock = formatResearchContextBlock(result, options.searchRecencyWindow);
  return result;
}

export function formatResearchContextBlock(
  result: ResearchGatherResult,
  searchRecencyWindow?: SearchRecencyWindow,
): string {
  const hasPools = result.sources.some((source) => source.searchPool != null);

  let body: string;
  if (hasPools && searchRecencyWindow) {
    const recentSources = result.sources.filter((s) => s.searchPool === "recent");
    const historicalSources = result.sources.filter(
      (s) => s.searchPool === "historical",
    );
    const windowLabel = RECENCY_WINDOW_LABELS[searchRecencyWindow];

    const recentLines = recentSources.map((source, index) =>
      formatSourceLine(source, index),
    );
    const historicalLines = historicalSources.map((source, index) =>
      formatSourceLine(source, index),
    );

    body = [
      `### Recent sources (${windowLabel})`,
      recentLines.length > 0 ? recentLines.join("\n") : "_No results in this window._",
      "",
      "### Broader sources (for historical and long-run lenses)",
      historicalLines.length > 0
        ? historicalLines.join("\n")
        : "_No additional results._",
      "",
      "**Pool routing:** Practitioner, Skeptic, and Economist perspectives should prefer the recent pool. Historian should prefer the broader pool and use recent sources only for what changed lately. Academic should use both — broader for foundational claims, recent for new evidence.",
    ].join("\n");
  } else {
    body = result.sources.map((source, index) => formatSourceLine(source, index)).join("\n");
  }

  return `## Pre-gathered research context

The following sources were retrieved via web search before this step. Prefer citing from this list when applicable. Set \`groundingNote\` to acknowledge these are web-retrieved sources.

**URL rules for pre-gathered sources:** When citing any source from this list, copy the exact \`url\` shown. Do not invent URLs for sources outside this list. Include \`publishedAt\` when shown below — never invent publication dates. Do not include \`retrievedAt\` in your output.

${body}`;
}
