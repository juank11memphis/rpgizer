import { describe, expect, it } from "vitest";

import type { InterviewOutputArtifact } from "../../../domain/interview-output-artifact";
import { validInterviewOutputArtifact } from "../../../application/test/fake-interview-output-artifact-generator";
import type { InterviewOutputArtifactEvalFixture } from "../../domain/interview-output-artifact-eval-types";
import { runInterviewOutputArtifactEvalUseCase } from "./usecase";
import type {
  InterviewOutputArtifactEvalGenerator,
  InterviewOutputArtifactGenerationRequest,
} from "./ports";

class FakeArtifactGenerator implements InterviewOutputArtifactEvalGenerator {
  readonly requests: InterviewOutputArtifactGenerationRequest[] = [];
  private queuedResults: Array<InterviewOutputArtifact | Error> = [];

  queueArtifact(artifact: InterviewOutputArtifact): void {
    this.queuedResults.push(artifact);
  }

  queueError(error: Error): void {
    this.queuedResults.push(error);
  }

  async generateArtifact(
    input: InterviewOutputArtifactGenerationRequest,
  ): Promise<InterviewOutputArtifact> {
    this.requests.push(input);
    const result = this.queuedResults.shift() ?? validArtifact();

    if (result instanceof Error) {
      throw result;
    }

    return result;
  }
}

