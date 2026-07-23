import {
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeAdventurePlannerEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import {
  buildEvalSuiteModelDefaults,
  resolveAdventureGenerationDefaultModel,
  type EvalSuiteModelEnvironment,
} from "../suite-model-defaults";
import type { GenerateAdventureEvalRunner } from "../registry";

const adventureGenerationSuiteBaseSummary: Omit<EvalSuiteSummary, "defaultVariantLabel" | "defaultModelLabel" | "defaultModel" | "llmConfiguration"> = {
  id: GENERATE_ADVENTURE_EVAL_SUITE_ID,
  name: "Adventure Generation",
  shortDescription: "Checks full playable roadmap generation.",
  purpose:
    "Checks whether the Adventure generation pipeline turns interview context into coherent quests, milestones, inventory, dependencies, and XP balance.",
  readyTestCases: [
    { id: "learn-a-skill", name: "learn-a-skill", inputVariables: { goal: "Spanish coffee chat" } },
    { id: "build-a-product", name: "build-a-product", inputVariables: { goal: "Launch small product" } },
    { id: "fitness-habit", name: "fitness-habit", inputVariables: { goal: "Build fitness habit" } },
    { id: "high-stakes-boundary", name: "high-stakes-boundary", inputVariables: { goal: "High-stakes boundary" } },
  ],
};

export function createAdventureGenerationSuiteSummary(
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteSummary {
  return {
    ...adventureGenerationSuiteBaseSummary,
    ...buildEvalSuiteModelDefaults(resolveAdventureGenerationDefaultModel(environment)),
  };
}

export const adventureGenerationSuiteSummary: EvalSuiteSummary = createAdventureGenerationSuiteSummary();

export function createAdventureGenerationSuite(
  runGenerateAdventureEvals: GenerateAdventureEvalRunner,
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteDefinition {
  const summary = createAdventureGenerationSuiteSummary(environment);

  return {
    ...summary,
    variants: [{ id: summary.defaultModel, name: summary.defaultModel, promptLabel: "Generate Adventure", modelLabel: summary.defaultModel }],
    testCases: summary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const startedAt = Date.now();
      const result = await runGenerateAdventureEvals(buildScopedRunnerInput(input.testCaseId, input.model));
      return normalizeAdventurePlannerEvalSuiteResult(GENERATE_ADVENTURE_EVAL_SUITE_ID, result, Date.now() - startedAt, { modelLabel: input.model });
    },
  };
}
