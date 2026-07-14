import { describe, expect, it } from "vitest";

import {
  buildGeneratedAdventureContentBoundaryPayload,
  buildGeneratedAdventureDependencyLinksBoundaryPayload,
} from "../application/test/generated-adventure-fixtures";
import { parseGeneratedAdventureContent } from "./generated-adventure-content";
import { parseGeneratedAdventureDependencyLinks } from "./generated-adventure-dependencies";

function parseValidContent() {
  return parseGeneratedAdventureContent(buildGeneratedAdventureContentBoundaryPayload());
}

describe("parseGeneratedAdventureDependencyLinks", () => {
  it("accepts complete links for all Quests and Boss Fights", () => {
    const links = parseGeneratedAdventureDependencyLinks(
      buildGeneratedAdventureDependencyLinksBoundaryPayload(),
      parseValidContent(),
    );

    expect(links.questLinks).toHaveLength(2);
    expect(links.bossFightLinks[0]).toMatchObject({
      bossFightKey: "first-weeknight-service",
      skillKeys: ["meal-planning", "knife-basics"],
    });
  });

  it("rejects unknown Skill and Inventory Item keys", () => {
    expect(() =>
      parseGeneratedAdventureDependencyLinks(
        buildGeneratedAdventureDependencyLinksBoundaryPayload({
          questLinks: [
            { questKey: "plan-first-menu", skillKeys: ["missing-skill"], inventoryItemKeys: [] },
            {
              questKey: "prep-station-reset",
              skillKeys: ["knife-basics"],
              inventoryItemKeys: ["sharp-chefs-knife"],
            },
          ],
        }),
        parseValidContent(),
      ),
    ).toThrow("unknown key: missing-skill");

    expect(() =>
      parseGeneratedAdventureDependencyLinks(
        buildGeneratedAdventureDependencyLinksBoundaryPayload({
          bossFightLinks: [
            {
              bossFightKey: "first-weeknight-service",
              skillKeys: ["meal-planning"],
              inventoryItemKeys: ["missing-item"],
            },
          ],
        }),
        parseValidContent(),
      ),
    ).toThrow("unknown key: missing-item");
  });

  it("rejects unknown Quest or Boss Fight keys", () => {
    expect(() =>
      parseGeneratedAdventureDependencyLinks(
        buildGeneratedAdventureDependencyLinksBoundaryPayload({
          questLinks: [
            { questKey: "missing-quest", skillKeys: ["meal-planning"], inventoryItemKeys: [] },
            {
              questKey: "prep-station-reset",
              skillKeys: ["knife-basics"],
              inventoryItemKeys: ["sharp-chefs-knife"],
            },
          ],
        }),
        parseValidContent(),
      ),
    ).toThrow("unknown key: missing-quest");

    expect(() =>
      parseGeneratedAdventureDependencyLinks(
        buildGeneratedAdventureDependencyLinksBoundaryPayload({
          bossFightLinks: [
            { bossFightKey: "missing-boss", skillKeys: ["meal-planning"], inventoryItemKeys: [] },
          ],
        }),
        parseValidContent(),
      ),
    ).toThrow("unknown key: missing-boss");
  });

  it("rejects duplicate records, duplicate linked keys, and missing links", () => {
    expect(() =>
      parseGeneratedAdventureDependencyLinks(
        buildGeneratedAdventureDependencyLinksBoundaryPayload({
          questLinks: [
            { questKey: "plan-first-menu", skillKeys: ["meal-planning"], inventoryItemKeys: [] },
            { questKey: "plan-first-menu", skillKeys: ["meal-planning"], inventoryItemKeys: [] },
          ],
        }),
        parseValidContent(),
      ),
    ).toThrow("duplicate key");

    expect(() =>
      parseGeneratedAdventureDependencyLinks(
        buildGeneratedAdventureDependencyLinksBoundaryPayload({
          questLinks: [
            {
              questKey: "plan-first-menu",
              skillKeys: ["meal-planning", "meal-planning"],
              inventoryItemKeys: [],
            },
            {
              questKey: "prep-station-reset",
              skillKeys: ["knife-basics"],
              inventoryItemKeys: ["sharp-chefs-knife"],
            },
          ],
        }),
        parseValidContent(),
      ),
    ).toThrow("duplicate key");

    expect(() =>
      parseGeneratedAdventureDependencyLinks(
        buildGeneratedAdventureDependencyLinksBoundaryPayload({
          questLinks: [
            { questKey: "plan-first-menu", skillKeys: ["meal-planning"], inventoryItemKeys: [] },
          ],
        }),
        parseValidContent(),
      ),
    ).toThrow("missing a link record");
  });
});
