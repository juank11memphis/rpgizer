import {
  ADVENTURE_CONTENT_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeAdventurePlannerEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import {
  buildEvalSuiteModelDefaults,
  resolveAdventureContentDefaultModel,
  type EvalSuiteModelEnvironment,
} from "../suite-model-defaults";
import type { FocusedAdventureStepEvalRunner } from "../registry";

const adventureContentSuiteBaseSummary: Omit<EvalSuiteSummary, "defaultVariantLabel" | "defaultModelLabel" | "defaultModel" | "llmConfiguration"> = {
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
};

export function createAdventureContentSuiteSummary(
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteSummary {
  return {
    ...adventureContentSuiteBaseSummary,
    ...buildEvalSuiteModelDefaults(resolveAdventureContentDefaultModel(environment)),
  };
}

export const adventureContentSuiteSummary: EvalSuiteSummary = createAdventureContentSuiteSummary();

export function createAdventureContentSuite(
  runAdventureContentEvals: FocusedAdventureStepEvalRunner,
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteDefinition {
  const summary = createAdventureContentSuiteSummary(environment);

  return {
    ...summary,
    variants: [{ id: summary.defaultModel, name: summary.defaultModel, promptLabel: "Adventure Content", modelLabel: summary.defaultModel }],
    testCases: summary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const startedAt = Date.now();
      const result = await runAdventureContentEvals(buildScopedRunnerInput(input.testCaseId, input.model));
      return normalizeAdventurePlannerEvalSuiteResult(ADVENTURE_CONTENT_EVAL_SUITE_ID, result, Date.now() - startedAt, { modelLabel: input.model });
    },
  };
}
