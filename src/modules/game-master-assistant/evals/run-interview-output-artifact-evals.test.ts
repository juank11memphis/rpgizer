import { describe, expect, it } from "vitest";

import type { InterviewOutputArtifact } from "../domain/interview-output-artifact";
import { validInterviewOutputArtifact } from "../application/test/fake-interview-output-artifact-generator";
import {
  runInterviewOutputArtifactEvals,
  type InterviewOutputArtifactEvalFixture,
  type InterviewOutputArtifactEvalGenerator,
} from "./run-interview-output-artifact-evals";

class CapturedStream {
  private chunks: string[] = [];

  write(chunk: string | Uint8Array): boolean {
    this.chunks.push(String(chunk));
    return true;
  }

  toString(): string {
    return this.chunks.join("");
  }
}

describe("runInterviewOutputArtifactEvals", () => {
  it("returns passed with injected fixtures and fake generator", async () => {
    const output = new CapturedStream();
    const errorOutput = new CapturedStream();

    const result = await runInterviewOutputArtifactEvals({
      environment: configuredEnvironment(),
      loadFixtures: () => [buildFixture("chef")],
      loadInstructions: () => "artifact instructions",
      createGenerator: ({ instructions }) => {
        expect(instructions).toBe("artifact instructions");
        return fakeGenerator(validArtifact());
      },
      output,
      errorOutput,
    });

    expect(result.status).toBe("passed");
    expect(output.toString()).toContain("Interview Output Artifact evals passed: chef");
    expect(errorOutput.toString()).toBe("");
  });

  it("writes configuration blocker output and avoids live generator creation", async () => {
    let generatorCreateCount = 0;
    const output = new CapturedStream();

    const result = await runInterviewOutputArtifactEvals({
      environment: {
        NODE_ENV: "test",
        OPENAI_API_KEY: "replace-with-key",
        OPENAI_INTERVIEW_SUMMARY_MODEL: "gpt-test",
      },
      loadFixtures: () => [buildFixture("blocked")],
      loadInstructions: () => "artifact instructions",
      createGenerator: () => {
        generatorCreateCount += 1;
        return fakeGenerator(validArtifact());
      },
      output,
      errorOutput: new CapturedStream(),
    });

    expect(result.status).toBe("blocked");
    expect(generatorCreateCount).toBe(0);
    expect(output.toString()).toContain("Interview Output Artifact evals skipped");
    expect(output.toString()).not.toContain("replace-with-key");
  });

  it("writes expectation failures to error output", async () => {
    const errorOutput = new CapturedStream();

    const result = await runInterviewOutputArtifactEvals({
      environment: configuredEnvironment(),
      loadFixtures: () => [buildFixture("chef")],
      loadInstructions: () => "artifact instructions",
      createGenerator: () => fakeGenerator(validArtifact({ coreWhy: "Feel creative." })),
      output: new CapturedStream(),
      errorOutput,
    });

    expect(result.status).toBe("failed");
    expect(errorOutput.toString()).toContain("[chef] expected coreWhy to include 'takeout'.");
  });

  it("redacts returned local-only artifacts", async () => {
    const result = await runInterviewOutputArtifactEvals({
      environment: configuredEnvironment(),
      loadFixtures: () => [buildFixture("secret")],
      loadInstructions: () => "system prompt with apiKey: sk-test-secret and password: swordfish",
      createGenerator: () => fakeGenerator(validArtifact({ coreWhy: "Use token: sk-output-secret" })),
      output: new CapturedStream(),
      errorOutput: new CapturedStream(),
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") {
      throw new Error(`Expected failed result, received ${result.status}.`);
    }
    const serializedCell = JSON.stringify(result.cells[0]);
    expect(serializedCell).not.toContain("sk-test-secret");
    expect(serializedCell).not.toContain("sk-output-secret");
    expect(serializedCell).not.toContain("swordfish");
    expect(serializedCell).toContain("[REDACTED]");
  });
});

function configuredEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    OPENAI_API_KEY: "sk-test-local",
    OPENAI_INTERVIEW_SUMMARY_MODEL: "gpt-test",
  };
}

function fakeGenerator(artifact: InterviewOutputArtifact): InterviewOutputArtifactEvalGenerator {
  return {
    async generateArtifact() {
      return artifact;
    },
  };
}

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
