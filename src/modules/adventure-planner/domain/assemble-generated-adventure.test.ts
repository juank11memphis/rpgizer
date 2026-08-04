import { describe, expect, it } from "vitest";

import {
  buildGeneratedAdventureBoundaryPayload,
  buildGeneratedAdventureContentBoundaryPayload,
  buildGeneratedAdventureDependencyLinksBoundaryPayload,
  buildGeneratedAdventureXpBalanceBoundaryPayload,
} from "../application/test/generated-adventure-fixtures";
import { assembleGeneratedAdventure } from "./assemble-generated-adventure";
import { parseGeneratedAdventureContent } from "./generated-adventure-content";
import { parseGeneratedAdventureDependencyLinks } from "./generated-adventure-dependencies";
import { parseGeneratedAdventureXpBalance } from "./generated-adventure-xp";

function buildValidAssemblyInput() {
  const content = parseGeneratedAdventureContent(buildGeneratedAdventureContentBoundaryPayload());
  const dependencies = parseGeneratedAdventureDependencyLinks(
    buildGeneratedAdventureDependencyLinksBoundaryPayload(),
    content,
  );
  const xpBalance = parseGeneratedAdventureXpBalance(
    buildGeneratedAdventureXpBalanceBoundaryPayload(),
    dependencies,
  );

  return { content, dependencies, xpBalance };
}

describe("assembleGeneratedAdventure", () => {
  it("assembles a final GeneratedAdventure accepted by the existing final parser", () => {
    const adventure = assembleGeneratedAdventure(buildValidAssemblyInput());

    expect(adventure).toMatchObject({
      title: buildGeneratedAdventureBoundaryPayload().title,
      acts: [
        {
          mainQuests: [
            {
              key: "plan-first-menu",
              skillRewards: [{ skillKey: "meal-planning", xp: 25 }],
              inventoryItemKeys: ["weekly-menu-template"],
              steps: [
                { key: "choose-recipe", description: "Pick one recipe that fits your weeknight time window.", sequenceNumber: 1 },
                { key: "write-shopping-list", description: "Write every ingredient and tool needed before shopping.", sequenceNumber: 2 },
                { key: "confirm-cooking-window", description: "Choose the evening and start time for cooking the meal.", sequenceNumber: 3 },
              ],
            },
          ],
          sideQuests: [
            {
              key: "prep-station-reset",
              skillRewards: [{ skillKey: "knife-basics", xp: 10 }],
              inventoryItemKeys: ["sharp-chefs-knife"],
              steps: [
                { key: "clear-counter", description: "Clear enough counter space for safe chopping and staging.", sequenceNumber: 1 },
                { key: "stage-tools", description: "Place the knife, board, pan, and template within reach.", sequenceNumber: 2 },
              ],
            },
          ],
          bossFights: [
            {
              key: "first-weeknight-service",
              skillRewards: [
                { skillKey: "meal-planning", xp: 40 },
                { skillKey: "knife-basics", xp: 20 },
              ],
              inventoryItemKeys: ["weekly-menu-template", "sharp-chefs-knife"],
            },
          ],
        },
      ],
    });
  });

  it("fails clearly if dependencies or XP are missing at the assembler boundary", () => {
    const input = buildValidAssemblyInput();

    expect(() =>
      assembleGeneratedAdventure({
        ...input,
        dependencies: { ...input.dependencies, questLinks: input.dependencies.questLinks.slice(1) },
      }),
    ).toThrow("Missing dependency links");

    expect(() =>
      assembleGeneratedAdventure({
        ...input,
        xpBalance: { ...input.xpBalance, bossFightXp: [] },
      }),
    ).toThrow("Missing XP balance");
  });

  it("assembles final Adventures with empty inventory links when the linker finds no relevant item", () => {
    const input = buildValidAssemblyInput();
    const adventure = assembleGeneratedAdventure({
      ...input,
      dependencies: {
        ...input.dependencies,
        questLinks: input.dependencies.questLinks.map((link) =>
          link.questKey === "prep-station-reset" ? { ...link, inventoryItemKeys: [] } : link,
        ),
      },
    });

    expect(adventure.acts[0].sideQuests[0].inventoryItemKeys).toEqual([]);
  });

  it("does not add Quest Steps to Boss Fights", () => {
    const adventure = assembleGeneratedAdventure(buildValidAssemblyInput());

    expect(adventure.acts[0].bossFights[0]).not.toHaveProperty("steps");
  });
});
