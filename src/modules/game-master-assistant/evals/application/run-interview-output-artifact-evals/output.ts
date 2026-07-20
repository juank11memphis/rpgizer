import type {
  InterviewOutputArtifactEvalAssertion,
  InterviewOutputArtifactEvalDiagnostic,
} from "../../domain/interview-output-artifact-eval-types";

export type { InterviewOutputArtifactEvalAssertion, InterviewOutputArtifactEvalDiagnostic };

export const INTERVIEW_OUTPUT_ARTIFACT_DEFAULT_VARIANT_ID = "default";

export type InterviewOutputArtifactEvalRunDiagnostic = {
  message: string;
  errorName?: string;
};

export type InterviewOutputArtifactEvalMetricValue = {
  value: number | null;
  reported: boolean;
};

export type InterviewOutputArtifactEvalCellMetrics = {
  latencyMs: InterviewOutputArtifactEvalMetricValue;
  tokenCount: InterviewOutputArtifactEvalMetricValue;
  costUsd: InterviewOutputArtifactEvalMetricValue;
};

export type InterviewOutputArtifactEvalArtifact = {
  id: string;
  label: string;
  localOnly: true;
  redactionState: "redacted" | "not_available";
  value?: string;
  preview?: string;
};

export type InterviewOutputArtifactEvalCell = {
  id: string;
  fixtureId: string;
  testCaseId: string;
  testCaseName: string;
  inputVariables: Record<string, string>;
  variantId: typeof INTERVIEW_OUTPUT_ARTIFACT_DEFAULT_VARIANT_ID;
  variantName: "Default variant";
  status: "passed" | "failed";
  output: string;
  outputPreview: string;
  assertions: InterviewOutputArtifactEvalAssertion[];
  diagnostics: InterviewOutputArtifactEvalDiagnostic[];
  metrics: InterviewOutputArtifactEvalCellMetrics;
  artifacts: InterviewOutputArtifactEvalArtifact[];
};

export type InterviewOutputArtifactEvalRunResult =
  | InterviewOutputArtifactEvalPassedResult
  | InterviewOutputArtifactEvalFailedResult
  | InterviewOutputArtifactEvalBlockedResult
  | InterviewOutputArtifactEvalErrorResult;

export type InterviewOutputArtifactEvalPassedResult = {
  status: "passed";
  modelLabel?: string;
  fixtureIds: string[];
  diagnostics: [];
  cells: InterviewOutputArtifactEvalCell[];
  durationMs: number;
};

export type InterviewOutputArtifactEvalFailedResult = {
  status: "failed";
  modelLabel?: string;
  fixtureIds: string[];
  diagnostics: InterviewOutputArtifactEvalDiagnostic[];
  cells: InterviewOutputArtifactEvalCell[];
  durationMs: number;
};

export type InterviewOutputArtifactEvalBlockedResult = {
  status: "blocked";
  fixtureIds: [];
  diagnostics: [InterviewOutputArtifactEvalRunDiagnostic];
  blocker:
    | "missing_openai_api_key"
    | "placeholder_openai_api_key"
    | "placeholder_openai_interview_summary_model";
  durationMs: number;
};

export type InterviewOutputArtifactEvalErrorResult = {
  status: "error";
  modelLabel?: string;
  fixtureIds: string[];
  diagnostics: [InterviewOutputArtifactEvalRunDiagnostic];
  durationMs: number;
};

export function createUnavailableInterviewOutputArtifactEvalCellMetrics(
  latencyMs: number,
): InterviewOutputArtifactEvalCellMetrics {
  return {
    latencyMs: { value: latencyMs, reported: true },
    tokenCount: { value: null, reported: false },
    costUsd: { value: null, reported: false },
  };
}
