import { describe, expect, it } from "vitest";

import {
  buildGeneratedAdventureContentBoundaryPayload,
  buildGeneratedAdventureDependencyLinksBoundaryPayload,
  buildGeneratedAdventureXpBalanceBoundaryPayload,
} from "../application/test/generated-adventure-fixtures";
import { parseGeneratedAdventureContent } from "./generated-adventure-content";
import { parseGeneratedAdventureDependencyLinks } from "./generated-adventure-dependencies";
import { parseGeneratedAdventureXpBalance } from "./generated-adventure-xp";

function parseValidDependencies() {
  return parseGeneratedAdventureDependencyLinks(
    buildGeneratedAdventureDependencyLinksBoundaryPayload(),
    parseGeneratedAdventureContent(buildGeneratedAdventureContentBoundaryPayload()),
  );
}

describe("parseGeneratedAdventureXpBalance", () => {
  it("accepts complete XP assignments for linked Skill rewards", () => {
    const xpBalance = parseGeneratedAdventureXpBalance(
      buildGeneratedAdventureXpBalanceBoundaryPayload(),
      parseValidDependencies(),
    );

    expect(xpBalance.questXp).toHaveLength(2);
    expect(xpBalance.bossFightXp[0].skillRewards).toEqual([
      { skillKey: "meal-planning", xp: 40 },
      { skillKey: "knife-basics", xp: 20 },
    ]);
  });

  it("rejects unknown Quest and Boss Fight keys", () => {
    expect(() =>
      parseGeneratedAdventureXpBalance(
        buildGeneratedAdventureXpBalanceBoundaryPayload({
          questXp: [
            { questKey: "missing-quest", skillRewards: [{ skillKey: "meal-planning", xp: 25 }] },
            { questKey: "prep-station-reset", skillRewards: [{ skillKey: "knife-basics", xp: 10 }] },
          ],
        }),
        parseValidDependencies(),
      ),
    ).toThrow("unknown key");

    expect(() =>
      parseGeneratedAdventureXpBalance(
        buildGeneratedAdventureXpBalanceBoundaryPayload({
          bossFightXp: [
            { bossFightKey: "missing-boss", skillRewards: [{ skillKey: "meal-planning", xp: 40 }] },
          ],
        }),
        parseValidDependencies(),
      ),
    ).toThrow("unknown key");
  });

  it("rejects duplicate records, duplicate Skill rewards, missing XP, and unlinked XP", () => {
    expect(() =>
      parseGeneratedAdventureXpBalance(
        buildGeneratedAdventureXpBalanceBoundaryPayload({
          questXp: [
            { questKey: "plan-first-menu", skillRewards: [{ skillKey: "meal-planning", xp: 25 }] },
            { questKey: "plan-first-menu", skillRewards: [{ skillKey: "meal-planning", xp: 25 }] },
          ],
        }),
        parseValidDependencies(),
      ),
    ).toThrow("duplicate key");

    expect(() =>
      parseGeneratedAdventureXpBalance(
        buildGeneratedAdventureXpBalanceBoundaryPayload({
          bossFightXp: [
            {
              bossFightKey: "first-weeknight-service",
              skillRewards: [
                { skillKey: "meal-planning", xp: 40 },
                { skillKey: "meal-planning", xp: 20 },
              ],
            },
          ],
        }),
        parseValidDependencies(),
      ),
    ).toThrow("duplicate key");

    expect(() =>
      parseGeneratedAdventureXpBalance(
        buildGeneratedAdventureXpBalanceBoundaryPayload({
          bossFightXp: [
            { bossFightKey: "first-weeknight-service", skillRewards: [{ skillKey: "meal-planning", xp: 40 }] },
          ],
        }),
        parseValidDependencies(),
      ),
    ).toThrow("missing XP for linked skill");

    expect(() =>
      parseGeneratedAdventureXpBalance(
        buildGeneratedAdventureXpBalanceBoundaryPayload({
          questXp: [
            { questKey: "plan-first-menu", skillRewards: [{ skillKey: "knife-basics", xp: 10 }] },
            { questKey: "prep-station-reset", skillRewards: [{ skillKey: "knife-basics", xp: 10 }] },
          ],
        }),
        parseValidDependencies(),
      ),
    ).toThrow("unlinked skill");
  });

  it("rejects non-positive, non-integer, and out-of-range XP", () => {
    for (const xp of [0, -1, 1.5, 4, 101]) {
      expect(() =>
        parseGeneratedAdventureXpBalance(
          buildGeneratedAdventureXpBalanceBoundaryPayload({
            questXp: [
              { questKey: "plan-first-menu", skillRewards: [{ skillKey: "meal-planning", xp }] },
              { questKey: "prep-station-reset", skillRewards: [{ skillKey: "knife-basics", xp: 10 }] },
            ],
          }),
          parseValidDependencies(),
        ),
      ).toThrow(/positive integer|between 5 and 100/);
    }
  });
});
