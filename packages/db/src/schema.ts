import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type {
  ContradictionMapOutput,
  MultiPerspectiveOutput,
  PeerReviewOutput,
  SessionExtras,
  SessionStatus,
  StepStatus,
  SynthesisOutput,
  SessionBriefExtras,
} from "@perspective-os/core";
import type { PerspectiveSlot } from "@perspective-os/core";

export const researchSessions = pgTable("research_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: text("topic").notNull(),
  role: text("role").notNull(),
  status: text("status").$type<SessionStatus>().notNull().default("draft"),
  currentStep: integer("current_step").notNull().default(0),
  sessionExtras: jsonb("session_extras").$type<SessionExtras | null>(),
  perspectiveConfig: jsonb("perspective_config").$type<
    PerspectiveSlot[] | null
  >(),
  brief: jsonb("brief").$type<SessionBriefExtras | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const stepOutputs = pgTable("step_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => researchSessions.id, { onDelete: "cascade" }),
  step: integer("step").notNull(),
  status: text("status").$type<StepStatus>().notNull().default("pending"),
  output: jsonb("output").$type<
    | MultiPerspectiveOutput
    | ContradictionMapOutput
    | SynthesisOutput
    | PeerReviewOutput
    | null
  >(),
  rawMarkdown: text("raw_markdown"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
