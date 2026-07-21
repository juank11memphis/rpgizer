import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeStructuredEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import type { GameMasterInterviewEvalRunner } from "../registry";

export const interviewSuiteSummary: EvalSuiteSummary = {
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
  defaultVariantLabel: "Default variant",
  defaultModelLabel: "Default model",
};

export function createInterviewSuite(runGameMasterInterviewEvals: GameMasterInterviewEvalRunner): EvalSuiteDefinition {
  return {
    ...interviewSuiteSummary,
    variants: [{ id: "default", name: "Default variant", promptLabel: "Default prompt", modelLabel: "Default model" }],
    testCases: interviewSuiteSummary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const result = await runGameMasterInterviewEvals(buildScopedRunnerInput(input.testCaseId));
      return normalizeStructuredEvalSuiteResult(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, result);
    },
  };
}
