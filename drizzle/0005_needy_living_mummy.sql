CREATE TABLE "adventureAchievements" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"adventureId" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"unlockCondition" text NOT NULL,
	"status" text DEFAULT 'locked' NOT NULL,
	"sequenceNumber" integer NOT NULL,
	"unlockedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventure_achievements_adventure_sequence_unique" UNIQUE("adventureId","sequenceNumber"),
	CONSTRAINT "adventure_achievements_sequence_number_check" CHECK ("adventureAchievements"."sequenceNumber" > 0),
	CONSTRAINT "adventure_achievements_status_check" CHECK ("adventureAchievements"."status" in ('locked', 'unlocked')),
	CONSTRAINT "adventure_achievements_unlocked_at_check" CHECK (("adventureAchievements"."status" = 'unlocked' and "adventureAchievements"."unlockedAt" is not null) or ("adventureAchievements"."status" = 'locked' and "adventureAchievements"."unlockedAt" is null))
);
--> statement-breakpoint
CREATE TABLE "adventureActs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"adventureId" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"sequenceNumber" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventure_acts_adventure_sequence_unique" UNIQUE("adventureId","sequenceNumber"),
	CONSTRAINT "adventure_acts_sequence_number_check" CHECK ("adventureActs"."sequenceNumber" > 0)
);
--> statement-breakpoint
CREATE TABLE "adventureBossFightInventoryItems" (
	"bossFightId" text NOT NULL,
	"inventoryItemId" text NOT NULL,
	CONSTRAINT "adventureBossFightInventoryItems_bossFightId_inventoryItemId_pk" PRIMARY KEY("bossFightId","inventoryItemId")
);
--> statement-breakpoint
CREATE TABLE "adventureBossFightSkillRewards" (
	"bossFightId" text NOT NULL,
	"skillId" text NOT NULL,
	"xp" integer NOT NULL,
	CONSTRAINT "adventureBossFightSkillRewards_bossFightId_skillId_pk" PRIMARY KEY("bossFightId","skillId"),
	CONSTRAINT "adventure_boss_fight_skill_rewards_xp_check" CHECK ("adventureBossFightSkillRewards"."xp" > 0)
);
--> statement-breakpoint
CREATE TABLE "adventureBossFights" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"adventureId" text NOT NULL,
	"actId" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"doneCondition" text NOT NULL,
	"rewardIntent" text NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"sequenceNumber" integer NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventure_boss_fights_act_sequence_unique" UNIQUE("actId","sequenceNumber"),
	CONSTRAINT "adventure_boss_fights_sequence_number_check" CHECK ("adventureBossFights"."sequenceNumber" > 0),
	CONSTRAINT "adventure_boss_fights_status_check" CHECK ("adventureBossFights"."status" in ('not_started', 'completed')),
	CONSTRAINT "adventure_boss_fights_completed_at_check" CHECK (("adventureBossFights"."status" = 'completed' and "adventureBossFights"."completedAt" is not null) or ("adventureBossFights"."status" = 'not_started' and "adventureBossFights"."completedAt" is null))
);
--> statement-breakpoint
CREATE TABLE "adventureInventoryItems" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"adventureId" text NOT NULL,
	"name" text NOT NULL,
	"purpose" text NOT NULL,
	"status" text DEFAULT 'needed' NOT NULL,
	"sequenceNumber" integer NOT NULL,
	"acquiredAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventure_inventory_items_adventure_sequence_unique" UNIQUE("adventureId","sequenceNumber"),
	CONSTRAINT "adventure_inventory_items_sequence_number_check" CHECK ("adventureInventoryItems"."sequenceNumber" > 0),
	CONSTRAINT "adventure_inventory_items_status_check" CHECK ("adventureInventoryItems"."status" in ('needed', 'acquired')),
	CONSTRAINT "adventure_inventory_items_acquired_at_check" CHECK (("adventureInventoryItems"."status" = 'acquired' and "adventureInventoryItems"."acquiredAt" is not null) or ("adventureInventoryItems"."status" = 'needed' and "adventureInventoryItems"."acquiredAt" is null))
);
--> statement-breakpoint
CREATE TABLE "adventureQuestInventoryItems" (
	"questId" text NOT NULL,
	"inventoryItemId" text NOT NULL,
	CONSTRAINT "adventureQuestInventoryItems_questId_inventoryItemId_pk" PRIMARY KEY("questId","inventoryItemId")
);
--> statement-breakpoint
CREATE TABLE "adventureQuestSkillRewards" (
	"questId" text NOT NULL,
	"skillId" text NOT NULL,
	"xp" integer NOT NULL,
	CONSTRAINT "adventureQuestSkillRewards_questId_skillId_pk" PRIMARY KEY("questId","skillId"),
	CONSTRAINT "adventure_quest_skill_rewards_xp_check" CHECK ("adventureQuestSkillRewards"."xp" > 0)
);
--> statement-breakpoint
CREATE TABLE "adventureQuests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"adventureId" text NOT NULL,
	"actId" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"doneCondition" text NOT NULL,
	"rewardIntent" text NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"sequenceNumber" integer NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventure_quests_act_type_sequence_unique" UNIQUE("actId","type","sequenceNumber"),
	CONSTRAINT "adventure_quests_type_check" CHECK ("adventureQuests"."type" in ('main', 'side')),
	CONSTRAINT "adventure_quests_status_check" CHECK ("adventureQuests"."status" in ('not_started', 'completed')),
	CONSTRAINT "adventure_quests_sequence_number_check" CHECK ("adventureQuests"."sequenceNumber" > 0),
	CONSTRAINT "adventure_quests_completed_at_check" CHECK (("adventureQuests"."status" = 'completed' and "adventureQuests"."completedAt" is not null) or ("adventureQuests"."status" = 'not_started' and "adventureQuests"."completedAt" is null))
);
--> statement-breakpoint
CREATE TABLE "adventureSkills" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"adventureId" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adventure_skills_adventure_name_unique" UNIQUE("adventureId","name"),
	CONSTRAINT "adventure_skills_xp_check" CHECK ("adventureSkills"."xp" >= 0),
	CONSTRAINT "adventure_skills_level_check" CHECK ("adventureSkills"."level" >= 1)
);
--> statement-breakpoint
CREATE TABLE "generatedAdventureManifests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"adventureId" text NOT NULL,
	"interviewOutputArtifactId" text NOT NULL,
	"title" text NOT NULL,
	"themeSummary" text NOT NULL,
	"goalSummary" text NOT NULL,
	"safetySummary" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "generated_adventure_manifests_adventure_unique" UNIQUE("adventureId")
);
--> statement-breakpoint
ALTER TABLE "adventures" DROP CONSTRAINT "adventures_state_check";--> statement-breakpoint
ALTER TABLE "adventureAchievements" ADD CONSTRAINT "adventureAchievements_adventureId_adventures_id_fk" FOREIGN KEY ("adventureId") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureActs" ADD CONSTRAINT "adventureActs_adventureId_adventures_id_fk" FOREIGN KEY ("adventureId") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureBossFightInventoryItems" ADD CONSTRAINT "adventure_boss_fight_inventory_boss_fk" FOREIGN KEY ("bossFightId") REFERENCES "public"."adventureBossFights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureBossFightInventoryItems" ADD CONSTRAINT "adventure_boss_fight_inventory_item_fk" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."adventureInventoryItems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureBossFightSkillRewards" ADD CONSTRAINT "adventure_boss_fight_skill_rewards_boss_fk" FOREIGN KEY ("bossFightId") REFERENCES "public"."adventureBossFights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureBossFightSkillRewards" ADD CONSTRAINT "adventure_boss_fight_skill_rewards_skill_fk" FOREIGN KEY ("skillId") REFERENCES "public"."adventureSkills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureBossFights" ADD CONSTRAINT "adventureBossFights_adventureId_adventures_id_fk" FOREIGN KEY ("adventureId") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureBossFights" ADD CONSTRAINT "adventureBossFights_actId_adventureActs_id_fk" FOREIGN KEY ("actId") REFERENCES "public"."adventureActs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureInventoryItems" ADD CONSTRAINT "adventureInventoryItems_adventureId_adventures_id_fk" FOREIGN KEY ("adventureId") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureQuestInventoryItems" ADD CONSTRAINT "adventure_quest_inventory_items_quest_fk" FOREIGN KEY ("questId") REFERENCES "public"."adventureQuests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureQuestInventoryItems" ADD CONSTRAINT "adventure_quest_inventory_items_item_fk" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."adventureInventoryItems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureQuestSkillRewards" ADD CONSTRAINT "adventureQuestSkillRewards_questId_adventureQuests_id_fk" FOREIGN KEY ("questId") REFERENCES "public"."adventureQuests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureQuestSkillRewards" ADD CONSTRAINT "adventureQuestSkillRewards_skillId_adventureSkills_id_fk" FOREIGN KEY ("skillId") REFERENCES "public"."adventureSkills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureQuests" ADD CONSTRAINT "adventureQuests_adventureId_adventures_id_fk" FOREIGN KEY ("adventureId") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureQuests" ADD CONSTRAINT "adventureQuests_actId_adventureActs_id_fk" FOREIGN KEY ("actId") REFERENCES "public"."adventureActs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventureSkills" ADD CONSTRAINT "adventureSkills_adventureId_adventures_id_fk" FOREIGN KEY ("adventureId") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generatedAdventureManifests" ADD CONSTRAINT "generatedAdventureManifests_adventureId_adventures_id_fk" FOREIGN KEY ("adventureId") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generatedAdventureManifests" ADD CONSTRAINT "generated_adventure_manifests_artifact_fk" FOREIGN KEY ("interviewOutputArtifactId") REFERENCES "public"."interviewOutputArtifacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adventures" ADD CONSTRAINT "adventures_state_check" CHECK ("adventures"."state" in ('drafting', 'generated'));