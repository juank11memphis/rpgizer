import { describe, expect, it } from "vitest";

import { parseGeneratedAdventureContent } from "../domain/generated-adventure-content";
import { checkAdventureLinkingQuality } from "./adventure-linking-quality-checks";
import { buildContentPayload, buildDependencyLinks } from "./focused-eval-test-helpers";

describe("Adventure linking quality checks", () => {
  it("accepts complete reference-only dependency links", () => {
    const content = parseGeneratedAdventureContent(buildContentPayload());

    expect(
      checkAdventureLinkingQuality(content, buildDependencyLinks(), {
        expectedInventoryCoverage: ["quest-prompt-list", "quest-speaking-sprint", "boss-coffee-chat"],
      }).diagnostics,
    ).toEqual([]);
  });

  it("reports missing coverage, unknown references, and weak inventory coverage", () => {
    const content = parseGeneratedAdventureContent(buildContentPayload());
    const diagnostics = checkAdventureLinkingQuality(
      content,
      {
        questLinks: [
          { questKey: "quest-prompt-list", skillKeys: ["unknown-skill"], inventoryItemKeys: [] },
          { questKey: "quest-prompt-list", skillKeys: ["skill-conversation-planning"], inventoryItemKeys: [] },
        ],
        bossFightLinks: [{ bossFightKey: "boss-coffee-chat", skillKeys: ["skill-speaking-practice"], inventoryItemKeys: ["unknown-item"] }],
      },
      { expectedInventoryCoverage: ["quest-prompt-list"] },
    ).diagnostics;

    expect(diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("missing coverage");
    expect(diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("unknown key");
    expect(diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("expected at least one relevant Inventory Item link");
  });
});
