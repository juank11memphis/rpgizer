import { describe, expect, it } from "vitest";

import { parseGenerateAdventureEvalFixture } from "./generate-adventure-eval-fixture-parser";

function buildFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "learn-cooking",
    name: "Learn cooking",
    goalText: "Learn weeknight cooking",
    interviewOutputArtifact: {
      goalSummary: "Cook practical weeknight dinners.",
      coreWhy: "Feel calmer after work.",
      successDefinition: "Three dinners are cooked without stress.",
      currentStage: "Can follow simple recipes.",
      blockers: ["Time pressure"],
      constraints: ["Weeknights only"],
      existingResources: ["Kitchen tools"],
      likelyMissingResources: ["Planning template"],
      safetyBoundaries: ["Educational cooking guidance only"],
      preferences: ["Cozy fantasy tone"],
      compactSourceSummary: "The user wants practical cooking routines.",
    },
    transcript: [{ role: "user", content: "I want to cook more often." }],
    expectations: {
      highStakesSafety: false,
      expectedGoalTerms: ["cooking"],
      expectedSkillThemes: ["meal"],
      expectedInventoryThemes: ["template"],
      forbiddenAdvicePatterns: ["guaranteed cure"],
    },
    ...overrides,
  };
}

describe("parseGenerateAdventureEvalFixture", () => {
  it("accepts a complete in-memory eval fixture", () => {
    const fixture = parseGenerateAdventureEvalFixture(buildFixture(), "learn-cooking.json");

    expect(fixture).toMatchObject({
      id: "learn-cooking",
      goalText: "Learn weeknight cooking",
      transcript: [{ role: "user", content: "I want to cook more often." }],
      expectations: {
        highStakesSafety: false,
        expectedGoalTerms: ["cooking"],
      },
    });
  });

  it("rejects malformed top-level fixture objects", () => {
    expect(() => parseGenerateAdventureEvalFixture(null, "bad.json")).toThrow(
      "fixture must be an object",
    );
    expect(() => parseGenerateAdventureEvalFixture(buildFixture({ id: " " }), "bad.json")).toThrow(
      "id must be a non-empty string",
    );
  });

  it("rejects invalid transcript roles and empty transcript arrays", () => {
    expect(() =>
      parseGenerateAdventureEvalFixture(buildFixture({ transcript: [] }), "bad.json"),
    ).toThrow("transcript must be a non-empty array");
    expect(() =>
      parseGenerateAdventureEvalFixture(
        buildFixture({ transcript: [{ role: "assistant", content: "Hi" }] }),
        "bad.json",
      ),
    ).toThrow("transcript[0] has invalid role");
  });

  it("rejects missing expectations and empty required expectation arrays", () => {
    expect(() =>
      parseGenerateAdventureEvalFixture(buildFixture({ expectations: undefined }), "bad.json"),
    ).toThrow("expectations must be an object");
    expect(() =>
      parseGenerateAdventureEvalFixture(
        buildFixture({
          expectations: {
            highStakesSafety: false,
            expectedGoalTerms: [],
            expectedSkillThemes: ["meal"],
            expectedInventoryThemes: ["template"],
            forbiddenAdvicePatterns: ["guaranteed cure"],
          },
        }),
        "bad.json",
      ),
    ).toThrow("expectedGoalTerms must be a non-empty array");
  });
});
