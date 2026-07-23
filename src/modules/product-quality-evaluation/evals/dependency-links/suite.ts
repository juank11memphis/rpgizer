import {
  ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeAdventurePlannerEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import {
  buildEvalSuiteModelDefaults,
  resolveAdventureDependencyLinkingDefaultModel,
  type EvalSuiteModelEnvironment,
} from "../suite-model-defaults";
import type { FocusedAdventureStepEvalRunner } from "../registry";

const dependencyLinksSuiteBaseSummary: Omit<EvalSuiteSummary, "defaultVariantLabel" | "defaultModelLabel" | "defaultModel" | "llmConfiguration"> = {
  id: ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  name: "Dependency Links",
  shortDescription: "Checks prerequisite and unlock links.",
  purpose:
    "Checks whether generated Adventure dependency links connect quests, milestones, and inventory in a coherent progression structure.",
  readyTestCases: [
    { id: "community-garden-rescue", name: "community-garden-rescue", inputVariables: { fixtureId: "community-garden-rescue" } },
    { id: "home-studio-podcast-launch", name: "home-studio-podcast-launch", inputVariables: { fixtureId: "home-studio-podcast-launch" } },
    { id: "spanish-coffee-chat", name: "spanish-coffee-chat", inputVariables: { fixtureId: "spanish-coffee-chat" } },
  ],
};

export function createDependencyLinksSuiteSummary(
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteSummary {
  return {
    ...dependencyLinksSuiteBaseSummary,
    ...buildEvalSuiteModelDefaults(resolveAdventureDependencyLinkingDefaultModel(environment)),
  };
}

export const dependencyLinksSuiteSummary: EvalSuiteSummary = createDependencyLinksSuiteSummary();

export function createDependencyLinksSuite(
  runAdventureLinkingEvals: FocusedAdventureStepEvalRunner,
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteDefinition {
  const summary = createDependencyLinksSuiteSummary(environment);

  return {
    ...summary,
    variants: [{ id: summary.defaultModel, name: summary.defaultModel, promptLabel: "Adventure Dependency Links", modelLabel: summary.defaultModel }],
    testCases: summary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const startedAt = Date.now();
      const result = await runAdventureLinkingEvals(buildScopedRunnerInput(input.testCaseId, input.model));
      return normalizeAdventurePlannerEvalSuiteResult(ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID, result, Date.now() - startedAt, { modelLabel: input.model });
    },
  };
}
