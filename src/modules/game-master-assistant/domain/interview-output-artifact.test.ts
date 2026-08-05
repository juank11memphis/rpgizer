import { describe, expect, it } from "vitest";

import { parseInterviewOutputArtifact, type InterviewOutputArtifact } from "./interview-output-artifact";

const validArtifact: InterviewOutputArtifact = {
  goalSummary: "Become a confident home chef.",
  goalType: "learning_skill",
  coreWhy: "Cook healthier meals for family.",
  motivationDetails: ["Reduce takeout", "Feel capable after work"],
  successDefinition: "Prepare three reliable dinners without stress.",
  currentStage: "Can cook basic pasta and eggs.",
  currentSkillOrBaseline: "Beginner who can cook pasta and eggs.",
  blockers: ["Limited weeknight time"],
  constraints: ["Vegetarian-friendly meals"],
  existingResources: ["Basic cookware"],
  likelyMissingResources: ["Meal planning routine"],
  missingResources: ["Simple recipe shortlist"],
  safetyBoundaries: ["No medical nutrition advice"],
  preferences: ["Practical and encouraging tone"],
  dislikesOrAvoidances: ["Avoid complicated recipes"],
  priorAttempts: ["Tried improvising dinners but it felt stressful"],
  confidenceGaps: ["Unsure how to choose easy recipes"],
  examplesOrInspirations: ["Mediterranean bowls"],
  firstMilestoneReadiness: "Ready for a tiny first milestone around one easy dinner.",
  compactSourceSummary: "The user wants a practical cooking adventure for weeknight meals.",
};

describe("parseInterviewOutputArtifact", () => {
  it("accepts a complete richer artifact payload and trims trusted strings", () => {
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
      "goalType",
    );
    expect(() =>
      parseInterviewOutputArtifact({ ...validArtifact, blockers: ["Limited time", 42] }),
    ).toThrow("blockers[1]");
    expect(() => parseInterviewOutputArtifact({ ...validArtifact, coreWhy: " " })).toThrow(
      "coreWhy",
    );
  });

  it.each([
    "goalType",
    "currentSkillOrBaseline",
    "firstMilestoneReadiness",
  ] as const)("rejects missing or blank required richer text field %s", (field) => {
    expect(() => parseInterviewOutputArtifact({ ...validArtifact, [field]: " " })).toThrow(field);
  });

  it.each([
    "motivationDetails",
    "missingResources",
    "dislikesOrAvoidances",
    "priorAttempts",
    "confidenceGaps",
    "examplesOrInspirations",
  ] as const)("rejects malformed required richer array field %s", (field) => {
    expect(() => parseInterviewOutputArtifact({ ...validArtifact, [field]: [] })).toThrow(field);
    expect(() => parseInterviewOutputArtifact({ ...validArtifact, [field]: [""] })).toThrow(
      `${field}[0]`,
    );
    expect(() => parseInterviewOutputArtifact({ ...validArtifact, [field]: "not an array" })).toThrow(
      field,
    );
  });
});
