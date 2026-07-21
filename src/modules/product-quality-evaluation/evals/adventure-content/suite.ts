import {
  ADVENTURE_CONTENT_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeAdventurePlannerEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import type { FocusedAdventureStepEvalRunner } from "../registry";

export const adventureContentSuiteSummary: EvalSuiteSummary = {
  id: ADVENTURE_CONTENT_EVAL_SUITE_ID,
  name: "Adventure Content",
  shortDescription: "Checks generated Adventure content quality.",
  purpose:
    "Checks whether focused Adventure content generation is specific, useful, RPG-native, and grounded in the selected Test Case context.",
  readyTestCases: [
    { id: "learn-a-skill", name: "learn-a-skill", inputVariables: { goal: "Spanish coffee chat" } },
    { id: "build-a-product", name: "build-a-product", inputVariables: { goal: "Launch small product" } },
    { id: "fitness-habit", name: "fitness-habit", inputVariables: { goal: "Build fitness habit" } },
    { id: "high-stakes-boundary", name: "high-stakes-boundary", inputVariables: { goal: "High-stakes boundary" } },
  ],
  defaultVariantLabel: "Default variant",
  defaultModelLabel: "Default model",
};

export function createAdventureContentSuite(runAdventureContentEvals: FocusedAdventureStepEvalRunner): EvalSuiteDefinition {
  return {
    ...adventureContentSuiteSummary,
    variants: [{ id: "default", name: "Default variant", promptLabel: "Adventure Content", modelLabel: "Default model" }],
    testCases: adventureContentSuiteSummary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const startedAt = Date.now();
      const result = await runAdventureContentEvals(buildScopedRunnerInput(input.testCaseId));
      return normalizeAdventurePlannerEvalSuiteResult(ADVENTURE_CONTENT_EVAL_SUITE_ID, result, Date.now() - startedAt);
    },
  };
}
