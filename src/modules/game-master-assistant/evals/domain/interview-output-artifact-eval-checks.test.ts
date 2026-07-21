import { describe, expect, it } from "vitest";

import type { InterviewOutputArtifact } from "../../domain/interview-output-artifact";
import { validInterviewOutputArtifact } from "../../application/test/fake-interview-output-artifact-generator";
import type { InterviewOutputArtifactEvalFixture } from "./interview-output-artifact-eval-types";
import { checkInterviewOutputArtifactEvalAssertions } from "./interview-output-artifact-eval-checks";

describe("checkInterviewOutputArtifactEvalAssertions", () => {
  it("passes a complete artifact that satisfies fixture expectations", () => {
    const result = checkInterviewOutputArtifactEvalAssertions(buildFixture(), validArtifact());

    expect(result.diagnostics).toEqual([]);
    expect(result.assertions.every((assertion) => assertion.status === "passed")).toBe(true);
  });

  const requiredFieldCases: Array<[string, Partial<InterviewOutputArtifact>]> = [
    ["goalSummary", { goalSummary: " " }],
    ["coreWhy", { coreWhy: " " }],
    ["successDefinition", { successDefinition: " " }],
    ["currentStage", { currentStage: " " }],
    ["compactSourceSummary", { compactSourceSummary: " " }],
    ["blockers", { blockers: [] }],
    ["constraints", { constraints: [] }],
    ["existingResources", { existingResources: [] }],
    ["likelyMissingResources", { likelyMissingResources: [] }],
    ["safetyBoundaries", { safetyBoundaries: [] }],
    ["preferences", { preferences: [] }],
  ];

  it.each(requiredFieldCases)("fails when %s is missing or empty", (_field, override) => {
    const result = checkInterviewOutputArtifactEvalAssertions(
      buildFixture(),
      validArtifact(override),
    );

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.assertions.some((assertion) => assertion.status === "failed")).toBe(true);
  });

  it("returns fixture-specific diagnostics when expected text is missing", () => {
    const result = checkInterviewOutputArtifactEvalAssertions(
      buildFixture(),
      validArtifact({ likelyMissingResources: ["Nothing to add"] }),
    );

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        {
          fixtureId: "fixture-id",
          assertionId: "expect-likelyMissingResources-includes-planning",
          message: "expected likelyMissingResources to include 'planning'.",
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
});

function validArtifact(overrides: Partial<InterviewOutputArtifact> = {}): InterviewOutputArtifact {
  return validInterviewOutputArtifact({
    goalSummary: "Become a confident home chef.",
    coreWhy: "Reduce takeout and feel capable.",
    successDefinition: "Cook three reliable weeknight meals.",
    currentStage: "Can cook basic meals.",
    blockers: ["Stress after work"],
    constraints: ["Mostly vegetarian"],
    existingResources: ["Basic pans"],
    likelyMissingResources: ["Meal planning routine"],
    safetyBoundaries: ["No medical nutrition advice"],
    preferences: ["Weeknight practical meals"],
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
      coreWhy: { includes: ["takeout"] },
      successDefinition: { includes: ["three"] },
      currentStage: { includes: ["basic"] },
      blockers: { includes: ["stress"] },
      constraints: { includes: ["vegetarian"] },
      existingResources: { includes: ["pans"] },
      likelyMissingResources: { includes: ["planning"] },
      safetyBoundaries: { includes: ["medical"] },
      preferences: { includes: ["weeknight"] },
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
