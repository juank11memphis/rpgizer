import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

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
  interviewOutputArtifacts,
  users,
} from "@/db/schema";

import { parseGeneratedAdventure } from "../domain/generated-adventure";
import { buildGeneratedAdventureBoundaryPayload } from "../application/test/generated-adventure-fixtures";
import { DrizzleGeneratedAdventureRepository } from "./drizzle-generated-adventure-repository";

const databaseUrl = process.env.DATABASE_URL;
const runWithDatabase = databaseUrl ? describe : describe.skip;
const sql = databaseUrl ? postgres(databaseUrl) : null;
const db = sql ? drizzle(sql, { schema }) : null;

runWithDatabase("DrizzleGeneratedAdventureRepository", () => {
  const userId = "generated-adventure-user-1";
  const otherUserId = "generated-adventure-user-2";
  const adventureId = "generated-adventure-adventure-1";
  const artifactId = "generated-adventure-artifact-1";

  afterAll(async () => {
    await sql?.end();
  });

  beforeEach(async () => {
    await db?.delete(users).where(eq(users.id, userId));
    await db?.delete(users).where(eq(users.id, otherUserId));
    await db?.insert(users).values([{ id: userId }, { id: otherUserId }]);
    await db?.insert(adventures).values({
      id: adventureId,
      userId,
      goalText: "Become a confident home chef.",
      state: "drafting",
      readinessStatus: "ready_to_generate",
      interviewStatus: "confirmed",
    });
    await db?.insert(interviewOutputArtifacts).values({
      id: artifactId,
      adventureId,
      payload: { goalSummary: "Become a confident home chef." },
    });
  });

  it("persists a complete generated adventure graph and marks the adventure generated", async () => {
    if (!db) throw new Error("DATABASE_URL is required for this test.");
    const repository = new DrizzleGeneratedAdventureRepository(db);
    const adventure = parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());

    const result = await repository.saveGeneratedAdventure({
      userId,
      adventureId,
      interviewOutputArtifactId: artifactId,
      adventure,
    });

    expect(result).toMatchObject({ adventureId, reusedExistingAdventure: false });
    await expect(selectRowsForAdventure(generatedAdventureManifests)).resolves.toHaveLength(1);
    await expect(selectRowsForAdventure(adventureActs)).resolves.toHaveLength(1);
    await expect(selectRowsForAdventure(adventureSkills)).resolves.toHaveLength(2);
    await expect(selectRowsForAdventure(adventureInventoryItems)).resolves.toHaveLength(2);
    await expect(selectRowsForAdventure(adventureQuests)).resolves.toHaveLength(2);
    await expect(selectQuestSteps()).resolves.toHaveLength(5);
    await expect(selectRowsForAdventure(adventureBossFights)).resolves.toHaveLength(1);
    await expect(selectRowsForAdventure(adventureAchievements)).resolves.toHaveLength(1);
    await expect(selectRowsForAdventure(adventureFocusedNextActions)).resolves.toHaveLength(1);
    await expect(selectQuestSkillRewards()).resolves.toHaveLength(2);
    await expect(selectBossFightSkillRewards()).resolves.toHaveLength(2);
    await expect(selectQuestInventoryItems()).resolves.toHaveLength(2);
    await expect(selectBossFightInventoryItems()).resolves.toHaveLength(2);

    const reloaded = await repository.findExistingGeneratedAdventure({ userId, adventureId });
    expect(reloaded?.adventure.focusedNextActions).toEqual(adventure.focusedNextActions);
    expect(reloaded?.adventure.acts[0].mainQuests[0].steps).toEqual([
      expect.objectContaining({ description: "Pick one recipe that fits your weeknight time window.", sequenceNumber: 1 }),
      expect.objectContaining({ description: "Write every ingredient and tool needed before shopping.", sequenceNumber: 2 }),
      expect.objectContaining({ description: "Choose the evening and start time for cooking the meal.", sequenceNumber: 3 }),
    ]);
    expect(reloaded?.adventure.acts[0].sideQuests[0].steps).toEqual([
      expect.objectContaining({ description: "Clear enough counter space for safe chopping and staging.", sequenceNumber: 1 }),
      expect.objectContaining({ description: "Place the knife, board, pan, and template within reach.", sequenceNumber: 2 }),
    ]);
    expect(reloaded?.adventure.acts[0].bossFights[0]).not.toHaveProperty("steps");

    const savedAdventureRows = await db.select({ state: adventures.state }).from(adventures).where(eq(adventures.id, adventureId));
    expect(savedAdventureRows[0]?.state).toBe("generated");
  });

  it("reuses an existing manifest and hides it from non-owners", async () => {
    if (!db) throw new Error("DATABASE_URL is required for this test.");
    const repository = new DrizzleGeneratedAdventureRepository(db);
    const adventure = parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());

    const first = await repository.saveGeneratedAdventure({ userId, adventureId, interviewOutputArtifactId: artifactId, adventure });
    const second = await repository.saveGeneratedAdventure({
      userId,
      adventureId,
      interviewOutputArtifactId: artifactId,
      adventure: parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload({ title: "Retry Title" })),
    });

    expect(second.generatedAdventureId).toBe(first.generatedAdventureId);
    expect(second.reusedExistingAdventure).toBe(true);
    await expect(selectRowsForAdventure(generatedAdventureManifests)).resolves.toHaveLength(1);
    await expect(repository.findExistingGeneratedAdventure({ userId: otherUserId, adventureId })).resolves.toBeNull();
    await expect(
      repository.saveGeneratedAdventure({ userId: otherUserId, adventureId, interviewOutputArtifactId: artifactId, adventure }),
    ).rejects.toThrow("Adventure was not found.");
  });


  it("loads older generated adventures that have no Quest Step rows", async () => {
    if (!db) throw new Error("DATABASE_URL is required for this test.");
    const repository = new DrizzleGeneratedAdventureRepository(db);
    const adventure = parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());

    await repository.saveGeneratedAdventure({
      userId,
      adventureId,
      interviewOutputArtifactId: artifactId,
      adventure,
    });
    await db.delete(adventureQuestSteps);

    const reloaded = await repository.findExistingGeneratedAdventure({ userId, adventureId });

    expect(reloaded?.adventure.acts[0].mainQuests[0].steps).toEqual([]);
    expect(reloaded?.adventure.acts[0].sideQuests[0].steps).toEqual([]);
  });

  it("deletes Quest Steps when the owning Quest is deleted", async () => {
    if (!db) throw new Error("DATABASE_URL is required for this test.");
    const repository = new DrizzleGeneratedAdventureRepository(db);
    const adventure = parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());

    await repository.saveGeneratedAdventure({ userId, adventureId, interviewOutputArtifactId: artifactId, adventure });
    const questRows = await db.select({ id: adventureQuests.id }).from(adventureQuests).where(eq(adventureQuests.adventureId, adventureId)).limit(1);
    const questId = questRows[0]?.id;
    if (!questId) throw new Error("Expected saved Quest row.");

    await db.delete(adventureQuests).where(eq(adventureQuests.id, questId));

    const remainingSteps = await db.select().from(adventureQuestSteps).where(eq(adventureQuestSteps.questId, questId));
    expect(remainingSteps).toEqual([]);
  });

  async function selectRowsForAdventure(
    table:
      | typeof generatedAdventureManifests
      | typeof adventureActs
      | typeof adventureSkills
      | typeof adventureInventoryItems
      | typeof adventureFocusedNextActions
      | typeof adventureQuests
      | typeof adventureBossFights
      | typeof adventureAchievements,
  ): Promise<unknown[]> {
    if (!db) throw new Error("DATABASE_URL is required for this test.");
    return db.select().from(table).where(eq(table.adventureId, adventureId));
  }

  async function selectQuestSteps(): Promise<unknown[]> {
    if (!db) throw new Error("DATABASE_URL is required for this test.");
    return db
      .select()
      .from(adventureQuestSteps)
      .innerJoin(adventureQuests, eq(adventureQuests.id, adventureQuestSteps.questId))
      .where(eq(adventureQuests.adventureId, adventureId));
  }

  async function selectQuestSkillRewards(): Promise<unknown[]> {
    if (!db) throw new Error("DATABASE_URL is required for this test.");
    return db
      .select()
      .from(adventureQuestSkillRewards)
      .innerJoin(adventureQuests, eq(adventureQuests.id, adventureQuestSkillRewards.questId))
      .where(eq(adventureQuests.adventureId, adventureId));
  }

  async function selectBossFightSkillRewards(): Promise<unknown[]> {
    if (!db) throw new Error("DATABASE_URL is required for this test.");
    return db
      .select()
      .from(adventureBossFightSkillRewards)
      .innerJoin(adventureBossFights, eq(adventureBossFights.id, adventureBossFightSkillRewards.bossFightId))
      .where(eq(adventureBossFights.adventureId, adventureId));
  }

  async function selectQuestInventoryItems(): Promise<unknown[]> {
    if (!db) throw new Error("DATABASE_URL is required for this test.");
    return db
      .select()
      .from(adventureQuestInventoryItems)
      .innerJoin(adventureQuests, eq(adventureQuests.id, adventureQuestInventoryItems.questId))
      .where(eq(adventureQuests.adventureId, adventureId));
  }

  async function selectBossFightInventoryItems(): Promise<unknown[]> {
    if (!db) throw new Error("DATABASE_URL is required for this test.");
    return db
      .select()
      .from(adventureBossFightInventoryItems)
      .innerJoin(adventureBossFights, eq(adventureBossFights.id, adventureBossFightInventoryItems.bossFightId))
      .where(eq(adventureBossFights.adventureId, adventureId));
  }
});
