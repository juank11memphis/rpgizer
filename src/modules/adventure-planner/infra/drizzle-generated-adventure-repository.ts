import { and, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";
import {
  adventureAchievements,
  adventureActs,
  adventureBossFightInventoryItems,
  adventureBossFights,
  adventureBossFightSkillRewards,
  adventureFocusedNextActions,
  adventureInventoryItems,
  adventureQuestInventoryItems,
  adventureQuests,
  adventureQuestSkillRewards,
  adventureQuestSteps,
  adventureSkills,
  adventures,
  generatedAdventureManifests,
} from "@/db/schema";

import type {
  ExistingGeneratedAdventureLookup,
  GeneratedAdventureRepository,
  PersistedGeneratedAdventure,
  SaveGeneratedAdventureInput,
  SaveGeneratedAdventureResult,
} from "../application/generate-adventure/ports";
import type {
  GeneratedAdventure,
  GeneratedAdventureAct,
  GeneratedAdventureBossFight,
  GeneratedAdventureFocusedNextAction,
  GeneratedAdventureInventoryItem,
  GeneratedAdventureQuest,
} from "../domain/generated-adventure";

export type AdventurePlannerDb = ReturnType<typeof drizzle<typeof schema>>;
type AdventurePlannerTx = Parameters<Parameters<AdventurePlannerDb["transaction"]>[0]>[0];
type QueryExecutor = AdventurePlannerDb | AdventurePlannerTx;

type ManifestRow = Pick<typeof generatedAdventureManifests.$inferSelect, "id" | "adventureId" | "title" | "themeSummary" | "goalSummary" | "safetySummary">;
type ActRow = Pick<typeof adventureActs.$inferSelect, "id" | "title" | "summary" | "sequenceNumber">;
type SkillRow = Pick<typeof adventureSkills.$inferSelect, "id" | "name" | "description" | "xp" | "level">;
type InventoryItemRow = Pick<typeof adventureInventoryItems.$inferSelect, "id" | "name" | "purpose" | "status" | "acquiredAt" | "sequenceNumber">;
type FocusedNextActionRow = Pick<typeof adventureFocusedNextActions.$inferSelect, "title" | "description" | "sequenceNumber">;
type AchievementRow = Pick<typeof adventureAchievements.$inferSelect, "id" | "name" | "description" | "unlockCondition" | "status" | "unlockedAt" | "sequenceNumber">;
type QuestRow = Pick<typeof adventureQuests.$inferSelect, "id" | "actId" | "type" | "title" | "description" | "doneCondition" | "rewardIntent" | "status" | "sequenceNumber">;
type QuestStepRow = Pick<typeof adventureQuestSteps.$inferSelect, "id" | "questId" | "description" | "sequenceNumber">;
type BossFightRow = Pick<typeof adventureBossFights.$inferSelect, "id" | "actId" | "title" | "description" | "doneCondition" | "rewardIntent" | "status" | "sequenceNumber">;
type SkillRewardRow = { sourceId: string; skillId: string; xp: number };
type InventoryLinkRow = { sourceId: string; inventoryItemId: string };

export class DrizzleGeneratedAdventureRepository implements GeneratedAdventureRepository {
  constructor(private readonly db: AdventurePlannerDb) {}

  async findExistingGeneratedAdventure(input: ExistingGeneratedAdventureLookup): Promise<PersistedGeneratedAdventure | null> {
    return loadGeneratedAdventure(this.db, input);
  }

  async saveGeneratedAdventure(input: SaveGeneratedAdventureInput): Promise<SaveGeneratedAdventureResult> {
    const existing = await this.findExistingGeneratedAdventure(input);
    if (existing) return { ...existing, reusedExistingAdventure: true };

    try {
      return await this.db.transaction(async (tx) => {
        const ownedAdventure = await findOwnedAdventure(tx, input);
        if (!ownedAdventure) throw new Error("Adventure was not found.");

        const existingInTransaction = await loadGeneratedAdventure(tx, input);
        if (existingInTransaction) return { ...existingInTransaction, reusedExistingAdventure: true };

        const manifest = await insertManifest(tx, input);
        const skillIdsByKey = await insertSkills(tx, input);
        const inventoryItemIdsByKey = await insertInventoryItems(tx, input);
        const actIdsByKey = await insertActs(tx, input);
        await insertQuestsAndBossFights(tx, input, actIdsByKey, skillIdsByKey, inventoryItemIdsByKey);
        await insertAchievements(tx, input);
        await insertFocusedNextActions(tx, input);

        await tx.update(adventures).set({ state: "generated", updatedAt: new Date() }).where(and(eq(adventures.id, input.adventureId), eq(adventures.userId, input.userId)));

        return { adventureId: input.adventureId, generatedAdventureId: manifest.id, adventure: input.adventure, reusedExistingAdventure: false };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const recovered = await this.findExistingGeneratedAdventure(input);
      if (!recovered) throw error;
      return { ...recovered, reusedExistingAdventure: true };
    }
  }
}

async function findOwnedAdventure(db: QueryExecutor, input: ExistingGeneratedAdventureLookup): Promise<{ id: string } | null> {
  const rows = await db.select({ id: adventures.id }).from(adventures).where(and(eq(adventures.id, input.adventureId), eq(adventures.userId, input.userId))).limit(1);
  return rows[0] ?? null;
}

async function loadGeneratedAdventure(db: QueryExecutor, input: ExistingGeneratedAdventureLookup): Promise<PersistedGeneratedAdventure | null> {
  const manifestRows = await db.select({ id: generatedAdventureManifests.id, adventureId: generatedAdventureManifests.adventureId, title: generatedAdventureManifests.title, themeSummary: generatedAdventureManifests.themeSummary, goalSummary: generatedAdventureManifests.goalSummary, safetySummary: generatedAdventureManifests.safetySummary }).from(generatedAdventureManifests).innerJoin(adventures, eq(adventures.id, generatedAdventureManifests.adventureId)).where(and(eq(generatedAdventureManifests.adventureId, input.adventureId), eq(adventures.userId, input.userId))).limit(1);
  const manifest = manifestRows[0];
  if (!manifest) return null;

  const [actRows, skillRows, inventoryRows, achievementRows, focusedNextActionRows, questRows, bossFightRows] = await Promise.all([
    db.select({ id: adventureActs.id, title: adventureActs.title, summary: adventureActs.summary, sequenceNumber: adventureActs.sequenceNumber }).from(adventureActs).where(eq(adventureActs.adventureId, input.adventureId)).orderBy(adventureActs.sequenceNumber),
    db.select({ id: adventureSkills.id, name: adventureSkills.name, description: adventureSkills.description, xp: adventureSkills.xp, level: adventureSkills.level }).from(adventureSkills).where(eq(adventureSkills.adventureId, input.adventureId)).orderBy(adventureSkills.name),
    db.select({ id: adventureInventoryItems.id, name: adventureInventoryItems.name, purpose: adventureInventoryItems.purpose, status: adventureInventoryItems.status, acquiredAt: adventureInventoryItems.acquiredAt, sequenceNumber: adventureInventoryItems.sequenceNumber }).from(adventureInventoryItems).where(eq(adventureInventoryItems.adventureId, input.adventureId)).orderBy(adventureInventoryItems.sequenceNumber),
    db.select({ id: adventureAchievements.id, name: adventureAchievements.name, description: adventureAchievements.description, unlockCondition: adventureAchievements.unlockCondition, status: adventureAchievements.status, unlockedAt: adventureAchievements.unlockedAt, sequenceNumber: adventureAchievements.sequenceNumber }).from(adventureAchievements).where(eq(adventureAchievements.adventureId, input.adventureId)).orderBy(adventureAchievements.sequenceNumber),
    db.select({ title: adventureFocusedNextActions.title, description: adventureFocusedNextActions.description, sequenceNumber: adventureFocusedNextActions.sequenceNumber }).from(adventureFocusedNextActions).where(eq(adventureFocusedNextActions.adventureId, input.adventureId)).orderBy(adventureFocusedNextActions.sequenceNumber),
    db.select({ id: adventureQuests.id, actId: adventureQuests.actId, type: adventureQuests.type, title: adventureQuests.title, description: adventureQuests.description, doneCondition: adventureQuests.doneCondition, rewardIntent: adventureQuests.rewardIntent, status: adventureQuests.status, sequenceNumber: adventureQuests.sequenceNumber }).from(adventureQuests).where(eq(adventureQuests.adventureId, input.adventureId)).orderBy(adventureQuests.sequenceNumber),
    db.select({ id: adventureBossFights.id, actId: adventureBossFights.actId, title: adventureBossFights.title, description: adventureBossFights.description, doneCondition: adventureBossFights.doneCondition, rewardIntent: adventureBossFights.rewardIntent, status: adventureBossFights.status, sequenceNumber: adventureBossFights.sequenceNumber }).from(adventureBossFights).where(eq(adventureBossFights.adventureId, input.adventureId)).orderBy(adventureBossFights.sequenceNumber),
  ]);

  const [questRewardRows, bossRewardRows, questInventoryRows, bossInventoryRows, questStepRows] = await Promise.all([
    db.select({ sourceId: adventureQuestSkillRewards.questId, skillId: adventureQuestSkillRewards.skillId, xp: adventureQuestSkillRewards.xp }).from(adventureQuestSkillRewards).innerJoin(adventureQuests, eq(adventureQuests.id, adventureQuestSkillRewards.questId)).where(eq(adventureQuests.adventureId, input.adventureId)),
    db.select({ sourceId: adventureBossFightSkillRewards.bossFightId, skillId: adventureBossFightSkillRewards.skillId, xp: adventureBossFightSkillRewards.xp }).from(adventureBossFightSkillRewards).innerJoin(adventureBossFights, eq(adventureBossFights.id, adventureBossFightSkillRewards.bossFightId)).where(eq(adventureBossFights.adventureId, input.adventureId)),
    db.select({ sourceId: adventureQuestInventoryItems.questId, inventoryItemId: adventureQuestInventoryItems.inventoryItemId }).from(adventureQuestInventoryItems).innerJoin(adventureQuests, eq(adventureQuests.id, adventureQuestInventoryItems.questId)).where(eq(adventureQuests.adventureId, input.adventureId)),
    db.select({ sourceId: adventureBossFightInventoryItems.bossFightId, inventoryItemId: adventureBossFightInventoryItems.inventoryItemId }).from(adventureBossFightInventoryItems).innerJoin(adventureBossFights, eq(adventureBossFights.id, adventureBossFightInventoryItems.bossFightId)).where(eq(adventureBossFights.adventureId, input.adventureId)),
    db.select({ id: adventureQuestSteps.id, questId: adventureQuestSteps.questId, description: adventureQuestSteps.description, sequenceNumber: adventureQuestSteps.sequenceNumber }).from(adventureQuestSteps).innerJoin(adventureQuests, eq(adventureQuests.id, adventureQuestSteps.questId)).where(eq(adventureQuests.adventureId, input.adventureId)).orderBy(adventureQuestSteps.sequenceNumber),
  ]);

  return { adventureId: manifest.adventureId, generatedAdventureId: manifest.id, adventure: mapGeneratedAdventure(manifest, { acts: actRows, skills: skillRows, inventoryItems: inventoryRows, achievements: achievementRows, focusedNextActions: focusedNextActionRows, quests: questRows, bossFights: bossFightRows, questRewards: questRewardRows, bossFightRewards: bossRewardRows, questInventoryItems: questInventoryRows, bossFightInventoryItems: bossInventoryRows, questSteps: questStepRows }) };
}

async function insertManifest(db: QueryExecutor, input: SaveGeneratedAdventureInput): Promise<{ id: string }> {
  const rows = await db.insert(generatedAdventureManifests).values({ adventureId: input.adventureId, interviewOutputArtifactId: input.interviewOutputArtifactId, title: input.adventure.title, themeSummary: input.adventure.themeSummary, goalSummary: input.adventure.goalSummary, safetySummary: input.adventure.safetyNotes.join("\n") }).returning({ id: generatedAdventureManifests.id });
  const row = rows[0];
  if (!row) throw new Error("Generated Adventure manifest could not be created.");
  return row;
}

async function insertSkills(db: QueryExecutor, input: SaveGeneratedAdventureInput): Promise<Map<string, string>> {
  const idsByKey = new Map<string, string>();
  for (const skill of input.adventure.skills) {
    const rows = await db.insert(adventureSkills).values({ adventureId: input.adventureId, name: skill.name, description: skill.description, xp: skill.xp, level: skill.level }).returning({ id: adventureSkills.id });
    const row = rows[0];
    if (!row) throw new Error(`Generated Adventure skill could not be created: ${skill.key}.`);
    idsByKey.set(skill.key, row.id);
  }
  return idsByKey;
}

async function insertInventoryItems(db: QueryExecutor, input: SaveGeneratedAdventureInput): Promise<Map<string, string>> {
  const idsByKey = new Map<string, string>();
  for (const item of input.adventure.inventoryItems) {
    const rows = await db.insert(adventureInventoryItems).values({ adventureId: input.adventureId, name: item.name, purpose: item.purpose, status: item.status, acquiredAt: item.acquiredAt, sequenceNumber: item.sequenceNumber }).returning({ id: adventureInventoryItems.id });
    const row = rows[0];
    if (!row) throw new Error(`Generated Adventure inventory item could not be created: ${item.key}.`);
    idsByKey.set(item.key, row.id);
  }
  return idsByKey;
}

async function insertActs(db: QueryExecutor, input: SaveGeneratedAdventureInput): Promise<Map<string, string>> {
  const idsByKey = new Map<string, string>();
  for (const act of input.adventure.acts) {
    const rows = await db.insert(adventureActs).values({ adventureId: input.adventureId, title: act.title, summary: act.summary, sequenceNumber: act.sequenceNumber }).returning({ id: adventureActs.id });
    const row = rows[0];
    if (!row) throw new Error(`Generated Adventure act could not be created: ${act.key}.`);
    idsByKey.set(act.key, row.id);
  }
  return idsByKey;
}

async function insertQuestsAndBossFights(db: QueryExecutor, input: SaveGeneratedAdventureInput, actIdsByKey: ReadonlyMap<string, string>, skillIdsByKey: ReadonlyMap<string, string>, inventoryItemIdsByKey: ReadonlyMap<string, string>): Promise<void> {
  for (const act of input.adventure.acts) {
    const actId = requireMappedId(actIdsByKey, act.key, "act");
    for (const quest of [...act.mainQuests, ...act.sideQuests]) {
      const questRows = await db.insert(adventureQuests).values({ adventureId: input.adventureId, actId, type: quest.type, title: quest.title, description: quest.description, doneCondition: quest.doneCondition, rewardIntent: quest.rewardIntent, status: quest.status, sequenceNumber: quest.sequenceNumber, completedAt: null }).returning({ id: adventureQuests.id });
      const questId = questRows[0]?.id;
      if (!questId) throw new Error(`Generated Adventure quest could not be created: ${quest.key}.`);
      await insertQuestSteps(db, questId, quest.steps);
      await insertSkillRewards(db, questId, quest.skillRewards, skillIdsByKey, "quest");
      await insertInventoryLinks(db, questId, quest.inventoryItemKeys, inventoryItemIdsByKey, "quest");
    }
    for (const bossFight of act.bossFights) {
      const bossRows = await db.insert(adventureBossFights).values({ adventureId: input.adventureId, actId, title: bossFight.title, description: bossFight.description, doneCondition: bossFight.doneCondition, rewardIntent: bossFight.rewardIntent, status: bossFight.status, sequenceNumber: bossFight.sequenceNumber, completedAt: null }).returning({ id: adventureBossFights.id });
      const bossFightId = bossRows[0]?.id;
      if (!bossFightId) throw new Error(`Generated Adventure boss fight could not be created: ${bossFight.key}.`);
      await insertSkillRewards(db, bossFightId, bossFight.skillRewards, skillIdsByKey, "bossFight");
      await insertInventoryLinks(db, bossFightId, bossFight.inventoryItemKeys, inventoryItemIdsByKey, "bossFight");
    }
  }
}

async function insertQuestSteps(db: QueryExecutor, questId: string, steps: GeneratedAdventureQuest["steps"]): Promise<void> {
  for (const step of steps) {
    await db.insert(adventureQuestSteps).values({
      questId,
      description: step.description,
      sequenceNumber: step.sequenceNumber,
    });
  }
}

async function insertSkillRewards(db: QueryExecutor, sourceId: string, rewards: ReadonlyArray<{ skillKey: string; xp: number }>, skillIdsByKey: ReadonlyMap<string, string>, sourceType: "quest" | "bossFight"): Promise<void> {
  for (const reward of rewards) {
    const skillId = requireMappedId(skillIdsByKey, reward.skillKey, "skill");
    if (sourceType === "quest") await db.insert(adventureQuestSkillRewards).values({ questId: sourceId, skillId, xp: reward.xp });
    else await db.insert(adventureBossFightSkillRewards).values({ bossFightId: sourceId, skillId, xp: reward.xp });
  }
}

async function insertInventoryLinks(db: QueryExecutor, sourceId: string, inventoryItemKeys: readonly string[], inventoryItemIdsByKey: ReadonlyMap<string, string>, sourceType: "quest" | "bossFight"): Promise<void> {
  for (const inventoryItemKey of inventoryItemKeys) {
    const inventoryItemId = requireMappedId(inventoryItemIdsByKey, inventoryItemKey, "inventory item");
    if (sourceType === "quest") await db.insert(adventureQuestInventoryItems).values({ questId: sourceId, inventoryItemId });
    else await db.insert(adventureBossFightInventoryItems).values({ bossFightId: sourceId, inventoryItemId });
  }
}

async function insertAchievements(db: QueryExecutor, input: SaveGeneratedAdventureInput): Promise<void> {
  for (const achievement of input.adventure.achievements) {
    await db.insert(adventureAchievements).values({ adventureId: input.adventureId, name: achievement.name, description: achievement.description, unlockCondition: achievement.unlockCondition, status: achievement.status, sequenceNumber: achievement.sequenceNumber, unlockedAt: achievement.unlockedAt });
  }
}

async function insertFocusedNextActions(db: QueryExecutor, input: SaveGeneratedAdventureInput): Promise<void> {
  for (const action of input.adventure.focusedNextActions) {
    await db.insert(adventureFocusedNextActions).values({
      adventureId: input.adventureId,
      title: action.title,
      description: action.description,
      sequenceNumber: action.sequenceNumber,
    });
  }
}

function mapGeneratedAdventure(manifest: ManifestRow, rows: { acts: ActRow[]; skills: SkillRow[]; inventoryItems: InventoryItemRow[]; achievements: AchievementRow[]; focusedNextActions: FocusedNextActionRow[]; quests: QuestRow[]; bossFights: BossFightRow[]; questRewards: SkillRewardRow[]; bossFightRewards: SkillRewardRow[]; questInventoryItems: InventoryLinkRow[]; bossFightInventoryItems: InventoryLinkRow[]; questSteps: QuestStepRow[] }): GeneratedAdventure {
  const questsByActId = groupBy(rows.quests, (quest) => quest.actId);
  const bossFightsByActId = groupBy(rows.bossFights, (bossFight) => bossFight.actId);
  const questRewardsByQuestId = groupBy(rows.questRewards, (reward) => reward.sourceId);
  const bossRewardsByBossId = groupBy(rows.bossFightRewards, (reward) => reward.sourceId);
  const questInventoryByQuestId = groupBy(rows.questInventoryItems, (link) => link.sourceId);
  const questStepsByQuestId = groupBy(rows.questSteps, (step) => step.questId);
  const bossInventoryByBossId = groupBy(rows.bossFightInventoryItems, (link) => link.sourceId);

  return {
    title: manifest.title,
    themeSummary: manifest.themeSummary,
    goalSummary: manifest.goalSummary,
    safetyNotes: manifest.safetySummary ? manifest.safetySummary.split("\n").filter(Boolean) : [],
    skills: rows.skills.map((skill) => ({ key: skill.id, name: skill.name, description: skill.description, xp: 0, level: 1 })),
    inventoryItems: rows.inventoryItems.map(mapInventoryItem),
    achievements: rows.achievements.map((achievement) => ({ key: achievement.id, name: achievement.name, description: achievement.description, unlockCondition: achievement.unlockCondition, status: "locked", unlockedAt: null, sequenceNumber: achievement.sequenceNumber })),
    acts: rows.acts.map((act) => mapAct(act, { quests: questsByActId.get(act.id) ?? [], bossFights: bossFightsByActId.get(act.id) ?? [], questRewardsByQuestId, bossRewardsByBossId, questInventoryByQuestId, bossInventoryByBossId, questStepsByQuestId })),
    focusedNextActions: rows.focusedNextActions.map(mapFocusedNextAction),
  };
}

function mapAct(act: ActRow, rows: { quests: QuestRow[]; bossFights: BossFightRow[]; questRewardsByQuestId: ReadonlyMap<string, SkillRewardRow[]>; bossRewardsByBossId: ReadonlyMap<string, SkillRewardRow[]>; questInventoryByQuestId: ReadonlyMap<string, InventoryLinkRow[]>; bossInventoryByBossId: ReadonlyMap<string, InventoryLinkRow[]>; questStepsByQuestId: ReadonlyMap<string, QuestStepRow[]> }): GeneratedAdventureAct {
  return {
    key: act.id,
    title: act.title,
    summary: act.summary,
    sequenceNumber: act.sequenceNumber,
    mainQuests: rows.quests.filter((quest) => quest.type === "main").map((quest) => mapQuest(quest, rows.questRewardsByQuestId, rows.questInventoryByQuestId, rows.questStepsByQuestId)),
    sideQuests: rows.quests.filter((quest) => quest.type === "side").map((quest) => mapQuest(quest, rows.questRewardsByQuestId, rows.questInventoryByQuestId, rows.questStepsByQuestId)),
    bossFights: rows.bossFights.map((bossFight) => mapBossFight(bossFight, rows.bossRewardsByBossId, rows.bossInventoryByBossId)),
  };
}

function mapQuest(quest: QuestRow, rewardsByQuestId: ReadonlyMap<string, SkillRewardRow[]>, inventoryByQuestId: ReadonlyMap<string, InventoryLinkRow[]>, stepsByQuestId: ReadonlyMap<string, QuestStepRow[]>): GeneratedAdventureQuest {
  return { key: quest.id, type: quest.type === "side" ? "side" : "main", title: quest.title, description: quest.description, doneCondition: quest.doneCondition, rewardIntent: quest.rewardIntent, steps: (stepsByQuestId.get(quest.id) ?? []).map((step) => ({ key: step.id, description: step.description, sequenceNumber: step.sequenceNumber })), status: "not_started", sequenceNumber: quest.sequenceNumber, skillRewards: (rewardsByQuestId.get(quest.id) ?? []).map((reward) => ({ skillKey: reward.skillId, xp: reward.xp })), inventoryItemKeys: (inventoryByQuestId.get(quest.id) ?? []).map((link) => link.inventoryItemId) };
}

function mapBossFight(bossFight: BossFightRow, rewardsByBossId: ReadonlyMap<string, SkillRewardRow[]>, inventoryByBossId: ReadonlyMap<string, InventoryLinkRow[]>): GeneratedAdventureBossFight {
  return { key: bossFight.id, title: bossFight.title, description: bossFight.description, doneCondition: bossFight.doneCondition, rewardIntent: bossFight.rewardIntent, status: "not_started", sequenceNumber: bossFight.sequenceNumber, skillRewards: (rewardsByBossId.get(bossFight.id) ?? []).map((reward) => ({ skillKey: reward.skillId, xp: reward.xp })), inventoryItemKeys: (inventoryByBossId.get(bossFight.id) ?? []).map((link) => link.inventoryItemId) };
}

function mapFocusedNextAction(action: FocusedNextActionRow): GeneratedAdventureFocusedNextAction {
  return { title: action.title, description: action.description, sequenceNumber: action.sequenceNumber };
}

function mapInventoryItem(item: InventoryItemRow): GeneratedAdventureInventoryItem {
  return { key: item.id, name: item.name, purpose: item.purpose, status: "needed", acquiredAt: null, sequenceNumber: item.sequenceNumber };
}

function groupBy<T>(items: readonly T[], readKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = readKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return grouped;
}

function requireMappedId(idsByKey: ReadonlyMap<string, string>, key: string, label: string): string {
  const id = idsByKey.get(key);
  if (!id) throw new Error(`Generated Adventure references unknown ${label}: ${key}.`);
  return id;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";
}
