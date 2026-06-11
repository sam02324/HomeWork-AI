ALTER TABLE "grades" ADD COLUMN "ai_detection_score" integer;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "ai_detection_flag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "ai_rationale" text;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "chat_history" jsonb;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "teacher_override_score" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "teacher_note" text;