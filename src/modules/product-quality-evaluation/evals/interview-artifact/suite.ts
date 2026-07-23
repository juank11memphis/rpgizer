import {
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
  type EvalSuiteDefinition,
  type EvalSuiteRunInput,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";
import { buildScopedRunnerInput, normalizeStructuredEvalSuiteResult } from "../../application/run-eval-suite/eval-suite-result-normalizers";
import {
  buildEvalSuiteModelDefaults,
  resolveInterviewArtifactDefaultModel,
  type EvalSuiteModelEnvironment,
} from "../suite-model-defaults";
import type { InterviewOutputArtifactEvalRunner } from "../registry";

const interviewArtifactSuiteBaseSummary: Omit<EvalSuiteSummary, "defaultVariantLabel" | "defaultModelLabel" | "defaultModel" | "llmConfiguration"> = {
  id: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
  name: "Interview Artifact",
  shortDescription: "Checks extracted interview output artifacts.",
  purpose:
    "Checks whether interview transcripts become grounded, useful Adventure creation inputs without losing goals, constraints, or safety boundaries.",
  readyTestCases: [
    { id: "become-a-confident-home-chef", name: "become-a-confident-home-chef", inputVariables: { fixtureId: "become-a-confident-home-chef" } },
    { id: "high-stakes-financial-stability", name: "high-stakes-financial-stability", inputVariables: { fixtureId: "high-stakes-financial-stability" } },
  ],
};

export function createInterviewArtifactSuiteSummary(
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteSummary {
  return {
    ...interviewArtifactSuiteBaseSummary,
    ...buildEvalSuiteModelDefaults(resolveInterviewArtifactDefaultModel(environment)),
  };
}

export const interviewArtifactSuiteSummary: EvalSuiteSummary = createInterviewArtifactSuiteSummary();

export function createInterviewArtifactSuite(
  runInterviewOutputArtifactEvals: InterviewOutputArtifactEvalRunner,
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteDefinition {
  const summary = createInterviewArtifactSuiteSummary(environment);

  return {
    ...summary,
    variants: [{ id: summary.defaultModel, name: summary.defaultModel, promptLabel: "Default prompt", modelLabel: summary.defaultModel }],
    testCases: summary.readyTestCases,
    async run(input: EvalSuiteRunInput) {
      const result = await runInterviewOutputArtifactEvals(buildScopedRunnerInput(input.testCaseId, input.model));
      return normalizeStructuredEvalSuiteResult(INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID, result, { modelLabel: input.model });
    },
  };
}
