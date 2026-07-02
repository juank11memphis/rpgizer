import { describe, expect, it } from "vitest";

import { parseInterviewOutputArtifact, type InterviewOutputArtifact } from "./interview-output-artifact";

const validArtifact: InterviewOutputArtifact = {
  goalSummary: "Become a confident home chef.",
  coreWhy: "Cook healthier meals for family.",
  successDefinition: "Prepare three reliable dinners without stress.",
  currentStage: "Can cook basic pasta and eggs.",
  blockers: ["Limited weeknight time"],
  constraints: ["Vegetarian-friendly meals"],
  existingResources: ["Basic cookware"],
  likelyMissingResources: ["Meal planning routine"],
  safetyBoundaries: ["No medical nutrition advice"],
  preferences: ["Practical and encouraging tone"],
  compactSourceSummary: "The user wants a practical cooking adventure for weeknight meals.",
};

describe("parseInterviewOutputArtifact", () => {
  it("accepts a complete artifact payload and trims trusted strings", () => {
    expect(
      parseInterviewOutputArtifact({
        ...validArtifact,
        goalSummary: "  Become a confident home chef.  ",
        blockers: ["  Limited weeknight time  "],
      }),
    ).toEqual(validArtifact);
  });

  it("rejects arbitrary JSON before it can become trusted application data", () => {
    expect(() => parseInterviewOutputArtifact(null)).toThrow("must be an object");
    expect(() => parseInterviewOutputArtifact({ goalSummary: "Only one field" })).toThrow(
      "coreWhy",
    );
    expect(() =>
      parseInterviewOutputArtifact({ ...validArtifact, blockers: ["Limited time", 42] }),
    ).toThrow("blockers[1]");
    expect(() => parseInterviewOutputArtifact({ ...validArtifact, coreWhy: " " })).toThrow(
      "coreWhy",
    );
  });
});
