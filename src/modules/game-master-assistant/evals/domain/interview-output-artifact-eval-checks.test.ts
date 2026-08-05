import { describe, expect, it } from "vitest";

import { validInterviewOutputArtifact } from "../../application/test/fake-interview-output-artifact-generator";
import type { InterviewOutputArtifact } from "../../domain/interview-output-artifact";
import { checkInterviewOutputArtifactEvalAssertions } from "./interview-output-artifact-eval-checks";
import type { InterviewOutputArtifactEvalFixture } from "./interview-output-artifact-eval-types";

describe("checkInterviewOutputArtifactEvalAssertions", () => {
  it("passes a complete artifact that satisfies fixture expectations", () => {
    const result = checkInterviewOutputArtifactEvalAssertions(buildFixture(), validArtifact());

    expect(result.diagnostics).toEqual([]);
    expect(result.assertions.every((assertion) => assertion.status === "passed")).toBe(true);
  });

  const requiredFieldCases: Array<[string, Partial<InterviewOutputArtifact>]> = [
    ["goalSummary", { goalSummary: " " }],
    ["goalType", { goalType: " " }],
    ["coreWhy", { coreWhy: " " }],
    ["motivationDetails", { motivationDetails: [] }],
    ["successDefinition", { successDefinition: " " }],
    ["currentStage", { currentStage: " " }],
    ["currentSkillOrBaseline", { currentSkillOrBaseline: " " }],
    ["firstMilestoneReadiness", { firstMilestoneReadiness: " " }],
    ["compactSourceSummary", { compactSourceSummary: " " }],
    ["blockers", { blockers: [] }],
    ["constraints", { constraints: [] }],
    ["existingResources", { existingResources: [] }],
    ["likelyMissingResources", { likelyMissingResources: [] }],
    ["missingResources", { missingResources: [] }],
    ["safetyBoundaries", { safetyBoundaries: [] }],
    ["preferences", { preferences: [] }],
    ["dislikesOrAvoidances", { dislikesOrAvoidances: [] }],
    ["priorAttempts", { priorAttempts: [] }],
    ["confidenceGaps", { confidenceGaps: [] }],
    ["examplesOrInspirations", { examplesOrInspirations: [] }],
  ];

  it.each(requiredFieldCases)("fails when %s is missing or empty", (_field, override) => {
    const result = checkInterviewOutputArtifactEvalAssertions(
      buildFixture(),
      validArtifact(override),
    );

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.assertions.some((assertion) => assertion.status === "failed")).toBe(true);
  });

  it("returns fixture-specific diagnostics when expected text is missing from the targeted field", () => {
    const result = checkInterviewOutputArtifactEvalAssertions(
      buildFixture(),
      validArtifact({
        missingResources: ["Nothing to add"],
        compactSourceSummary: "The compact summary still mentions planning.",
      }),
    );

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        {
          fixtureId: "fixture-id",
          assertionId: "expect-missingResources-includes-planning",
          message: "expected missingResources to include 'planning'.",
        },
      ]),
    );
  });

  it("checks high-stakes safety-boundary expectations deterministically", () => {
    const result = checkInterviewOutputArtifactEvalAssertions(
      highStakesFixture(),
      validArtifact({ safetyBoundaries: ["Avoid risky investing and financial advice."] }),
    );

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ assertionId: "expect-safetyBoundaries-includes-financial-advice" }),
    );
  });

  it("passes an alternative include expectation when any phrase is present", () => {
    const result = checkInterviewOutputArtifactEvalAssertions(
      alternativeExpectationFixture(),
      validArtifact({ currentStage: "Ready; the user is behind on rent and support is available." }),
    );

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({
        assertionId: "expect-currentStage-includes-any-missed-rent-or-rent-was-missed-or-behind-on-rent",
      }),
    );
  });

  it("accepts semantic alternatives for high-stakes success definitions", () => {
    const result = checkInterviewOutputArtifactEvalAssertions(
      highStakesSuccessDefinitionFixture(),
      validArtifact({
        successDefinition:
          "A realistic, low-risk way to get current and keep money steady enough to address rent, bills, and immediate tenant support needs.",
      }),
    );

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({
        assertionId: "expect-successDefinition-includes-any-cash-flow-or-money-steady-or-steady-enough",
      }),
    );
  });
});

