import type { EvalSuiteId } from "../../domain/eval-suite";

export type EvalRunStatus = "passed" | "failed" | "blocked" | "error";

export type EvalDiagnostic = {
  scope: "fixture" | "configuration" | "run";
  message: string;
  fixtureId?: string;
  code?: string;
};

export type EvalRunResult =
  | EvalRunPassedResult
  | EvalRunFailedResult
  | EvalRunBlockedResult
  | EvalRunErrorResult;

export type EvalRunPassedResult = {
  suiteId: EvalSuiteId;
  status: "passed";
  summary: string;
  diagnostics: [];
  durationMs: number;
};

export type EvalRunFailedResult = {
  suiteId: EvalSuiteId;
  status: "failed";
  summary: string;
  diagnostics: EvalDiagnostic[];
  durationMs: number;
};

export type EvalRunBlockedResult = {
  suiteId: EvalSuiteId | string;
  status: "blocked";
  summary: string;
  diagnostics: EvalDiagnostic[];
  blocker: string;
  durationMs: number;
};

export type EvalRunErrorResult = {
  suiteId: EvalSuiteId | string;
  status: "error";
  summary: string;
  diagnostics: EvalDiagnostic[];
  durationMs: number;
  errorName?: string;
  errorCode?: string;
};
