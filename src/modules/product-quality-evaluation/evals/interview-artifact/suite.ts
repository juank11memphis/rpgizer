import {
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeStructuredEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import type { InterviewOutputArtifactEvalRunner } from "../registry";

export const interviewArtifactSuiteSummary: EvalSuiteSummary = {
  id: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
  name: "Interview Artifact",
  shortDescription: "Checks extracted interview output artifacts.",
  purpose:
    "Checks whether interview transcripts become grounded, useful Adventure creation inputs without losing goals, constraints, or safety boundaries.",
  readyTestCases: [
    { id: "become-a-confident-home-chef", name: "become-a-confident-home-chef", inputVariables: { fixtureId: "become-a-confident-home-chef" } },
    { id: "high-stakes-financial-stability", name: "high-stakes-financial-stability", inputVariables: { fixtureId: "high-stakes-financial-stability" } },
  ],
  defaultVariantLabel: "Default variant",
  defaultModelLabel: "Default model",
};

export function createInterviewArtifactSuite(runInterviewOutputArtifactEvals: InterviewOutputArtifactEvalRunner): EvalSuiteDefinition {
  return {
    ...interviewArtifactSuiteSummary,
    variants: [{ id: "default", name: "Default variant", promptLabel: "Default prompt", modelLabel: "Default model" }],
    testCases: interviewArtifactSuiteSummary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const result = await runInterviewOutputArtifactEvals(buildScopedRunnerInput(input.testCaseId));
      return normalizeStructuredEvalSuiteResult(INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID, result);
    },
  };
}
