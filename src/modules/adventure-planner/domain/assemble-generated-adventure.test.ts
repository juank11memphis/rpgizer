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
            },
          ],
          sideQuests: [
            {
              key: "prep-station-reset",
              skillRewards: [{ skillKey: "knife-basics", xp: 10 }],
              inventoryItemKeys: ["sharp-chefs-knife"],
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
});
