import { describe, expect, it } from "vitest";

import { parseGeneratedAdventureContent } from "../domain/generated-adventure-content";
import { checkGeneratedAdventureContentQuality } from "./adventure-content-quality-checks";
import type { GenerateAdventureEvalFixture } from "./generate-adventure-eval-types";
import { buildContentPayload, buildFixture } from "./focused-eval-test-helpers";

describe("Adventure content quality checks", () => {
  it("accepts grounded unlinked content without Skill rewards or Inventory links", () => {
    const content = parseGeneratedAdventureContent(buildContentPayload());

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).toEqual([]);
    expect(result.assertions).toEqual(
      expect.arrayContaining([
        { id: "adventure-required-structure", label: "Required Structure", status: "passed" },
        { id: "adventure-fixture-grounding", label: "Fixture Grounding", status: "passed" },
      ]),
    );
  });

  it("reports missing fixture grounding and weak next actions", () => {
    const fixture: GenerateAdventureEvalFixture = buildFixture({
      expectations: { ...buildFixture().expectations, expectedGoalTerms: ["Portuguese"], expectedSkillThemes: ["speaking"], expectedInventoryThemes: ["prompt"] },
    });
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        goalSummary: "Prepare a generic project.",
        skills: [{ key: "skill-plan", name: "Plan", description: "Plan a generic project." }],
        inventoryItems: [{ key: "item-plan", name: "Plan", purpose: "A project plan document." }],
        focusedNextActions: [{ title: "Begin", description: "Begin the journey." }],
      }),
    );

    const diagnostics = checkGeneratedAdventureContentQuality(content, fixture).diagnostics;

    expect(diagnostics.map((diagnostic) => diagnostic.area)).toContain("fixture grounding");
    expect(diagnostics.map((diagnostic) => diagnostic.area)).toContain("next action quality");
  });
});
