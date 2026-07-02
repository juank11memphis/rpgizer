CREATE TABLE "interviewOutputArtifacts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"adventureId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interview_output_artifacts_adventure_unique" UNIQUE("adventureId")
);
--> statement-breakpoint
ALTER TABLE "interviewOutputArtifacts" ADD CONSTRAINT "interviewOutputArtifacts_adventureId_adventures_id_fk" FOREIGN KEY ("adventureId") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;