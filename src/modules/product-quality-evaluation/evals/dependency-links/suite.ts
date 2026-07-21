import {
  ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeAdventurePlannerEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import type { FocusedAdventureStepEvalRunner } from "../registry";

export const dependencyLinksSuiteSummary: EvalSuiteSummary = {
  id: ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  name: "Dependency Links",
  shortDescription: "Checks prerequisite and unlock links.",
  purpose:
    "Checks whether generated Adventure dependency links connect quests, milestones, and inventory in a coherent progression structure.",
  readyTestCases: [
    { id: "spanish-coffee-chat", name: "spanish-coffee-chat", inputVariables: { fixtureId: "spanish-coffee-chat" } },
  ],
  defaultVariantLabel: "Default variant",
  defaultModelLabel: "Default model",
};

export function createDependencyLinksSuite(runAdventureLinkingEvals: FocusedAdventureStepEvalRunner): EvalSuiteDefinition {
  return {
    ...dependencyLinksSuiteSummary,
    variants: [{ id: "default", name: "Default variant", promptLabel: "Adventure Dependency Links", modelLabel: "Default model" }],
    testCases: dependencyLinksSuiteSummary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const startedAt = Date.now();
      const result = await runAdventureLinkingEvals(buildScopedRunnerInput(input.testCaseId));
      return normalizeAdventurePlannerEvalSuiteResult(ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID, result, Date.now() - startedAt);
    },
  };
}
