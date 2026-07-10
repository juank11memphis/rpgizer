CREATE TABLE "adventureFocusedNextActions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"adventureId" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"sequenceNumber" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventure_focused_next_actions_adventure_sequence_unique" UNIQUE("adventureId","sequenceNumber"),
	CONSTRAINT "adventure_focused_next_actions_sequence_number_check" CHECK ("adventureFocusedNextActions"."sequenceNumber" > 0)
);
--> statement-breakpoint
ALTER TABLE "adventureFocusedNextActions" ADD CONSTRAINT "adventureFocusedNextActions_adventureId_adventures_id_fk" FOREIGN KEY ("adventureId") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;