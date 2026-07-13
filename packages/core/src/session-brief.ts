import { z } from "zod";

export const sessionBriefSchema = z.object({
  topic: z.string().min(1),
  role: z.string().min(1),
  decision: z.string().min(1).max(500),
  context: z.string().max(1000).optional(),
});

export type SessionBrief = z.infer<typeof sessionBriefSchema>;

export const searchRecencyWindowSchema = z.enum(["week", "month", "year"]);

export type SearchRecencyWindow = z.infer<typeof searchRecencyWindowSchema>;

/** Stored in `research_sessions.brief` jsonb (topic/role remain on the row). */
export const sessionBriefExtrasSchema = z.object({
  decision: z.string().min(1).max(500),
  context: z.string().max(1000).optional(),
  useWebSearch: z.boolean().optional(),
  searchRecencyWindow: searchRecencyWindowSchema.optional(),
});

export type SessionBriefExtras = z.infer<typeof sessionBriefExtrasSchema>;

export type SessionBriefSource = {
  topic: string;
  role: string;
  brief?: SessionBriefExtras | null;
};

export function resolveSessionBrief(source: SessionBriefSource): SessionBrief {
  const topic = source.topic.trim();
  const role = source.role.trim();
  const decision = source.brief?.decision?.trim() || topic;
  const contextRaw = source.brief?.context?.trim();
  const context = contextRaw && contextRaw.length > 0 ? contextRaw : undefined;

  return sessionBriefSchema.parse({
    topic,
    role,
    decision,
    context,
  });
}

export function formatSessionBriefBlock(brief: SessionBrief): string {
  const lines = [
    "## Research brief",
    `- Topic: ${brief.topic}`,
    `- Reader role: ${brief.role}`,
    `- Decision to inform: ${brief.decision}`,
  ];

  if (brief.context) {
    lines.push(`- Additional context: ${brief.context}`);
  }

  lines.push(
    "",
    "Each perspective should stress-test implications for the decision above, not produce generic commentary.",
  );

  return lines.join("\n");
}

export function parseSessionBriefFromFormData(formData: FormData): SessionBrief {
  const topic = String(formData.get("topic") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const contextRaw = String(formData.get("context") ?? "").trim();

  return sessionBriefSchema.parse({
    topic,
    role,
    decision,
    context: contextRaw.length > 0 ? contextRaw : undefined,
  });
}

export function sessionBriefExtrasFromBrief(
  brief: SessionBrief,
  options?: { useWebSearch?: boolean; searchRecencyWindow?: SearchRecencyWindow },
): SessionBriefExtras {
  return sessionBriefExtrasSchema.parse({
    decision: brief.decision,
    context: brief.context,
    ...(options?.useWebSearch ? { useWebSearch: true } : {}),
    ...(options?.useWebSearch && options.searchRecencyWindow
      ? { searchRecencyWindow: options.searchRecencyWindow }
      : {}),
  });
}

export const rosterRecommendationSchema = z
  .object({
    recommendationType: z.enum(["preset", "custom"]),
    presetId: z.string().min(1).optional(),
    slots: z
      .array(
        z.object({
          catalogId: z.string().min(1),
        }),
      )
      .length(5)
      .optional(),
    rationale: z.string().min(1),
    slotRationale: z.array(z.string().min(1)).length(5).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recommendationType === "preset") {
      if (!data.presetId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "presetId is required when recommendationType is preset",
          path: ["presetId"],
        });
      }
    } else if (!data.slots || data.slots.length !== 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "slots must contain exactly 5 catalogId entries for custom",
        path: ["slots"],
      });
    }
  });

export type RosterRecommendation = z.infer<typeof rosterRecommendationSchema>;
