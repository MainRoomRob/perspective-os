import type { MultiPerspectiveOutput, PerspectiveSource } from "@perspective-os/core";

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findGatheredMatch(
  source: PerspectiveSource,
  gatheredSources: PerspectiveSource[],
): PerspectiveSource | undefined {
  const titleNorm = normalizeForMatch(source.title);
  const publisherNorm = normalizeForMatch(source.publisher);

  for (const candidate of gatheredSources) {
    const candidateTitle = normalizeForMatch(candidate.title);
    const candidatePublisher = normalizeForMatch(candidate.publisher);

    if (titleNorm === candidateTitle) return candidate;
    if (
      titleNorm.length > 10 &&
      (candidateTitle.includes(titleNorm) || titleNorm.includes(candidateTitle))
    ) {
      return candidate;
    }
    if (
      publisherNorm &&
      publisherNorm === candidatePublisher &&
      titleNorm.split(" ").some(
        (word) => word.length > 4 && candidateTitle.includes(word),
      )
    ) {
      return candidate;
    }
  }

  return undefined;
}

function enrichSource(
  source: PerspectiveSource,
  gatheredSources: PerspectiveSource[],
): PerspectiveSource {
  const match = findGatheredMatch(source, gatheredSources);
  if (!match) return source;

  return {
    ...source,
    url: source.url ?? match.url,
    excerpt: source.excerpt ?? match.excerpt,
    publishedAt: source.publishedAt ?? match.publishedAt,
    retrievedAt: source.retrievedAt ?? match.retrievedAt,
  };
}

export function enrichMultiPerspectiveOutput(
  output: MultiPerspectiveOutput,
  gatheredSources?: PerspectiveSource[],
): MultiPerspectiveOutput {
  if (!gatheredSources?.length) return output;

  return {
    ...output,
    perspectives: output.perspectives.map((perspective) => ({
      ...perspective,
      sources: perspective.sources?.map((source) =>
        enrichSource(source, gatheredSources),
      ),
    })),
  };
}
