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
    const suites = listEvalSuites({});

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
    const suites = listEvalSuites({});

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
          id: ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
          purpose: expect.stringContaining("dependency links"),
          readyTestCases: expect.arrayContaining([
            expect.objectContaining({ id: "community-garden-rescue" }),
            expect.objectContaining({ id: "home-studio-podcast-launch" }),
            expect.objectContaining({ id: "spanish-coffee-chat" }),
          ]),
        }),
        expect.objectContaining({
          id: ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
          purpose: expect.stringContaining("XP balancing"),
          readyTestCases: expect.arrayContaining([
            expect.objectContaining({ id: "community-garden-rescue" }),
            expect.objectContaining({ id: "home-studio-podcast-launch" }),
            expect.objectContaining({ id: "spanish-coffee-chat" }),
          ]),
        }),
      ]),
    );

    for (const suite of suites) {
      expect(suite.purpose).not.toContain("OPENAI_API_KEY");
      expect(suite.shortDescription).not.toContain("OPENAI_API_KEY");
      expect(suite.defaultVariantLabel).toBe("gpt-5.4-mini");
      expect(suite.defaultModelLabel).toBe("gpt-5.4-mini");
      expect(suite.defaultModel).toBe("gpt-5.4-mini");
      expect(suite.llmConfiguration.selectedModel).toBe("gpt-5.4-mini");
      expect(suite.readyTestCases.length).toBeGreaterThan(0);
    }
  });

  it("lists Interview suite Test Cases from the framework registry", () => {
    const interviewSuite = listEvalSuites({}).find((suite) => suite.id === GAME_MASTER_INTERVIEW_EVAL_SUITE_ID);

    expect(interviewSuite).toEqual(
      expect.objectContaining({
        id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
        name: "Interview",
        defaultVariantLabel: "gpt-5.4-mini",
        defaultModelLabel: "gpt-5.4-mini",
        defaultModel: "gpt-5.4-mini",
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
    const artifactSuite = listEvalSuites({}).find((suite) => suite.id === INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID);

    expect(artifactSuite).toEqual(
      expect.objectContaining({
        id: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
        name: "Interview Artifact",
        defaultVariantLabel: "gpt-5.4-mini",
        defaultModelLabel: "gpt-5.4-mini",
        defaultModel: "gpt-5.4-mini",
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
    const first = listEvalSuites({});
    const second = listEvalSuites({});

    first[0]!.readyTestCases[0]!.inputVariables.topic = "mutated";
    first[0]!.readyTestCases.push({ id: "mutated", name: "mutated", inputVariables: {} });

    expect(second[0]!.readyTestCases).not.toContainEqual(expect.objectContaining({ id: "mutated" }));
    expect(second[0]!.readyTestCases[0]!.inputVariables).toEqual({ topic: "baking", initial: "true" });
    expect(listEvalSuites({})[0]!.readyTestCases[0]!.inputVariables).toEqual({ topic: "baking", initial: "true" });
  });

  it("resolves suite defaults from local model configuration without sharing mutable model groups", () => {
    const suites = listEvalSuites({
      OPENAI_GAME_MASTER_MODEL: "gpt-4o-mini",
      OPENAI_ADVENTURE_GENERATION_MODEL: "o4-mini",
      OPENAI_ADVENTURE_CONTENT_MODEL: "gpt-5.4",
    });

    const interviewSuite = suites.find((suite) => suite.id === GAME_MASTER_INTERVIEW_EVAL_SUITE_ID);
    const adventureContentSuite = suites.find((suite) => suite.id === ADVENTURE_CONTENT_EVAL_SUITE_ID);
    const dependencySuite = suites.find((suite) => suite.id === ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID);

    expect(interviewSuite?.defaultModel).toBe("gpt-4o-mini");
    expect(interviewSuite?.defaultModelLabel).toBe("gpt-4o-mini");
    expect(adventureContentSuite?.defaultModel).toBe("gpt-5.4");
    expect(dependencySuite?.defaultModel).toBe("o4-mini");

    suites[0]!.llmConfiguration.modelGroups[0]!.models[0]!.label = "mutated";
    expect(listEvalSuites({})[0]!.llmConfiguration.modelGroups[0]!.models[0]!.label).toBe("gpt-5.4-nano");
  });

});
