import type { EvalSuiteId } from "../../domain/eval-suite";
import type {
  EvalDiagnostic,
  EvalMatrix,
  EvalRunAggregates,
} from "../../domain/eval-matrix";

export type {
  EvalAssertion,
  EvalCell,
  EvalCellArtifact,
  EvalCellMetrics,
  EvalCellStatus,
  EvalDiagnostic,
  EvalMatrix,
  EvalMetricValue,
  EvalPromptModelVariant,
  EvalRunAggregates,
  EvalTestCase,
} from "../../domain/eval-matrix";

export type EvalRunStatus = "passed" | "failed" | "blocked" | "error";

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
  matrix?: EvalMatrix;
  aggregates?: EvalRunAggregates;
};

export type EvalRunFailedResult = {
  suiteId: EvalSuiteId;
  status: "failed";
  summary: string;
  diagnostics: EvalDiagnostic[];
  durationMs: number;
  matrix?: EvalMatrix;
  aggregates?: EvalRunAggregates;
};

export type EvalRunBlockedResult = {
  suiteId: EvalSuiteId | string;
  status: "blocked";
  summary: string;
  diagnostics: EvalDiagnostic[];
  blocker: string;
  durationMs: number;
  matrix?: EvalMatrix;
  aggregates?: EvalRunAggregates;
};

export type EvalRunErrorResult = {
  suiteId: EvalSuiteId | string;
  status: "error";
  summary: string;
  diagnostics: EvalDiagnostic[];
  durationMs: number;
  errorName?: string;
  errorCode?: string;
  matrix?: EvalMatrix;
  aggregates?: EvalRunAggregates;
};
