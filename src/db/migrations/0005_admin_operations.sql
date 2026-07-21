CREATE TYPE "public"."ai_usage_status" AS ENUM('success', 'error');--> statement-breakpoint
CREATE TYPE "public"."content_report_category" AS ENUM('privacy', 'incorrect_content', 'inappropriate', 'copyright', 'other');--> statement-breakpoint
CREATE TYPE "public"."content_report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."system_event_category" AS ENUM('grading', 'sync', 'auth', 'database', 'moderation', 'system');--> statement-breakpoint
CREATE TYPE "public"."system_event_severity" AS ENUM('info', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."user_account_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "admin_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"assignment_id" uuid,
	"submission_id" uuid,
	"provider" text DEFAULT 'anthropic' NOT NULL,
	"model" text NOT NULL,
	"operation" text DEFAULT 'grade_submission' NOT NULL,
	"status" "ai_usage_status" NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"input_price_usd_micros_per_million" integer NOT NULL,
	"output_price_usd_micros_per_million" integer NOT NULL,
	"estimated_cost_usd_micros" integer DEFAULT 0 NOT NULL,
	"usd_to_inr_micros" integer NOT NULL,
	"estimated_cost_inr_paise" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text,
	"submission_id" uuid,
	"category" "content_report_category" NOT NULL,
	"reason" text NOT NULL,
	"status" "content_report_status" DEFAULT 'open' NOT NULL,
	"reviewed_by" text,
	"resolution_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "system_event_category" NOT NULL,
	"severity" "system_event_severity" NOT NULL,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"user_id" text,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "removed_by" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "removal_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" "user_account_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "submission_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "monthly_submission_quota" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_events" ADD CONSTRAINT "system_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_events_actor_created_idx" ON "admin_audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_events_target_created_idx" ON "admin_audit_events" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_created_at_idx" ON "ai_usage_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_user_created_idx" ON "ai_usage_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_status_created_idx" ON "ai_usage_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_reports_reporter_submission_unique" ON "content_reports" USING btree ("reporter_id","submission_id");--> statement-breakpoint
CREATE INDEX "content_reports_status_created_idx" ON "content_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "content_reports_submission_idx" ON "content_reports" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "system_events_severity_created_idx" ON "system_events" USING btree ("severity","created_at");--> statement-breakpoint
CREATE INDEX "system_events_category_created_idx" ON "system_events" USING btree ("category","created_at");--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_removed_by_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "submissions_removed_at_idx" ON "submissions" USING btree ("removed_at");--> statement-breakpoint
CREATE INDEX "users_account_status_idx" ON "users" USING btree ("account_status");