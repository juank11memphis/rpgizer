import {
  ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeAdventurePlannerEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import type { FocusedAdventureStepEvalRunner } from "../registry";

export const xpBalanceSuiteSummary: EvalSuiteSummary = {
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
  defaultVariantLabel: "Default variant",
  defaultModelLabel: "Default model",
};

export function createXpBalanceSuite(runAdventureXpEvals: FocusedAdventureStepEvalRunner): EvalSuiteDefinition {
  return {
    ...xpBalanceSuiteSummary,
    variants: [{ id: "default", name: "Default variant", promptLabel: "Adventure XP Balance", modelLabel: "Default model" }],
    testCases: xpBalanceSuiteSummary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const startedAt = Date.now();
      const result = await runAdventureXpEvals(buildScopedRunnerInput(input.testCaseId));
      return normalizeAdventurePlannerEvalSuiteResult(ADVENTURE_XP_BALANCING_EVAL_SUITE_ID, result, Date.now() - startedAt);
    },
  };
}
