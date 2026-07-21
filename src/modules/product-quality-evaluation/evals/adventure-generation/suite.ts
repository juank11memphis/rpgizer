import {
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeAdventurePlannerEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import type { GenerateAdventureEvalRunner } from "../registry";

export const adventureGenerationSuiteSummary: EvalSuiteSummary = {
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
  defaultVariantLabel: "Default variant",
  defaultModelLabel: "Default model",
};

export function createAdventureGenerationSuite(runGenerateAdventureEvals: GenerateAdventureEvalRunner): EvalSuiteDefinition {
  return {
    ...adventureGenerationSuiteSummary,
    variants: [{ id: "default", name: "Default variant", promptLabel: "Generate Adventure", modelLabel: "Default model" }],
    testCases: adventureGenerationSuiteSummary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const startedAt = Date.now();
      const result = await runGenerateAdventureEvals(buildScopedRunnerInput(input.testCaseId));
      return normalizeAdventurePlannerEvalSuiteResult(GENERATE_ADVENTURE_EVAL_SUITE_ID, result, Date.now() - startedAt);
    },
  };
}
