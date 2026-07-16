import type {
  EvalCell,
  EvalCellMetrics,
  EvalMatrix,
  EvalPromptModelVariant,
  EvalRunAggregates,
  EvalRunResult,
  EvalTestCase,
} from "@/modules/product-quality-evaluation/application/run-eval-suite/output";
import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  type EvalSuiteSummary,
} from "@/modules/product-quality-evaluation/domain/eval-suite";

import type {
  EvalCellSelection,
  EvalMatrixShellCell,
  EvalMatrixSuite,
  EvalMatrixSummaryStat,
  EvalMatrixTestCaseRow,
  EvalMatrixViewModel,
} from "./eval-matrix-types";

const DEFAULT_VARIANT: EvalPromptModelVariant = {
  id: "default",
  name: "Default variant",
  promptLabel: "Default prompt",
  modelLabel: "Default model",
};

const READY_TEST_CASES: EvalTestCase[] = [
  { id: "become-a-chef-initial", name: "become-a-chef-initial", inputVariables: { topic: "baking", initial: "true" } },
  { id: "become-a-chef", name: "become-a-chef", inputVariables: { topic: "baking" } },
  { id: "high-stakes-finance", name: "high-stakes-finance", inputVariables: { topic: "finance" } },
  { id: "learn-a-language", name: "learn-a-language", inputVariables: { topic: "language learning" } },
];

export function createReadyEvalMatrixViewModel(
  suites: EvalSuiteSummary[],
  selectedSuiteId: string,
): EvalMatrixViewModel {
  const selectedSuite = selectSuite(suites, selectedSuiteId);
  const matrixSuites = suites.map((suite) => ({ ...suite, selected: suite.id === selectedSuite.id }));

  return createBaseViewModel({
    suites: matrixSuites,
    selectedSuite: { ...selectedSuite, selected: true },
    status: "ready",
    statusLabel: "Ready",
    statusMessage: `${READY_TEST_CASES.length} test cases ready to run.`,
    actionLabel: "Run eval",
    actionDisabled: false,
    summaryStats: createPlaceholderSummaryStats(READY_TEST_CASES.length),
    rows: createRowsFromTestCases(READY_TEST_CASES, "not_run"),
    progress: { completed: 0, total: READY_TEST_CASES.length, label: `Ready · ${READY_TEST_CASES.length} test cases` },
    diagnostics: [],
  });
}

export function createRunningEvalMatrixViewModel(
  currentViewModel: EvalMatrixViewModel,
): EvalMatrixViewModel {
  const rows: EvalMatrixTestCaseRow[] = currentViewModel.rows.map((row, index) => {
    const status: EvalMatrixShellCell["status"] = index === 0 ? "passed" : index === 1 ? "running" : "queued";

    return {
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        status,
        statusLabel: index === 0 ? "Passed" : index === 1 ? "Running..." : "Queued",
        assertionSummary: index === 0 ? "Completed" : index === 1 ? "In progress" : "Waiting",
        metricSummary: index === 0 ? "Latency not reported · tokens not reported · cost not reported" : "Metrics pending",
        diagnosticsSummary: index === 0 ? "No diagnostics" : "Diagnostics pending",
        outputPreview: index === 0 ? "Completed output preview will appear here." : "Output will appear here.",
        detail: undefined,
      })),
    };
  });
  const completed = rows.flatMap((row) => row.cells).filter((cell) => cell.status === "passed").length;
  const total = rows.reduce((count, row) => count + row.cells.length, 0);

  return {
    ...currentViewModel,
    status: "running",
    statusLabel: "Running",
    statusMessage: "Game Master Interview eval is running locally.",
    action: { label: "Running...", disabled: true },
    summaryStats: createRunningSummaryStats(completed, total),
    rows,
    diagnostics: [],
    blockerMessage: undefined,
    matrixUnavailableMessage: undefined,
    progress: { completed, total, label: `Progress ${completed}/${total}` },
  };
}