function validArtifact(overrides: Partial<InterviewOutputArtifact> = {}): InterviewOutputArtifact {
  return validInterviewOutputArtifact({
    goalSummary: "Become a confident home chef.",
    goalType: "cooking skill",
    coreWhy: "Reduce takeout and feel capable.",
    motivationDetails: ["Reduce takeout", "Feel capable"],
    successDefinition: "Cook three reliable weeknight meals.",
    currentStage: "Can cook basic meals.",
    currentSkillOrBaseline: "Beginner with basic cooking skills.",
    blockers: ["Stress after work"],
    constraints: ["Mostly vegetarian"],
    existingResources: ["Basic pans"],
    likelyMissingResources: ["Meal planning routine"],
    missingResources: ["Planning routine"],
    safetyBoundaries: ["No medical nutrition advice"],
    preferences: ["Weeknight practical meals"],
    dislikesOrAvoidances: ["Avoid stressful recipes"],
    priorAttempts: ["Tried cooking basic meals"],
    confidenceGaps: ["Unsure how to plan"],
    examplesOrInspirations: ["Vegetarian dinners"],
    firstMilestoneReadiness: "Ready for a first meal-planning milestone.",
    compactSourceSummary: "Three vegetarian weeknight meals with planning support.",
    ...overrides,
  });
}

function buildFixture(): InterviewOutputArtifactEvalFixture {
  return {
    id: "fixture-id",
    name: "Fixture",
    context: {
      goalText: "Become a confident home chef.",
      readinessStatus: "ready_to_generate",
      interviewStatus: "confirmed",
    },
    transcript: [{ role: "user", content: "I want to cook better." }],
    expectations: {
      goalSummary: { includes: ["confident"] },
      goalType: { includes: ["cooking"] },
      coreWhy: { includes: ["takeout"] },
      motivationDetails: { includes: ["capable"] },
      successDefinition: { includes: ["three"] },
      currentStage: { includes: ["basic"] },
      currentSkillOrBaseline: { includes: ["beginner"] },
      blockers: { includes: ["stress"] },
      constraints: { includes: ["vegetarian"] },
      existingResources: { includes: ["pans"] },
      likelyMissingResources: { includes: ["planning"] },
      missingResources: { includes: ["planning"] },
      safetyBoundaries: { includes: ["medical"] },
      preferences: { includes: ["weeknight"] },
      dislikesOrAvoidances: { includes: ["stressful"] },
      priorAttempts: { includes: ["basic"] },
      confidenceGaps: { includes: ["plan"] },
      examplesOrInspirations: { includes: ["vegetarian"] },
      firstMilestoneReadiness: { includes: ["first"] },
      compactSourceSummary: { includes: ["vegetarian"] },
    },
  };
}

function highStakesFixture(): InterviewOutputArtifactEvalFixture {
  return {
    ...buildFixture(),
    expectations: {
      ...buildFixture().expectations,
      safetyBoundaries: { includes: ["financial advice", "risky"] },
    },
  };
}

function alternativeExpectationFixture(): InterviewOutputArtifactEvalFixture {
  return {
    ...buildFixture(),
    expectations: {
      ...buildFixture().expectations,
      currentStage: { includesAny: [["missed rent", "rent was missed", "behind on rent"]] },
    },
  };
}

function highStakesSuccessDefinitionFixture(): InterviewOutputArtifactEvalFixture {
  return {
    ...buildFixture(),
    expectations: {
      ...buildFixture().expectations,
      successDefinition: { includesAny: [["cash flow", "money steady", "steady enough"]] },
    },
  };
}
