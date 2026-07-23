import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeStructuredEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import {
  buildEvalSuiteModelDefaults,
  resolveGameMasterInterviewDefaultModel,
  type EvalSuiteModelEnvironment,
} from "../suite-model-defaults";
import type { GameMasterInterviewEvalRunner } from "../registry";

const interviewSuiteBaseSummary: Omit<EvalSuiteSummary, "defaultVariantLabel" | "defaultModelLabel" | "defaultModel" | "llmConfiguration"> = {
  id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  name: "Interview",
  shortDescription: "Checks focused, useful interview turns.",
  purpose:
    "Checks whether the Game Master interview asks focused questions, keeps useful boundaries, and helps maintainers catch product-quality regressions before changes ship.",
  readyTestCases: [
    { id: "become-a-chef-initial", name: "become-a-chef-initial", inputVariables: { topic: "baking", initial: "true" } },
    { id: "become-a-chef", name: "become-a-chef", inputVariables: { topic: "baking" } },
    { id: "high-stakes-finance", name: "high-stakes-finance", inputVariables: { topic: "finance" } },
    { id: "learn-a-language", name: "learn-a-language", inputVariables: { topic: "language learning" } },
  ],
};

export function createInterviewSuiteSummary(
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteSummary {
  return {
    ...interviewSuiteBaseSummary,
    ...buildEvalSuiteModelDefaults(resolveGameMasterInterviewDefaultModel(environment)),
  };
}

export const interviewSuiteSummary: EvalSuiteSummary = createInterviewSuiteSummary();

export function createInterviewSuite(
  runGameMasterInterviewEvals: GameMasterInterviewEvalRunner,
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteDefinition {
  const summary = createInterviewSuiteSummary(environment);

  return {
    ...summary,
    variants: [{ id: summary.defaultModel, name: summary.defaultModel, promptLabel: "Default prompt", modelLabel: summary.defaultModel }],
    testCases: summary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const result = await runGameMasterInterviewEvals(buildScopedRunnerInput(input.testCaseId, input.model));
      return normalizeStructuredEvalSuiteResult(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, result, { modelLabel: input.model });
    },
  };
}
