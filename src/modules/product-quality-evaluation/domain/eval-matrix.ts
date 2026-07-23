export type EvalCellStatus =
  | "passed"
  | "failed"
  | "blocked"
  | "error"
  | "running"
  | "queued"
  | "not_run";

export type EvalDiagnostic = {
  scope: "fixture" | "configuration" | "run";
  message: string;
  fixtureId?: string;
  code?: string;
};

export type EvalTestCase = {
  id: string;
  name: string;
  inputVariables: Record<string, string>;
};

export type EvalPromptModelVariant = {
  id: string;
  name: string;
  promptLabel: string;
  modelLabel: string;
};

export type EvalMetricValue = {
  value: number | null;
  unit: "ms" | "tokens" | "usd";
  reported: boolean;
};

export type EvalCellMetrics = {
  latency: EvalMetricValue;
  tokens: EvalMetricValue;
  cost: EvalMetricValue;
};

export type EvalAssertion = {
  id: string;
  label: string;
  status: "passed" | "failed";
  message?: string;
};

export type RawEvalArtifactId = "prompt" | "request" | "response" | "expected";

export const RAW_EVAL_ARTIFACT_LABELS: Record<RawEvalArtifactId, string> = {
  prompt: "Raw prompt",
  request: "Raw request",
  response: "Raw response",
  expected: "Expected / Golden",
};

export type EvalCellArtifact = {
  id: RawEvalArtifactId;
  label: string;
  localOnly: true;
  redactionState: "not_available" | "redacted";
  value?: string;
  preview?: string;
};

export type EvalCell = {
  id: string;
  testCaseId: string;
  variantId: string;
  status: EvalCellStatus;
  outputPreview: string | null;
  outputMarkdown?: string | null;
  metrics: EvalCellMetrics;
  assertions: EvalAssertion[];
  diagnostics: EvalDiagnostic[];
  artifacts: EvalCellArtifact[];
};

export type EvalMatrix = {
  testCases: EvalTestCase[];
  variants: EvalPromptModelVariant[];
  cells: EvalCell[];
};

export type EvalRunAggregates = {
  totalTestCases: number;
  totalCells: number;
  completedCells: number;
  passedCells: number;
  failedCells: number;
  blockedCells: number;
  errorCells: number;
  passRate: number | null;
  averageLatencyMs: number | null;
  totalTokens: number | null;
  totalCostUsd: number | null;
};

export function buildEvalRunAggregates(matrix: EvalMatrix): EvalRunAggregates {
  const completedCells = matrix.cells.filter((cell) => isCompletedCellStatus(cell.status)).length;
  const passedCells = matrix.cells.filter((cell) => cell.status === "passed").length;
  const failedCells = matrix.cells.filter((cell) => cell.status === "failed").length;
  const blockedCells = matrix.cells.filter((cell) => cell.status === "blocked").length;
  const errorCells = matrix.cells.filter((cell) => cell.status === "error").length;

  const reportedLatencies = matrix.cells
    .map((cell) => cell.metrics.latency)
    .filter((metric) => metric.reported && metric.value !== null);

  return {
    totalTestCases: matrix.testCases.length,
    totalCells: matrix.cells.length,
    completedCells,
    passedCells,
    failedCells,
    blockedCells,
    errorCells,
    passRate: completedCells === 0 ? null : passedCells / completedCells,
    averageLatencyMs:
      reportedLatencies.length === 0
        ? null
        : reportedLatencies.reduce((total, metric) => total + (metric.value ?? 0), 0) /
          reportedLatencies.length,
    totalTokens: null,
    totalCostUsd: null,
  };
}

export function createUnreportedEvalCellMetrics(): EvalCellMetrics {
  return {
    latency: createUnreportedMetricValue("ms"),
    tokens: createUnreportedMetricValue("tokens"),
    cost: createUnreportedMetricValue("usd"),
  };
}

export function createUnreportedMetricValue(unit: EvalMetricValue["unit"]): EvalMetricValue {
  return {
    value: null,
    unit,
    reported: false,
  };
}

export function isCompletedCellStatus(status: EvalCellStatus): boolean {
  return status === "passed" || status === "failed" || status === "blocked" || status === "error";
}