export function createEvalMatrixViewModelFromRunResult(
  currentViewModel: EvalMatrixViewModel,
  result: EvalRunResult,
): EvalMatrixViewModel {
  if (result.status === "blocked") {
    const blockerMessage = result.diagnostics[0]?.message ?? "Local eval configuration is missing or invalid.";

    return {
      ...currentViewModel,
      status: "blocked",
      statusLabel: "Blocked",
      statusMessage: "Local configuration is missing or invalid.",
      action: { label: "Check again", disabled: false },
      summaryStats: createPlaceholderSummaryStats(currentViewModel.progress.total),
      diagnostics: result.diagnostics,
      blockerMessage,
      matrixUnavailableMessage: "Matrix unavailable until configuration is ready.",
      progress: { completed: 0, total: currentViewModel.progress.total, label: "Blocked" },
    };
  }

  if (result.status === "error") {
    return {
      ...currentViewModel,
      status: "error",
      statusLabel: "Could not run",
      statusMessage: "The eval did not finish.",
      action: { label: "Try again", disabled: false },
      diagnostics: result.diagnostics,
      blockerMessage: undefined,
      matrixUnavailableMessage: undefined,
    };
  }

  const matrix = result.matrix;
  const aggregates = result.aggregates;
  const rows = matrix ? createRowsFromMatrix(matrix) : currentViewModel.rows;
  const total = aggregates?.totalCells ?? rows.reduce((count, row) => count + row.cells.length, 0);
  const completed = aggregates?.completedCells ?? total;

  return {
    ...currentViewModel,
    status: result.status,
    statusLabel: result.status === "passed" ? "Passed" : "Failed",
    statusMessage: result.summary,
    action: { label: "Run again", disabled: false },
    summaryStats: createResultSummaryStats(aggregates, result.durationMs),
    variants: matrix?.variants ?? currentViewModel.variants,
    rows,
    diagnostics: result.diagnostics,
    blockerMessage: undefined,
    matrixUnavailableMessage: undefined,
    progress: { completed, total, label: `Progress ${completed}/${total}` },
  };
}

