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
      GENERATE_ADVENTURE_EVAL_SUITE_ID,
      ADVENTURE_CONTENT_EVAL_SUITE_ID,
      ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
      ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
    ]);
    expect(suites.map((suite) => suite.name)).toEqual([
      "Game Master",
      "Artifact",
      "Generate Adventure",
      "Content",
      "Dependency Links",
      "XP Balance",
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
});
