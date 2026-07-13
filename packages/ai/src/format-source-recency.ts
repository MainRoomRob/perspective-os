import type { PerspectiveSource } from "@perspective-os/core";

type SourceRecencyFields = Pick<PerspectiveSource, "publishedAt" | "retrievedAt">;

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

export function formatSourceRecency(source: SourceRecencyFields): string | null {
  return formatDateLabel(source.publishedAt, "Published");
}

export function formatSourceDateLine(source: SourceRecencyFields): string {
  const recency = formatSourceRecency(source);
  return recency ? ` · ${recency}` : "";
}
