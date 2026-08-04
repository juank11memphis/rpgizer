CREATE TABLE "adventureQuestSteps" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"questId" text NOT NULL,
	"description" text NOT NULL,
	"sequenceNumber" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventure_quest_steps_quest_sequence_unique" UNIQUE("questId","sequenceNumber"),
	CONSTRAINT "adventure_quest_steps_sequence_number_check" CHECK ("adventureQuestSteps"."sequenceNumber" > 0)
);
--> statement-breakpoint
ALTER TABLE "adventureQuestSteps" ADD CONSTRAINT "adventureQuestSteps_questId_adventureQuests_id_fk" FOREIGN KEY ("questId") REFERENCES "public"."adventureQuests"("id") ON DELETE cascade ON UPDATE no action;
