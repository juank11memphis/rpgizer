ALTER TABLE "adventures" ADD COLUMN "interviewStatus" text DEFAULT 'interviewing' NOT NULL;--> statement-breakpoint
UPDATE "adventures"
SET "interviewStatus" = 'awaiting_confirmation'
WHERE "readinessStatus" = 'ready_to_generate';--> statement-breakpoint
ALTER TABLE "adventures" ADD CONSTRAINT "adventures_interview_status_check" CHECK ("adventures"."interviewStatus" in ('interviewing', 'awaiting_confirmation', 'confirmed'));
