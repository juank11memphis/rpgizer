CREATE TABLE "adventureInterviewMessages" (
	"id" text PRIMARY KEY NOT NULL,
	"adventureId" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"sequenceNumber" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventure_interview_messages_adventure_sequence_unique" UNIQUE("adventureId","sequenceNumber"),
	CONSTRAINT "adventure_interview_messages_role_check" CHECK ("adventureInterviewMessages"."role" in ('user', 'game_master'))
);
--> statement-breakpoint
CREATE TABLE "adventures" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"goalText" text NOT NULL,
	"title" text,
	"state" text DEFAULT 'drafting' NOT NULL,
	"readinessStatus" text DEFAULT 'not_ready' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventures_state_check" CHECK ("adventures"."state" in ('drafting')),
	CONSTRAINT "adventures_readiness_status_check" CHECK ("adventures"."readinessStatus" in ('not_ready', 'ready_to_generate'))
);
--> statement-breakpoint
ALTER TABLE "adventureInterviewMessages" ADD CONSTRAINT "adventureInterviewMessages_adventureId_adventures_id_fk" FOREIGN KEY ("adventureId") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventures" ADD CONSTRAINT "adventures_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;