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
    await expect(selectRowsForAdventure(adventureBossFights)).resolves.toHaveLength(1);
    await expect(selectRowsForAdventure(adventureAchievements)).resolves.toHaveLength(1);
    await expect(selectRowsForAdventure(adventureFocusedNextActions)).resolves.toHaveLength(1);
    await expect(selectQuestSkillRewards()).resolves.toHaveLength(2);
    await expect(selectBossFightSkillRewards()).resolves.toHaveLength(2);
    await expect(selectQuestInventoryItems()).resolves.toHaveLength(2);
    await expect(selectBossFightInventoryItems()).resolves.toHaveLength(2);

    const reloaded = await repository.findExistingGeneratedAdventure({ userId, adventureId });
    expect(reloaded?.adventure.focusedNextActions).toEqual(adventure.focusedNextActions);

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
