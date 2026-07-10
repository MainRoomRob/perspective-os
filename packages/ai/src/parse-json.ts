import type { ZodSchema } from "zod";

export function parseJsonResponse<T>(
  raw: string,
  schema: ZodSchema<T>,
): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        error: result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      };
    }
    return { ok: true, data: result.data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}
