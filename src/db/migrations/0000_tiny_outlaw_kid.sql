CREATE TYPE "public"."assignment_status" AS ENUM('draft', 'published', 'grading', 'graded');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'grading', 'graded', 'error');--> statement-breakpoint
CREATE TYPE "public"."submission_type" AS ENUM('any', 'pdf', 'image', 'text');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('teacher', 'student', 'admin');--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"teacher_id" text NOT NULL,
	"title" text NOT NULL,
	"subject" text NOT NULL,
	"topic" text,
	"description" text,
	"max_score" integer DEFAULT 100 NOT NULL,
	"due_date" timestamp with time zone,
	"submission_type" "submission_type" DEFAULT 'any' NOT NULL,
	"status" "assignment_status" DEFAULT 'draft' NOT NULL,
	"rubric" jsonb,
	"grading_instructions" text,
	"reference_answers" text,
	"strictness" integer DEFAULT 3 NOT NULL,
	"spreadsheet_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classrooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"grade" text NOT NULL,
	"color" text DEFAULT '#4A90D9' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expiry" timestamp with time zone NOT NULL,
	"google_email" text,
	"scopes" text,
	"sync_folder_id" text,
	"sync_folder_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "google_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"total_score" numeric(6, 2) NOT NULL,
	"max_score" integer NOT NULL,
	"grade_letter" text NOT NULL,
	"feedback" text NOT NULL,
	"criteria_scores" jsonb NOT NULL,
	"strengths" text[],
	"improvements" text[],
	"ai_model" text NOT NULL,
	"ai_tokens_used" integer,
	"graded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by_teacher" boolean DEFAULT false NOT NULL,
	CONSTRAINT "grades_submission_id_unique" UNIQUE("submission_id")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"name" text NOT NULL,
	"roll_number" integer NOT NULL,
	"email" text,
	"parent_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"file_url" text,
	"file_type" text,
	"text_content" text,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"google_form_response_id" text,
	"google_drive_file_id" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'teacher' NOT NULL,
	"org_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_tokens" ADD CONSTRAINT "google_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;