describe("runInterviewOutputArtifactEvalUseCase", () => {
  it("returns passed cells with configured injected dependencies", async () => {
    const generator = new FakeArtifactGenerator();
    generator.queueArtifact(validArtifact());

    const result = await runInterviewOutputArtifactEvalUseCase({
      environment: configuredEnvironment(),
      loadFixtures: () => [buildFixture("chef")],
      loadInstructions: () => "artifact instructions",
      createGenerator: ({ instructions }) => {
        expect(instructions).toBe("artifact instructions");
        return generator;
      },
      modelLabel: "gpt-test",
    });

    expect(result.status).toBe("passed");
    if (result.status !== "passed") {
      throw new Error(`Expected passed result, received ${result.status}.`);
    }
    expect(result.fixtureIds).toEqual(["chef"]);
    expect(result.cells[0]).toMatchObject({
      id: "chef::default",
      fixtureId: "chef",
      testCaseId: "chef",
      testCaseName: "Fixture",
      variantId: "default",
      variantName: "Default variant",
      status: "passed",
      metrics: {
        tokenCount: { value: null, reported: false },
        costUsd: { value: null, reported: false },
      },
    });
    expect(result.cells[0]?.metrics.latencyMs.reported).toBe(true);
    expect(result.cells[0]?.artifacts.map((artifact) => artifact.id)).toEqual([
      "prompt",
      "request",
      "response",
      "expected",
    ]);
    expect(generator.requests).toHaveLength(1);
    expect(generator.requests[0]).toMatchObject({
      userId: "eval-user-chef",
      adventureId: "eval-adventure-chef",
      goalText: "Become a confident home chef.",
      readinessStatus: "ready_to_generate",
      interviewStatus: "confirmed",
      transcript: [
        {
          id: "chef-1",
          role: "user",
          content: "I want to cook better dinners.",
          sequenceNumber: 1,
          createdAt: new Date(0),
        },
      ],
    });
  });

  it.each([
    {
      name: "missing OPENAI_API_KEY",
      environment: { NODE_ENV: "test", OPENAI_INTERVIEW_SUMMARY_MODEL: "gpt-test" },
      blocker: "missing_openai_api_key",
      message: "OPENAI_API_KEY is not configured",
    },
    {
      name: "placeholder OPENAI_API_KEY",
      environment: {
        NODE_ENV: "test",
        OPENAI_API_KEY: "replace-with-openai-key",
        OPENAI_INTERVIEW_SUMMARY_MODEL: "gpt-test",
      },
      blocker: "placeholder_openai_api_key",
      message: "OPENAI_API_KEY appears to be a placeholder value",
    },
    {
      name: "placeholder OPENAI_INTERVIEW_SUMMARY_MODEL",
      environment: {
        NODE_ENV: "test",
        OPENAI_API_KEY: "sk-test-local",
        OPENAI_INTERVIEW_SUMMARY_MODEL: "replace-with-model",
      },
      blocker: "placeholder_openai_interview_summary_model",
      message: "OPENAI_INTERVIEW_SUMMARY_MODEL appears to be a placeholder value",
    },
  ] as const)("returns blocked for $name before loading dependencies", async (caseData) => {
    let fixtureLoadCount = 0;
    let instructionLoadCount = 0;
    let generatorCreateCount = 0;

    const result = await runInterviewOutputArtifactEvalUseCase({
      environment: caseData.environment,
      loadFixtures: () => {
        fixtureLoadCount += 1;
        return [buildFixture("blocked")];
      },
      loadInstructions: () => {
        instructionLoadCount += 1;
        return "artifact instructions";
      },
      createGenerator: () => {
        generatorCreateCount += 1;
        return new FakeArtifactGenerator();
      },
    });

    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") {
      throw new Error(`Expected blocked result, received ${result.status}.`);
    }
    expect(result.blocker).toBe(caseData.blocker);
    expect(result.diagnostics[0].message).toBe(caseData.message);
    expect(fixtureLoadCount).toBe(0);
    expect(instructionLoadCount).toBe(0);
    expect(generatorCreateCount).toBe(0);
  });

  it("returns a safe error for unknown selected test cases before creating a generator", async () => {
    let generatorCreateCount = 0;

    const result = await runInterviewOutputArtifactEvalUseCase({
      environment: configuredEnvironment(),
      testCaseId: "missing-fixture",
      loadFixtures: () => [buildFixture("chef")],
      loadInstructions: () => "artifact instructions",
      createGenerator: () => {
        generatorCreateCount += 1;
        return new FakeArtifactGenerator();
      },
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") {
      throw new Error(`Expected error result, received ${result.status}.`);
    }
    expect(result.fixtureIds).toEqual([]);
    expect(result.diagnostics[0]).toEqual({
      errorName: "UnknownEvalTestCase",
      message:
        "Interview Output Artifact eval runner error: Error: Selected test case is not available.",
    });
    expect(generatorCreateCount).toBe(0);
  });

  it("returns failed cells and actionable diagnostics for expectation misses", async () => {
    const generator = new FakeArtifactGenerator();
    generator.queueArtifact(validArtifact({ safetyBoundaries: ["Keep it safe."] }));

    const result = await runInterviewOutputArtifactEvalUseCase({
      environment: configuredEnvironment(),
      loadFixtures: () => [highStakesFixture()],
      loadInstructions: () => "artifact instructions",
      createGenerator: () => generator,
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") {
      throw new Error(`Expected failed result, received ${result.status}.`);
    }
    expect(result.cells[0]?.status).toBe("failed");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        {
          fixtureId: "high-stakes",
          assertionId: "expect-safetyBoundaries-includes-financial-advice",
          message: "expected safetyBoundaries to include 'financial advice'.",
        },
      ]),
    );
  });

  it("returns a safe error for unexpected generator failures", async () => {
    const generator = new FakeArtifactGenerator();
    generator.queueError(new Error("provider response included raw transcript and sk-secret"));

    const result = await runInterviewOutputArtifactEvalUseCase({
      environment: configuredEnvironment(),
      loadFixtures: () => [buildFixture("unsafe-error")],
      loadInstructions: () => "artifact instructions",
      createGenerator: () => generator,
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") {
      throw new Error(`Expected error result, received ${result.status}.`);
    }
    expect(result.diagnostics[0]).toEqual({
      errorName: "Error",
      message:
        "Interview Output Artifact eval runner error: Error: Unexpected eval runner failure.",
    });
    expect(result.diagnostics[0].message).not.toContain("sk-secret");
  });
});

function configuredEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    OPENAI_API_KEY: "sk-test-local",
    OPENAI_INTERVIEW_SUMMARY_MODEL: "gpt-test",
  };
}

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

function buildFixture(id: string): InterviewOutputArtifactEvalFixture {
  return {
    id,
    name: "Fixture",
    context: {
      goalText: "Become a confident home chef.",
      readinessStatus: "ready_to_generate",
      interviewStatus: "confirmed",
    },
    transcript: [{ role: "user", content: "I want to cook better dinners." }],
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
    ...buildFixture("high-stakes"),
    expectations: {
      ...buildFixture("high-stakes").expectations,
      safetyBoundaries: { includes: ["financial advice", "risky"] },
    },
  };
}
