CREATE TYPE "public"."account_plan" AS ENUM('unassigned', 'subscription', 'pay_per_submission');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_plan" "account_plan" DEFAULT 'unassigned' NOT NULL;--> statement-breakpoint
CREATE INDEX "users_account_plan_idx" ON "users" USING btree ("account_plan");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");