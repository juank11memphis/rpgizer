import type { GameMasterInterviewEvalAssertion } from "../../domain/game-master-interview-eval-types";

export type { GameMasterInterviewEvalAssertion };

export const GAME_MASTER_INTERVIEW_DEFAULT_VARIANT_ID = "default";

export type GameMasterInterviewEvalDiagnostic = {
  fixtureId: string;
  message: string;
};

export type GameMasterInterviewEvalRunDiagnostic = {
  message: string;
  errorName?: string;
};

export type GameMasterInterviewEvalMetricValue = {
  value: number | null;
  reported: boolean;
};

export type GameMasterInterviewEvalCellMetrics = {
  latencyMs: GameMasterInterviewEvalMetricValue;
  tokenCount: GameMasterInterviewEvalMetricValue;
  costUsd: GameMasterInterviewEvalMetricValue;
};

export type GameMasterInterviewEvalArtifact = {
  id: string;
  label: string;
  localOnly: true;
  redactionState: "redacted" | "not_available";
  value?: string;
  preview?: string;
};

export type GameMasterInterviewEvalCell = {
  id: string;
  fixtureId: string;
  testCaseId: string;
  testCaseName: string;
  inputVariables: Record<string, string>;
  variantId: typeof GAME_MASTER_INTERVIEW_DEFAULT_VARIANT_ID;
  variantName: "Default variant";
  status: "passed" | "failed";
  output: string;
  outputPreview: string;
  assertions: GameMasterInterviewEvalAssertion[];
  diagnostics: GameMasterInterviewEvalDiagnostic[];
  metrics: GameMasterInterviewEvalCellMetrics;
  artifacts: GameMasterInterviewEvalArtifact[];
};

export type GameMasterInterviewEvalRunResult =
  | GameMasterInterviewEvalPassedResult
  | GameMasterInterviewEvalFailedResult
  | GameMasterInterviewEvalBlockedResult
  | GameMasterInterviewEvalErrorResult;

export type GameMasterInterviewEvalPassedResult = {
  status: "passed";
  modelLabel?: string;
  fixtureIds: string[];
  diagnostics: [];
  cells: GameMasterInterviewEvalCell[];
  durationMs: number;
};

export type GameMasterInterviewEvalFailedResult = {
  status: "failed";
  modelLabel?: string;
  fixtureIds: string[];
  diagnostics: GameMasterInterviewEvalDiagnostic[];
  cells: GameMasterInterviewEvalCell[];
  durationMs: number;
};

export type GameMasterInterviewEvalBlockedResult = {
  status: "blocked";
  fixtureIds: [];
  diagnostics: [GameMasterInterviewEvalRunDiagnostic];
  blocker: "missing_openai_api_key" | "placeholder_openai_api_key" | "placeholder_openai_game_master_model";
  durationMs: number;
};

export type GameMasterInterviewEvalErrorResult = {
  status: "error";
  modelLabel?: string;
  fixtureIds: string[];
  diagnostics: [GameMasterInterviewEvalRunDiagnostic];
  durationMs: number;
};

export function createUnavailableGameMasterInterviewEvalCellMetrics(
  latencyMs: number,
): GameMasterInterviewEvalCellMetrics {
  return {
    latencyMs: { value: latencyMs, reported: true },
    tokenCount: { value: null, reported: false },
    costUsd: { value: null, reported: false },
  };
}
