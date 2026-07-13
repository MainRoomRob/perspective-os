import type { PerspectiveSource } from "@perspective-os/core";

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeDays(days: number, prefix: "Published" | "Retrieved"): string {
  if (days <= 0) return `${prefix} today`;
  if (days === 1) return `${prefix} yesterday`;
  if (days < 7) return `${prefix} ${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${prefix} ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  return "";
}

function formatAbsolute(date: Date, prefix: "Published" | "Retrieved"): string {
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  const formatted = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${prefix} ${formatted}`;
}

function formatDateLabel(
  value: string | undefined,
  prefix: "Published" | "Retrieved",
): string | null {
  if (!value) return null;
  const date = parseDate(value);
  if (!date) return null;

  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 0 && days < 30) {
    const relative = formatRelativeDays(days, prefix);
    if (relative) return relative;
  }

  return formatAbsolute(date, prefix);
}

export function formatSourceRecency(source: PerspectiveSource): string | null {
  return formatDateLabel(source.publishedAt, "Published");
}

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function formatSourceMeta(source: PerspectiveSource): string {
  const parts: string[] = [];
  if (source.url) {
    const host = hostnameFromUrl(source.url);
    if (host) parts.push(host);
  } else {
    parts.push(source.publisher);
    parts.push(source.sourceType);
  }

  const recency = formatSourceRecency(source);
  if (recency) parts.push(recency);

  return parts.join(" · ");
}
