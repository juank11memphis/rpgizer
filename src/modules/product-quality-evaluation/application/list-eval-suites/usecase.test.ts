import { describe, expect, it } from "vitest";

import {
  ADVENTURE_CONTENT_EVAL_SUITE_ID,
  ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
} from "../../domain/eval-suite";
import { listEvalSuites } from "./usecase";

describe("listEvalSuites", () => {
  it("returns the six selectable Product Quality Evaluation suites", () => {
    const suites = listEvalSuites();

    expect(suites.map((suite) => suite.id)).toEqual([
      GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
      ADVENTURE_CONTENT_EVAL_SUITE_ID,
      ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
      ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
      GENERATE_ADVENTURE_EVAL_SUITE_ID,
    ]);
    expect(suites.map((suite) => suite.name)).toEqual([
      "Interview",
      "Interview Artifact",
      "Adventure Content",
      "Dependency Links",
      "XP Balance",
      "Adventure Generation",
    ]);
  });

  it("provides maintainer-facing metadata without checking runtime configuration", () => {
    const suites = listEvalSuites();

    expect(suites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
          shortDescription: "Checks focused, useful interview turns.",
          purpose: expect.stringContaining("focused questions"),
          readyTestCases: expect.arrayContaining([expect.objectContaining({ id: "become-a-chef" })]),
        }),
        expect.objectContaining({
          id: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
          shortDescription: "Checks extracted interview output artifacts.",
          purpose: expect.stringContaining("interview transcripts"),
          readyTestCases: expect.arrayContaining([expect.objectContaining({ id: "become-a-confident-home-chef" })]),
        }),
        expect.objectContaining({
          id: ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
          purpose: expect.stringContaining("XP balancing"),
          readyTestCases: expect.arrayContaining([expect.objectContaining({ id: "spanish-coffee-chat" })]),
        }),
      ]),
    );

    for (const suite of suites) {
      expect(suite.purpose).not.toContain("OPENAI_API_KEY");
      expect(suite.shortDescription).not.toContain("OPENAI_API_KEY");
      expect(suite.defaultVariantLabel).toBe("Default variant");
      expect(suite.defaultModelLabel).toBe("Default model");
      expect(suite.readyTestCases.length).toBeGreaterThan(0);
    }
  });

  it("lists Interview suite Test Cases from the framework registry", () => {
    const interviewSuite = listEvalSuites().find((suite) => suite.id === GAME_MASTER_INTERVIEW_EVAL_SUITE_ID);

    expect(interviewSuite).toEqual(
      expect.objectContaining({
        id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
        name: "Interview",
        defaultVariantLabel: "Default variant",
        defaultModelLabel: "Default model",
        readyTestCases: [
          { id: "become-a-chef-initial", name: "become-a-chef-initial", inputVariables: { topic: "baking", initial: "true" } },
          { id: "become-a-chef", name: "become-a-chef", inputVariables: { topic: "baking" } },
          { id: "high-stakes-finance", name: "high-stakes-finance", inputVariables: { topic: "finance" } },
          { id: "learn-a-language", name: "learn-a-language", inputVariables: { topic: "language learning" } },
        ],
      }),
    );
  });

  it("lists Interview Artifact suite Test Cases from the framework registry", () => {
    const artifactSuite = listEvalSuites().find((suite) => suite.id === INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID);

    expect(artifactSuite).toEqual(
      expect.objectContaining({
        id: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
        name: "Interview Artifact",
        defaultVariantLabel: "Default variant",
        defaultModelLabel: "Default model",
        readyTestCases: [
          {
            id: "become-a-confident-home-chef",
            name: "become-a-confident-home-chef",
            inputVariables: { fixtureId: "become-a-confident-home-chef" },
          },
          {
            id: "high-stakes-financial-stability",
            name: "high-stakes-financial-stability",
            inputVariables: { fixtureId: "high-stakes-financial-stability" },
          },
        ],
      }),
    );
  });

  it("returns cloned suite and Test Case data on each call", () => {
    const first = listEvalSuites();
    const second = listEvalSuites();

    first[0]!.readyTestCases[0]!.inputVariables.topic = "mutated";
    first[0]!.readyTestCases.push({ id: "mutated", name: "mutated", inputVariables: {} });

    expect(second[0]!.readyTestCases).not.toContainEqual(expect.objectContaining({ id: "mutated" }));
    expect(second[0]!.readyTestCases[0]!.inputVariables).toEqual({ topic: "baking", initial: "true" });
    expect(listEvalSuites()[0]!.readyTestCases[0]!.inputVariables).toEqual({ topic: "baking", initial: "true" });
  });
});
