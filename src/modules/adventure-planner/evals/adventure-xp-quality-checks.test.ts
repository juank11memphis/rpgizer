import { describe, expect, it } from "vitest";

import { parseGeneratedAdventureContent } from "../domain/generated-adventure-content";
import { checkAdventureXpQuality } from "./adventure-xp-quality-checks";
import { buildContentPayload, buildDependencyLinks, buildXpBalance } from "./focused-eval-test-helpers";

describe("Adventure XP quality checks", () => {
  it("accepts bounded XP for linked Skill rewards only", () => {
    const content = parseGeneratedAdventureContent(buildContentPayload());
    const dependencies = buildDependencyLinks();

    expect(checkAdventureXpQuality(content, dependencies, buildXpBalance()).diagnostics).toEqual([]);
  });

  it("reports unlinked and out-of-range XP", () => {
    const content = parseGeneratedAdventureContent(buildContentPayload());
    const dependencies = buildDependencyLinks();
    const diagnostics = checkAdventureXpQuality(content, dependencies, {
      questXp: [
        { questKey: "quest-prompt-list", skillRewards: [{ skillKey: "skill-speaking-practice", xp: 500 }] },
        { questKey: "quest-speaking-sprint", skillRewards: [{ skillKey: "skill-speaking-practice", xp: 10 }] },
      ],
      bossFightXp: [{ bossFightKey: "boss-coffee-chat", skillRewards: [{ skillKey: "skill-speaking-practice", xp: 20 }] }],
    }).diagnostics;

    expect(diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("unlinked Skill");
    expect(diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("XP must be an integer");
  });

  it("accepts Boss Fight XP that is meaningful but lower than a major Quest", () => {
    const content = parseGeneratedAdventureContent(buildContentPayload());
    const dependencies = buildDependencyLinks();
    const result = checkAdventureXpQuality(content, dependencies, {
      questXp: [
        {
          questKey: "quest-prompt-list",
          skillRewards: [{ skillKey: "skill-conversation-planning", xp: 80 }],
        },
        {
          questKey: "quest-speaking-sprint",
          skillRewards: [{ skillKey: "skill-speaking-practice", xp: 25 }],
        },
      ],
      bossFightXp: [
        {
          bossFightKey: "boss-coffee-chat",
          skillRewards: [
            { skillKey: "skill-speaking-practice", xp: 25 },
            { skillKey: "skill-conversation-planning", xp: 20 },
          ],
        },
      ],
    });

    expect(result.diagnostics).toEqual([]);
  });

  it("still reports Boss Fights with no XP reward", () => {
    const content = parseGeneratedAdventureContent(buildContentPayload());
    const dependencies = buildDependencyLinks();
    const diagnostics = checkAdventureXpQuality(content, dependencies, {
      questXp: [
        { questKey: "quest-prompt-list", skillRewards: [{ skillKey: "skill-conversation-planning", xp: 15 }] },
        { questKey: "quest-speaking-sprint", skillRewards: [{ skillKey: "skill-speaking-practice", xp: 25 }] },
      ],
      bossFightXp: [{ bossFightKey: "boss-coffee-chat", skillRewards: [] }],
    }).diagnostics;

    expect(diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain(
      "expected at least one XP reward",
    );
  });
});
