import { describe, expect, it } from "vitest";

import { parseGeneratedAdventure } from "../../adventure-planner/domain/generated-adventure";
import { buildGeneratedAdventureBoundaryPayload } from "../../adventure-planner/application/test/generated-adventure-fixtures";
import { AdventurePlannerAdventureDetailContentReader } from "./adventure-detail-content-reader";

describe("AdventurePlannerAdventureDetailContentReader", () => {
  const input = { userId: "user-1", adventureId: "adventure-1" };

  it("translates owned generated Adventure persistence into presenter-owned content", async () => {
    const adventure = parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());
    const reader = new AdventurePlannerAdventureDetailContentReader({
      findExistingGeneratedAdventure: async () => ({
        adventureId: input.adventureId,
        generatedAdventureId: "generated-1",
        adventure,
      }),
    });

    const result = await reader.findGeneratedAdventureForDisplay(input);

    expect(result).toMatchObject({
      status: "found",
      content: {
        title: "The Hearthfire Cooking Quest",
        themeSummary: "A cozy guild journey toward reliable weeknight cooking.",
        goalSummary: "Become confident preparing three practical dinners without stress.",
        safetyNotes: ["Keep guidance educational and avoid medical nutrition advice."],
        skills: [
          { id: "meal-planning", name: "Meal Planning", xp: 0, level: 1 },
          { id: "knife-basics", name: "Knife Basics", xp: 0, level: 1 },
        ],
        inventoryItems: [
          { id: "weekly-menu-template", name: "Weekly Menu Template", sequenceNumber: 1 },
          { id: "sharp-chefs-knife", name: "Sharp Chef's Knife", sequenceNumber: 2 },
        ],
        achievements: [
          { id: "three-dinner-streak", name: "Three Dinner Streak", sequenceNumber: 1 },
        ],
      },
    });

    if (result.status !== "found") throw new Error("Expected found result.");
    expect(result.content.acts[0]?.mainQuests[0]).toMatchObject({
      id: "plan-first-menu",
      steps: [
        { id: "choose-recipe", description: "Pick one recipe that fits your weeknight time window.", sequenceNumber: 1 },
        { id: "write-shopping-list", description: "Write every ingredient and tool needed before shopping.", sequenceNumber: 2 },
        { id: "confirm-cooking-window", description: "Choose the evening and start time for cooking the meal.", sequenceNumber: 3 },
      ],
      skillRewards: [{ skillId: "meal-planning", xp: 25 }],
      inventoryItemIds: ["weekly-menu-template"],
    });
    expect(result.content.acts[0]?.bossFights[0]).toMatchObject({
      id: "first-weeknight-service",
      skillRewards: [
        { skillId: "meal-planning", xp: 40 },
        { skillId: "knife-basics", xp: 20 },
      ],
      inventoryItemIds: ["weekly-menu-template", "sharp-chefs-knife"],
    });
  });

  it("returns not_ready for an owned Adventure when no generated content exists", async () => {
    const reader = new AdventurePlannerAdventureDetailContentReader({
      findExistingGeneratedAdventure: async () => null,
      findOwnedAdventure: async () => true,
    });

    await expect(reader.findGeneratedAdventureForDisplay(input)).resolves.toEqual({
      status: "not_ready",
    });
  });

  it("returns not_found for missing or non-owned Adventure content", async () => {
    const reader = new AdventurePlannerAdventureDetailContentReader({
      findExistingGeneratedAdventure: async () => null,
      findOwnedAdventure: async () => false,
    });

    await expect(reader.findGeneratedAdventureForDisplay(input)).resolves.toEqual({
      status: "not_found",
    });
  });

  it("keeps legacy no-generated-content lookup behavior as not_found when ownership lookup is absent", async () => {
    const reader = new AdventurePlannerAdventureDetailContentReader({
      findExistingGeneratedAdventure: async () => null,
    });

    await expect(reader.findGeneratedAdventureForDisplay(input)).resolves.toEqual({
      status: "not_found",
    });
  });
});
