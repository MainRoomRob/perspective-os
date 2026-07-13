import type { PerspectiveSource, SearchRecencyWindow, SourceType } from "@perspective-os/core";
import { tavily } from "@tavily/core";

const EXCERPT_MAX = 300;

export type SearchWebOptions = {
  timeRange?: SearchRecencyWindow;
  topic?: "general" | "news";
};

function publisherFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname || "Unknown";
  } catch {
    return "Unknown";
  }
}

function inferSourceType(url: string, title: string): SourceType {
  const lower = `${url} ${title}`.toLowerCase();
  if (
    /\.edu\b|arxiv\.org|doi\.org|pubmed|ncbi\.nlm|scholar|journal|nature\.com|science\.org/i.test(
      lower,
    )
  ) {
    return "study";
  }
  if (
    /reuters|bbc|nytimes|guardian|bloomberg|techcrunch|wired|theverge|news/i.test(
      lower,
    )
  ) {
    return "news";
  }
  if (/statista|data\.gov|census|worldbank|oecd/i.test(lower)) {
    return "data";
  }
  if (/gutenberg|isbn|book|press/i.test(lower)) {
    return "book";
  }
  if (/\.gov\b|\.org\b|who\.int|un\.org|europa\.eu/i.test(lower)) {
    return "organisation";
  }
  return "report";
}

function truncateExcerpt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= EXCERPT_MAX) return trimmed;
  return `${trimmed.slice(0, EXCERPT_MAX - 1).trimEnd()}…`;
}

function normalizePublishedAt(raw: string | undefined | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export async function searchWeb(
  query: string,
  options?: SearchWebOptions,
): Promise<PerspectiveSource[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Web search is not configured (set TAVILY_API_KEY)");
  }

  const client = tavily({ apiKey });
  const response = await client.search(query, {
    searchDepth: "advanced",
    chunksPerSource: 3,
    maxResults: 10,
    ...(options?.timeRange ? { timeRange: options.timeRange } : {}),
    ...(options?.topic ? { topic: options.topic } : {}),
  });

  const retrievedAt = new Date().toISOString();

  return (response.results ?? [])
    .filter((result) => result.title && result.url)
    .map((result) => {
      const url = result.url;
      const publisher = publisherFromUrl(url);

      return {
        title: result.title,
        publisher,
        url,
        sourceType: inferSourceType(url, result.title),
        excerpt: result.content ? truncateExcerpt(result.content) : undefined,
        publishedAt: normalizePublishedAt(result.publishedDate),
        retrievedAt,
      } satisfies PerspectiveSource;
    });
}
