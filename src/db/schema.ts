import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({ columns: [verificationToken.identifier, verificationToken.token] }),
  ],
);

export const adventures = pgTable(
  "adventures",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalText: text("goalText").notNull(),
    title: text("title"),
    state: text("state").notNull().default("drafting"),
    readinessStatus: text("readinessStatus").notNull().default("not_ready"),
    interviewStatus: text("interviewStatus").notNull().default("interviewing"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (adventure) => [
    check("adventures_state_check", sql`${adventure.state} in ('drafting', 'generated')`),
    check(
      "adventures_readiness_status_check",
      sql`${adventure.readinessStatus} in ('not_ready', 'ready_to_generate')`,
    ),
    check(
      "adventures_interview_status_check",
      sql`${adventure.interviewStatus} in ('interviewing', 'awaiting_confirmation', 'confirmed')`,
    ),
  ],
);

export const interviewOutputArtifacts = pgTable(
  "interviewOutputArtifacts",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (artifact) => [
    unique("interview_output_artifacts_adventure_unique").on(artifact.adventureId),
  ],
);

export const generatedAdventureManifests = pgTable(
  "generatedAdventureManifests",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    interviewOutputArtifactId: text("interviewOutputArtifactId").notNull(),
    title: text("title").notNull(),
    themeSummary: text("themeSummary").notNull(),
    goalSummary: text("goalSummary").notNull(),
    safetySummary: text("safetySummary"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (manifest) => [
    unique("generated_adventure_manifests_adventure_unique").on(manifest.adventureId),
    foreignKey({
      columns: [manifest.interviewOutputArtifactId],
      foreignColumns: [interviewOutputArtifacts.id],
      name: "generated_adventure_manifests_artifact_fk",
    }).onDelete("restrict"),
  ],
);

export const adventureActs = pgTable(
  "adventureActs",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    sequenceNumber: integer("sequenceNumber").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (act) => [
    unique("adventure_acts_adventure_sequence_unique").on(
      act.adventureId,
      act.sequenceNumber,
    ),
    check("adventure_acts_sequence_number_check", sql`${act.sequenceNumber} > 0`),
  ],
);

export const adventureSkills = pgTable(
  "adventureSkills",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (skill) => [
    unique("adventure_skills_adventure_name_unique").on(skill.adventureId, skill.name),
    check("adventure_skills_xp_check", sql`${skill.xp} >= 0`),
    check("adventure_skills_level_check", sql`${skill.level} >= 1`),
  ],
);

export const adventureInventoryItems = pgTable(
  "adventureInventoryItems",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    purpose: text("purpose").notNull(),
    status: text("status").notNull().default("needed"),
    sequenceNumber: integer("sequenceNumber").notNull(),
    acquiredAt: timestamp("acquiredAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (item) => [
    unique("adventure_inventory_items_adventure_sequence_unique").on(
      item.adventureId,
      item.sequenceNumber,
    ),
    check("adventure_inventory_items_sequence_number_check", sql`${item.sequenceNumber} > 0`),
    check("adventure_inventory_items_status_check", sql`${item.status} in ('needed', 'acquired')`),
    check(
      "adventure_inventory_items_acquired_at_check",
      sql`(${item.status} = 'acquired' and ${item.acquiredAt} is not null) or (${item.status} = 'needed' and ${item.acquiredAt} is null)`,
    ),
  ],
);

export const adventureAchievements = pgTable(
  "adventureAchievements",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    unlockCondition: text("unlockCondition").notNull(),
    status: text("status").notNull().default("locked"),
    sequenceNumber: integer("sequenceNumber").notNull(),
    unlockedAt: timestamp("unlockedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (achievement) => [
    unique("adventure_achievements_adventure_sequence_unique").on(
      achievement.adventureId,
      achievement.sequenceNumber,
    ),
    check(
      "adventure_achievements_sequence_number_check",
      sql`${achievement.sequenceNumber} > 0`,
    ),
    check(
      "adventure_achievements_status_check",
      sql`${achievement.status} in ('locked', 'unlocked')`,
    ),
    check(
      "adventure_achievements_unlocked_at_check",
      sql`(${achievement.status} = 'unlocked' and ${achievement.unlockedAt} is not null) or (${achievement.status} = 'locked' and ${achievement.unlockedAt} is null)`,
    ),
  ],
);

export const adventureFocusedNextActions = pgTable(
  "adventureFocusedNextActions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    sequenceNumber: integer("sequenceNumber").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (action) => [
    unique("adventure_focused_next_actions_adventure_sequence_unique").on(
      action.adventureId,
      action.sequenceNumber,
    ),
    check(
      "adventure_focused_next_actions_sequence_number_check",
      sql`${action.sequenceNumber} > 0`,
    ),
  ],
);

export const adventureQuests = pgTable(
  "adventureQuests",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    actId: text("actId")
      .notNull()
      .references(() => adventureActs.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    doneCondition: text("doneCondition").notNull(),
    rewardIntent: text("rewardIntent").notNull(),
    status: text("status").notNull().default("not_started"),
    sequenceNumber: integer("sequenceNumber").notNull(),
    completedAt: timestamp("completedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (quest) => [
    unique("adventure_quests_act_type_sequence_unique").on(
      quest.actId,
      quest.type,
      quest.sequenceNumber,
    ),
    check("adventure_quests_type_check", sql`${quest.type} in ('main', 'side')`),
    check("adventure_quests_status_check", sql`${quest.status} in ('not_started', 'completed')`),
    check("adventure_quests_sequence_number_check", sql`${quest.sequenceNumber} > 0`),
    check(
      "adventure_quests_completed_at_check",
      sql`(${quest.status} = 'completed' and ${quest.completedAt} is not null) or (${quest.status} = 'not_started' and ${quest.completedAt} is null)`,
    ),
  ],
);

export const adventureBossFights = pgTable(
  "adventureBossFights",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    actId: text("actId")
      .notNull()
      .references(() => adventureActs.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    doneCondition: text("doneCondition").notNull(),
    rewardIntent: text("rewardIntent").notNull(),
    status: text("status").notNull().default("not_started"),
    sequenceNumber: integer("sequenceNumber").notNull(),
    completedAt: timestamp("completedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (bossFight) => [
    unique("adventure_boss_fights_act_sequence_unique").on(
      bossFight.actId,
      bossFight.sequenceNumber,
    ),
    check("adventure_boss_fights_sequence_number_check", sql`${bossFight.sequenceNumber} > 0`),
    check(
      "adventure_boss_fights_status_check",
      sql`${bossFight.status} in ('not_started', 'completed')`,
    ),
    check(
      "adventure_boss_fights_completed_at_check",
      sql`(${bossFight.status} = 'completed' and ${bossFight.completedAt} is not null) or (${bossFight.status} = 'not_started' and ${bossFight.completedAt} is null)`,
    ),
  ],
);


export const adventureQuestSteps = pgTable(
  "adventureQuestSteps",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    questId: text("questId")
      .notNull()
      .references(() => adventureQuests.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    sequenceNumber: integer("sequenceNumber").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (step) => [
    unique("adventure_quest_steps_quest_sequence_unique").on(
      step.questId,
      step.sequenceNumber,
    ),
    check("adventure_quest_steps_sequence_number_check", sql`${step.sequenceNumber} > 0`),
  ],
);

export const adventureQuestSkillRewards = pgTable(
  "adventureQuestSkillRewards",
  {
    questId: text("questId")
      .notNull()
      .references(() => adventureQuests.id, { onDelete: "cascade" }),
    skillId: text("skillId")
      .notNull()
      .references(() => adventureSkills.id, { onDelete: "cascade" }),
    xp: integer("xp").notNull(),
  },
  (reward) => [
    primaryKey({ columns: [reward.questId, reward.skillId] }),
    check("adventure_quest_skill_rewards_xp_check", sql`${reward.xp} > 0`),
  ],
);

export const adventureBossFightSkillRewards = pgTable(
  "adventureBossFightSkillRewards",
  {
    bossFightId: text("bossFightId").notNull(),
    skillId: text("skillId").notNull(),
    xp: integer("xp").notNull(),
  },
  (reward) => [
    primaryKey({ columns: [reward.bossFightId, reward.skillId] }),
    foreignKey({
      columns: [reward.bossFightId],
      foreignColumns: [adventureBossFights.id],
      name: "adventure_boss_fight_skill_rewards_boss_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [reward.skillId],
      foreignColumns: [adventureSkills.id],
      name: "adventure_boss_fight_skill_rewards_skill_fk",
    }).onDelete("cascade"),
    check("adventure_boss_fight_skill_rewards_xp_check", sql`${reward.xp} > 0`),
  ],
);

export const adventureQuestInventoryItems = pgTable(
  "adventureQuestInventoryItems",
  {
    questId: text("questId").notNull(),
    inventoryItemId: text("inventoryItemId").notNull(),
  },
  (link) => [
    primaryKey({ columns: [link.questId, link.inventoryItemId] }),
    foreignKey({
      columns: [link.questId],
      foreignColumns: [adventureQuests.id],
      name: "adventure_quest_inventory_items_quest_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [link.inventoryItemId],
      foreignColumns: [adventureInventoryItems.id],
      name: "adventure_quest_inventory_items_item_fk",
    }).onDelete("cascade"),
  ],
);

export const adventureBossFightInventoryItems = pgTable(
  "adventureBossFightInventoryItems",
  {
    bossFightId: text("bossFightId").notNull(),
    inventoryItemId: text("inventoryItemId").notNull(),
  },
  (link) => [
    primaryKey({ columns: [link.bossFightId, link.inventoryItemId] }),
    foreignKey({
      columns: [link.bossFightId],
      foreignColumns: [adventureBossFights.id],
      name: "adventure_boss_fight_inventory_boss_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [link.inventoryItemId],
      foreignColumns: [adventureInventoryItems.id],
      name: "adventure_boss_fight_inventory_item_fk",
    }).onDelete("cascade"),
  ],
);

export const adventureInterviewMessages = pgTable(
  "adventureInterviewMessages",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    adventureId: text("adventureId")
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    sequenceNumber: integer("sequenceNumber").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (message) => [
    check(
      "adventure_interview_messages_role_check",
      sql`${message.role} in ('user', 'game_master')`,
    ),
    unique("adventure_interview_messages_adventure_sequence_unique").on(
      message.adventureId,
      message.sequenceNumber,
    ),
  ],
);
