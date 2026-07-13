import type { PerspectiveSource, SourceType } from "@perspective-os/core";
import { tavily } from "@tavily/core";

const EXCERPT_MAX = 300;

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

export async function searchWeb(query: string): Promise<PerspectiveSource[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Web search is not configured (set TAVILY_API_KEY)");
  }

  const client = tavily({ apiKey });
  const response = await client.search(query, {
    searchDepth: "advanced",
    chunksPerSource: 3,
    maxResults: 10,
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
        retrievedAt,
      } satisfies PerspectiveSource;
    });
}
