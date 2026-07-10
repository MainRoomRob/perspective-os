ALTER TABLE "research_sessions" ADD COLUMN IF NOT EXISTS "session_extras" jsonb;
--> statement-breakpoint
ALTER TABLE "research_sessions" ADD COLUMN IF NOT EXISTS "perspective_config" jsonb;
