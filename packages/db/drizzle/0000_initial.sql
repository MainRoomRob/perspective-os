CREATE TABLE IF NOT EXISTS "research_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "step_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"step" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"output" jsonb,
	"raw_markdown" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "step_outputs" ADD CONSTRAINT "step_outputs_session_id_research_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."research_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