export function filterEvalMatrixRows(input: {
  rows: EvalMatrixTestCaseRow[];
  failuresOnly: boolean;
  searchQuery: string;
  visibleVariantIds: string[];
}): EvalMatrixTestCaseRow[] {
  const normalizedSearch = input.searchQuery.trim().toLowerCase();
  const visibleVariantIds = new Set(input.visibleVariantIds);

  return input.rows
    .map((row) => ({
      ...row,
      cells: row.cells.filter((cell) => {
        const isVisibleVariant = visibleVariantIds.size === 0 || visibleVariantIds.has(cell.variantId);
        const matchesFailure = !input.failuresOnly || cell.status === "failed" || cell.status === "error" || cell.status === "blocked";
        return isVisibleVariant && matchesFailure;
      }),
    }))
    .filter((row) => {
      if (row.cells.length === 0) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [row.testCase.name, row.testCase.id, row.inputSummary]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
}

export function findEvalMatrixCell(
  rows: EvalMatrixTestCaseRow[],
  selection: EvalCellSelection | null,
): EvalMatrixShellCell | null {
  if (!selection) {
    return null;
  }

  for (const row of rows) {
    const cell = row.cells.find(
      (candidate) => candidate.testCaseId === selection.testCaseId && candidate.variantId === selection.variantId,
    );

    if (cell) {
      return cell;
    }
  }

  return null;
}

export type EvalMatrixCellNavigationDirection = "up" | "down" | "left" | "right";
export type EvalMatrixCellNavigationMode = "matrix" | "stacked-list";

export function findNextEvalMatrixCellSelection(input: {
  rows: EvalMatrixTestCaseRow[];
  current: EvalCellSelection;
  direction: EvalMatrixCellNavigationDirection;
  mode?: EvalMatrixCellNavigationMode;
}): EvalCellSelection | null {
  const mode = input.mode ?? "matrix";

  if (mode === "stacked-list") {
    return findNextStackedListCellSelection(input.rows, input.current, input.direction);
  }

  return findNextMatrixCellSelection(input.rows, input.current, input.direction);
}

function findNextStackedListCellSelection(
  rows: EvalMatrixTestCaseRow[],
  current: EvalCellSelection,
  direction: EvalMatrixCellNavigationDirection,
): EvalCellSelection | null {
  if (direction !== "up" && direction !== "down") {
    return null;
  }

  const cells = rows.flatMap((row) => row.cells);
  const currentIndex = cells.findIndex((cell) => isCellSelection(cell, current));

  if (currentIndex === -1) {
    return null;
  }

  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  const nextCell = cells[nextIndex];
  return nextCell ? toCellSelection(nextCell) : null;
}

function findNextMatrixCellSelection(
  rows: EvalMatrixTestCaseRow[],
  current: EvalCellSelection,
  direction: EvalMatrixCellNavigationDirection,
): EvalCellSelection | null {
  const rowIndex = rows.findIndex((row) => row.cells.some((cell) => isCellSelection(cell, current)));

  if (rowIndex === -1) {
    return null;
  }

  const currentRow = rows[rowIndex];
  const cellIndex = currentRow.cells.findIndex((cell) => isCellSelection(cell, current));

  if (cellIndex === -1) {
    return null;
  }

  if (direction === "left" || direction === "right") {
    const nextIndex = direction === "left" ? cellIndex - 1 : cellIndex + 1;
    const nextCell = currentRow.cells[nextIndex];
    return nextCell ? toCellSelection(nextCell) : null;
  }

  const nextRowIndex = direction === "up" ? rowIndex - 1 : rowIndex + 1;
  const nextRow = rows[nextRowIndex];

  if (!nextRow) {
    return null;
  }

  const sameVariantCell = nextRow.cells.find((cell) => cell.variantId === current.variantId);
  const fallbackCell = nextRow.cells[Math.min(cellIndex, nextRow.cells.length - 1)];
  const nextCell = sameVariantCell ?? fallbackCell;

  return nextCell ? toCellSelection(nextCell) : null;
}

function isCellSelection(cell: EvalMatrixShellCell, selection: EvalCellSelection): boolean {
  return cell.testCaseId === selection.testCaseId && cell.variantId === selection.variantId;
}

function toCellSelection(cell: EvalMatrixShellCell): EvalCellSelection {
  return { testCaseId: cell.testCaseId, variantId: cell.variantId };
}

function createBaseViewModel(input: {
  suites: EvalMatrixSuite[];
  selectedSuite: EvalMatrixSuite;
  status: EvalMatrixViewModel["status"];
  statusLabel: string;
  statusMessage: string;
  actionLabel: EvalMatrixViewModel["action"]["label"];
  actionDisabled: boolean;
  summaryStats: EvalMatrixSummaryStat[];
  rows: EvalMatrixTestCaseRow[];
  progress: EvalMatrixViewModel["progress"];
  diagnostics: EvalMatrixViewModel["diagnostics"];
}): EvalMatrixViewModel {
  return {
    title: "Local Eval Matrix",
    eyebrow: "Local Product Quality Evaluation",
    suites: input.suites,
    selectedSuite: input.selectedSuite,
    availableCountLabel: `${input.suites.length} ${input.suites.length === 1 ? "eval" : "evals"} available`,
    status: input.status,
    statusLabel: input.statusLabel,
    statusMessage: input.statusMessage,
    action: { label: input.actionLabel, disabled: input.actionDisabled },
    summaryStats: input.summaryStats,
    filters: {
      failuresOnlyLabel: "Failures only",
      searchLabel: "Search test cases or variables",
      searchPlaceholder: "Search test cases or variables...",
      variantLabel: "Variant",
    },
    variants: [DEFAULT_VARIANT],
    rows: input.rows,
    diagnostics: input.diagnostics,
    progress: input.progress,
  };
}

function createRowsFromTestCases(
  testCases: EvalTestCase[],
  status: EvalMatrixShellCell["status"],
): EvalMatrixTestCaseRow[] {
  return testCases.map((testCase) => ({
    testCase,
    inputSummary: formatInputVariables(testCase.inputVariables),
    cells: [createPlaceholderCell(testCase, DEFAULT_VARIANT, status)],
  }));
}

function createRowsFromMatrix(matrix: EvalMatrix): EvalMatrixTestCaseRow[] {
  return matrix.testCases.map((testCase) => ({
    testCase,
    inputSummary: formatInputVariables(testCase.inputVariables),
    cells: matrix.variants.map((variant) => {
      const cell = matrix.cells.find(
        (candidate) => candidate.testCaseId === testCase.id && candidate.variantId === variant.id,
      );

      return cell ? createShellCell(testCase, variant, cell) : createPlaceholderCell(testCase, variant, "not_run");
    }),
  }));
}

function createPlaceholderCell(
  testCase: EvalTestCase,
  variant: EvalPromptModelVariant,
  status: EvalMatrixShellCell["status"],
): EvalMatrixShellCell {
  const statusLabel = formatCellStatus(status);
  const inputSummary = formatInputVariables(testCase.inputVariables);

  return {
    id: `${testCase.id}::${variant.id}`,
    testCaseId: testCase.id,
    testCaseName: testCase.name,
    testCaseInputSummary: inputSummary,
    variantId: variant.id,
    variantName: variant.name,
    status,
    statusLabel,
    assertionSummary: status === "not_run" ? "Not run" : statusLabel,
    metricSummary: "Latency not reported · tokens not reported · cost not reported",
    diagnosticsSummary: "No diagnostics",
    outputPreview: "Output will appear here.",
  };
}

function createShellCell(
  testCase: EvalTestCase,
  variant: EvalPromptModelVariant,
  cell: EvalCell,
): EvalMatrixShellCell {
  const outputMarkdown = cell.outputMarkdown ?? cell.outputPreview ?? "Output not reported.";
  const expectedGolden = cell.artifacts.find((artifact) => /expected|golden/i.test(artifact.label))?.value;

  return {
    id: cell.id,
    testCaseId: cell.testCaseId,
    testCaseName: testCase.name,
    testCaseInputSummary: formatInputVariables(testCase.inputVariables),
    variantId: cell.variantId,
    variantName: variant.name,
    status: cell.status,
    statusLabel: formatCellStatus(cell.status),
    assertionSummary: formatAssertionSummary(cell.assertions),
    metricSummary: formatMetrics(cell.metrics),
    diagnosticsSummary: formatDiagnosticsSummary(cell.diagnostics),
    outputPreview: cell.outputPreview ?? "Output will appear here.",
    detail: {
      outputMarkdown,
      assertions: cell.assertions,
      diagnostics: cell.diagnostics,
      metrics: cell.metrics,
      expectedGolden,
      artifacts: cell.artifacts,
    },
  };
}

function createPlaceholderSummaryStats(total: number): EvalMatrixSummaryStat[] {
  return [
    { label: "Pass rate", value: "--", tone: "neutral" },
    { label: "Avg latency", value: "Not reported", tone: "neutral" },
    { label: "Total cost", value: "Not reported", tone: "neutral" },
    { label: "Progress", value: `0/${total}`, tone: "neutral" },
  ];
}

function createRunningSummaryStats(completed: number, total: number): EvalMatrixSummaryStat[] {
  return [
    { label: "Pass rate", value: "--", tone: "running" },
    { label: "Avg latency", value: "Not reported", tone: "neutral" },
    { label: "Total cost", value: "Not reported", tone: "neutral" },
    { label: "Progress", value: `${completed}/${total}`, tone: "running" },
  ];
}

function createResultSummaryStats(
  aggregates: EvalRunAggregates | undefined,
  durationMs: number,
): EvalMatrixSummaryStat[] {
  const passRate = aggregates?.passRate === null || aggregates?.passRate === undefined
    ? "--"
    : `${Math.round(aggregates.passRate * 100)}%`;
  const averageLatency = aggregates?.averageLatencyMs === null || aggregates?.averageLatencyMs === undefined
    ? (aggregates ? "Not reported" : formatMilliseconds(durationMs))
    : formatMilliseconds(aggregates.averageLatencyMs);
  const totalCost = aggregates?.totalCostUsd === null || aggregates?.totalCostUsd === undefined
    ? "Not reported"
    : `$${aggregates.totalCostUsd.toFixed(4)}`;
  const completed = aggregates?.completedCells ?? 0;
  const total = aggregates?.totalCells ?? 0;

  return [
    { label: "Pass rate", value: passRate, tone: aggregates?.failedCells ? "danger" : "success" },
    { label: "Avg latency", value: averageLatency, tone: "neutral" },
    { label: "Total cost", value: totalCost, tone: "neutral" },
    { label: "Progress", value: `${completed}/${total}`, tone: "neutral" },
  ];
}

function formatAssertionSummary(assertions: EvalCell["assertions"]): string {
  if (assertions.length === 0) {
    return "Assertions not reported";
  }

  const failedCount = assertions.filter((assertion) => assertion.status === "failed").length;
  return failedCount === 0
    ? `${assertions.length}/${assertions.length} assertions`
    : `${failedCount} failed / ${assertions.length} assertions`;
}

function formatDiagnosticsSummary(diagnostics: EvalCell["diagnostics"]): string {
  if (diagnostics.length === 0) {
    return "No diagnostics";
  }

  return diagnostics.map((diagnostic) => diagnostic.message).join(" ");
}

function formatMetrics(metrics: EvalCellMetrics): string {
  return [
    formatMetric(metrics.latency),
    formatMetric(metrics.tokens),
    formatMetric(metrics.cost),
  ].join(" · ");
}

function formatMetric(metric: EvalCellMetrics[keyof EvalCellMetrics]): string {
  if (!metric.reported || metric.value === null) {
    if (metric.unit === "ms") {
      return "Latency not reported";
    }

    if (metric.unit === "usd") {
      return "cost not reported";
    }

    return "tokens not reported";
  }

  if (metric.unit === "usd") {
    return `$${metric.value.toFixed(4)}`;
  }

  return `${Math.round(metric.value)} ${metric.unit}`;
}

function formatMilliseconds(value: number): string {
  return `${Math.round(value)} ms`;
}

function formatInputVariables(inputVariables: Record<string, string>): string {
  const entries = Object.entries(inputVariables);
  return entries.length === 0
    ? "No input variables"
    : entries.map(([key, value]) => `${key}=${value}`).join(" · ");
}

function formatCellStatus(status: EvalMatrixShellCell["status"]): string {
  const labels: Record<EvalMatrixShellCell["status"], string> = {
    passed: "Passed",
    failed: "Failed",
    blocked: "Blocked",
    error: "Error",
    running: "Running...",
    queued: "Queued",
    not_run: "Not run",
  };

  return labels[status];
}

function selectSuite(suites: EvalSuiteSummary[], selectedSuiteId: string): EvalSuiteSummary {
  const selectedSuite = suites.find((suite) => suite.id === selectedSuiteId);

  if (!selectedSuite || selectedSuite.id !== GAME_MASTER_INTERVIEW_EVAL_SUITE_ID) {
    throw new Error("Game Master Interview eval suite is not available.");
  }

  return selectedSuite;
}
