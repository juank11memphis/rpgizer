import {
  ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeAdventurePlannerEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import {
  buildEvalSuiteModelDefaults,
  resolveAdventureXpBalancingDefaultModel,
  type EvalSuiteModelEnvironment,
} from "../suite-model-defaults";
import type { FocusedAdventureStepEvalRunner } from "../registry";

const xpBalanceSuiteBaseSummary: Omit<EvalSuiteSummary, "defaultVariantLabel" | "defaultModelLabel" | "defaultModel" | "llmConfiguration"> = {
  id: ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
  name: "XP Balance",
  shortDescription: "Checks skill progression and XP balance.",
  purpose:
    "Checks whether Adventure XP balancing produces practical skill progression without unrealistic or misleading rewards.",
  readyTestCases: [
    { id: "community-garden-rescue", name: "community-garden-rescue", inputVariables: { fixtureId: "community-garden-rescue" } },
    { id: "home-studio-podcast-launch", name: "home-studio-podcast-launch", inputVariables: { fixtureId: "home-studio-podcast-launch" } },
    { id: "spanish-coffee-chat", name: "spanish-coffee-chat", inputVariables: { fixtureId: "spanish-coffee-chat" } },
  ],
};

export function createXpBalanceSuiteSummary(
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteSummary {
  return {
    ...xpBalanceSuiteBaseSummary,
    ...buildEvalSuiteModelDefaults(resolveAdventureXpBalancingDefaultModel(environment)),
  };
}

export const xpBalanceSuiteSummary: EvalSuiteSummary = createXpBalanceSuiteSummary();

export function createXpBalanceSuite(
  runAdventureXpEvals: FocusedAdventureStepEvalRunner,
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteDefinition {
  const summary = createXpBalanceSuiteSummary(environment);

  return {
    ...summary,
    variants: [{ id: summary.defaultModel, name: summary.defaultModel, promptLabel: "Adventure XP Balance", modelLabel: summary.defaultModel }],
    testCases: summary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const startedAt = Date.now();
      const result = await runAdventureXpEvals(buildScopedRunnerInput(input.testCaseId, input.model));
      return normalizeAdventurePlannerEvalSuiteResult(ADVENTURE_XP_BALANCING_EVAL_SUITE_ID, result, Date.now() - startedAt, { modelLabel: input.model });
    },
  };
}
