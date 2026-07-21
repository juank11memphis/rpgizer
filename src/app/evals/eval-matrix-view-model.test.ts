import { describe, expect, it } from "vitest";

import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";
import { buildEvalRunAggregates, createUnreportedEvalCellMetrics } from "@/modules/product-quality-evaluation/domain/eval-matrix";
import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  type EvalSuiteSummary,
} from "@/modules/product-quality-evaluation/domain/eval-suite";

import type { EvalMatrixShellCell, EvalMatrixTestCaseRow } from "./eval-matrix-types";
import {
  createEvalMatrixViewModelFromRunResult,
  createReadyEvalMatrixViewModel,
  createRunningEvalMatrixViewModel,
  filterEvalMatrixRows,
  findEvalMatrixCell,
  findNextEvalMatrixCellSelection,
} from "./eval-matrix-view-model";

const suites: EvalSuiteSummary[] = [
  {
    id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
    name: "Game Master Interview",
    shortDescription: "Checks focused, useful interview turns.",
    purpose: "Checks focused Game Master interview behavior.",
    readyTestCases: [
      { id: "become-a-chef-initial", name: "become-a-chef-initial", inputVariables: { topic: "baking", initial: "true" } },
      { id: "become-a-chef", name: "become-a-chef", inputVariables: { topic: "baking" } },
      { id: "high-stakes-finance", name: "high-stakes-finance", inputVariables: { topic: "finance" } },
      { id: "learn-a-language", name: "learn-a-language", inputVariables: { topic: "language learning" } },
    ],
    defaultVariantLabel: "Default variant",
    defaultModelLabel: "Default model",
  },
  {
    id: GENERATE_ADVENTURE_EVAL_SUITE_ID,
    name: "Generate Adventure",
    shortDescription: "Checks full playable roadmap generation.",
    purpose: "Checks full Adventure generation from interview context.",
    readyTestCases: [
      { id: "learn-a-skill", name: "learn-a-skill", inputVariables: { goal: "Spanish coffee chat" } },
      { id: "high-stakes-boundary", name: "high-stakes-boundary", inputVariables: { goal: "High-stakes boundary" } },
    ],
    defaultVariantLabel: "Default variant",
    defaultModelLabel: "Default model",
  },
];

const defaultVariant = {
  id: "default",
  name: "Default variant",
  promptLabel: "Default prompt",
  modelLabel: "Default model",
};

function createReadyViewModel() {
  return createReadyEvalMatrixViewModel(suites, GAME_MASTER_INTERVIEW_EVAL_SUITE_ID);
}

function createRunResult(): EvalRunResult {
  const matrix = {
    testCases: [
      { id: "become-a-chef", name: "become-a-chef", inputVariables: { topic: "baking" } },
      { id: "high-stakes-finance", name: "high-stakes-finance", inputVariables: { topic: "finance" } },
    ],
    variants: [defaultVariant],
    cells: [
      {
        id: "become-a-chef::default",
        testCaseId: "become-a-chef",
        variantId: "default",
        status: "passed" as const,
        outputPreview: "What kind of cooking adventure sounds fun?",
        outputMarkdown: "What kind of cooking adventure sounds fun?",
        metrics: {
          latency: { value: 1200, unit: "ms" as const, reported: true },
          tokens: { value: 91, unit: "tokens" as const, reported: true },
          cost: { value: 0.0012, unit: "usd" as const, reported: true },
        },
        assertions: [
          { id: "focused-question", label: "asks one focused question", status: "passed" as const },
        ],
        diagnostics: [],
        artifacts: [
          { id: "raw-prompt", label: "Raw prompt", localOnly: true as const, redactionState: "redacted" as const, value: "Prompt text" },
        ],
      },
      {
        id: "high-stakes-finance::default",
        testCaseId: "high-stakes-finance",
        variantId: "default",
        status: "failed" as const,
        outputPreview: "I can help you plan a profitable investment path.",
        outputMarkdown: "I can help you plan a profitable investment path. What stock do you want?",
        metrics: createUnreportedEvalCellMetrics(),
        assertions: [
          { id: "focused-question", label: "asks one focused question", status: "passed" as const },
          {
            id: "avoid-financial-advice",
            label: "avoids financial advice",
            status: "failed" as const,
            message: "Gave advice-like wording.",
          },
        ],
        diagnostics: [
          {
            scope: "fixture" as const,
            fixtureId: "high-stakes-finance",
            code: "advice_like_finance_copy",
            message: "Gave advice-like wording.",
          },
        ],
        artifacts: [
          { id: "expected-golden", label: "Expected / Golden", localOnly: true as const, redactionState: "redacted" as const, value: "Expected safer framing." },
          { id: "raw-prompt", label: "Raw prompt", localOnly: true as const, redactionState: "redacted" as const, value: "Prompt text" },
          { id: "raw-request", label: "Raw request", localOnly: true as const, redactionState: "redacted" as const, value: "Request payload" },
          { id: "raw-response", label: "Raw response", localOnly: true as const, redactionState: "redacted" as const, value: "Response payload" },
        ],
      },
    ],
  };

  return {
    suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
    status: "failed",
    summary: "1 of 2 cells failed.",
    diagnostics: matrix.cells[1].diagnostics,
    durationMs: 2400,
    matrix,
    aggregates: buildEvalRunAggregates(matrix),
  };
}

describe("eval matrix view model", () => {

  it("creates suite-ready rows from the selected suite metadata", () => {
    const gameMasterViewModel = createReadyEvalMatrixViewModel(suites, GAME_MASTER_INTERVIEW_EVAL_SUITE_ID);
    const generateAdventureViewModel = createReadyEvalMatrixViewModel(suites, GENERATE_ADVENTURE_EVAL_SUITE_ID);

    expect(gameMasterViewModel.rows.map((row) => row.testCase.id)).toEqual([
      "become-a-chef-initial",
      "become-a-chef",
      "high-stakes-finance",
      "learn-a-language",
    ]);
    expect(generateAdventureViewModel.selectedSuite.name).toBe("Generate Adventure");
    expect(generateAdventureViewModel.rows.map((row) => row.testCase.id)).toEqual([
      "learn-a-skill",
      "high-stakes-boundary",
    ]);
    expect(generateAdventureViewModel.rows.flatMap((row) => row.cells).map((cell) => cell.status)).toEqual([
      "not_run",
      "not_run",
    ]);
    expect(generateAdventureViewModel.summaryStats).toContainEqual(expect.objectContaining({ label: "Progress", value: "0/2" }));
  });
  it("maps passed and failed cells with detail evidence and not-reported metrics", () => {
    const viewModel = createEvalMatrixViewModelFromRunResult(createReadyViewModel(), createRunResult());

    expect(viewModel.status).toBe("failed");
    expect(viewModel.variants).toEqual([defaultVariant]);
    expect(viewModel.summaryStats).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Pass rate", value: "50%" }),
      expect.objectContaining({ label: "Avg latency", value: "1200 ms" }),
      expect.objectContaining({ label: "Total cost", value: "Not reported" }),
      expect.objectContaining({ label: "Progress", value: "2/2" }),
    ]));
    expect(viewModel.variants[0].modelLabel).toBe("Default model");

    const passedCell = viewModel.rows[0].cells[0];
    const failedCell = viewModel.rows[1].cells[0];

    expect(passedCell.statusLabel).toBe("Passed");
    expect(passedCell.assertionSummary).toBe("1/1 assertions");
    expect(passedCell.metricSummary).toBe("1200 ms · 91 tokens · $0.0012");
    expect(failedCell.statusLabel).toBe("Failed");
    expect(failedCell.assertionSummary).toBe("1 failed / 2 assertions");
    expect(failedCell.metricSummary).toBe("Latency not reported · tokens not reported · cost not reported");
    expect(failedCell.diagnosticsSummary).toContain("Gave advice-like wording.");
    expect(failedCell.detail?.outputMarkdown).toContain("profitable investment");
    expect(failedCell.detail?.expectedGolden).toBe("Expected safer framing.");
    expect(failedCell.detail?.artifacts).toHaveLength(4);
  });

  it("filters to failures only while preserving the default variant cell", () => {
    const viewModel = createEvalMatrixViewModelFromRunResult(createReadyViewModel(), createRunResult());

    const rows = filterEvalMatrixRows({
      rows: viewModel.rows,
      failuresOnly: true,
      searchQuery: "",
      visibleVariantIds: ["default"],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].testCase.name).toBe("high-stakes-finance");
    expect(rows[0].cells).toHaveLength(1);
    expect(rows[0].cells[0].variantName).toBe("Default variant");
  });

  it("searches by Test Case text and input-variable summaries", () => {
    const viewModel = createEvalMatrixViewModelFromRunResult(createReadyViewModel(), createRunResult());

    const testCaseRows = filterEvalMatrixRows({
      rows: viewModel.rows,
      failuresOnly: false,
      searchQuery: "chef",
      visibleVariantIds: ["default"],
    });
    const variableRows = filterEvalMatrixRows({
      rows: viewModel.rows,
      failuresOnly: false,
      searchQuery: "topic=finance",
      visibleVariantIds: ["default"],
    });

    expect(testCaseRows.map((row) => row.testCase.name)).toEqual(["become-a-chef"]);
    expect(variableRows.map((row) => row.testCase.name)).toEqual(["high-stakes-finance"]);
  });

  it("keeps the full test case list while a scoped test case run is in progress", () => {
    const viewModel = createReadyViewModel();
    const runningViewModel = createRunningEvalMatrixViewModel(viewModel, { testCaseId: "high-stakes-finance" });

    expect(runningViewModel.rows.map((row) => row.testCase.id)).toEqual([
      "become-a-chef-initial",
      "become-a-chef",
      "high-stakes-finance",
      "learn-a-language",
    ]);
    expect(runningViewModel.rows[0].cells[0].status).toBe("not_run");
    expect(runningViewModel.rows[2].cells[0]).toMatchObject({
      status: "running",
      statusLabel: "Running...",
      assertionSummary: "In progress",
    });
    expect(runningViewModel.progress).toEqual({ completed: 0, total: 1, label: "Progress 0/1" });
    expect(runningViewModel.statusMessage).toContain("high-stakes-finance");
  });

  it("merges scoped test case results without dropping the rest of the suite", () => {
    const scopedRunResult = createRunResult();
    scopedRunResult.matrix = {
      ...scopedRunResult.matrix!,
      testCases: [scopedRunResult.matrix!.testCases[1]],
      cells: [scopedRunResult.matrix!.cells[1]],
    };
    scopedRunResult.aggregates = buildEvalRunAggregates(scopedRunResult.matrix);

    const runningViewModel = createRunningEvalMatrixViewModel(
      createReadyViewModel(),
      { testCaseId: "high-stakes-finance" },
    );
    const resultViewModel = createEvalMatrixViewModelFromRunResult(
      runningViewModel,
      scopedRunResult,
      { scopedTestCaseId: "high-stakes-finance" },
    );

    expect(resultViewModel.rows.map((row) => row.testCase.id)).toEqual([
      "become-a-chef-initial",
      "become-a-chef",
      "high-stakes-finance",
      "learn-a-language",
    ]);
    expect(resultViewModel.rows[0].cells[0].status).toBe("not_run");
    expect(resultViewModel.rows[2].cells[0]).toMatchObject({
      status: "failed",
      assertionSummary: "1 failed / 2 assertions",
    });
    expect(resultViewModel.progress).toEqual({ completed: 1, total: 1, label: "Progress 1/1" });
  });



  it("calculates practical arrow navigation across visible matrix cells", () => {
    const rows = createNavigationRows();

    expect(findNextEvalMatrixCellSelection({
      rows,
      current: { testCaseId: "row-1", variantId: "variant-a" },
      direction: "right",
    })).toEqual({ testCaseId: "row-1", variantId: "variant-b" });
    expect(findNextEvalMatrixCellSelection({
      rows,
      current: { testCaseId: "row-1", variantId: "variant-b" },
      direction: "down",
    })).toEqual({ testCaseId: "row-2", variantId: "variant-b" });
    expect(findNextEvalMatrixCellSelection({
      rows,
      current: { testCaseId: "row-1", variantId: "variant-a" },
      direction: "up",
    })).toBeNull();
  });

  it("calculates stacked-list arrow navigation from rendered cell order", () => {
    const rows = createNavigationRows();

    expect(findNextEvalMatrixCellSelection({
      rows,
      current: { testCaseId: "row-1", variantId: "variant-b" },
      direction: "down",
      mode: "stacked-list",
    })).toEqual({ testCaseId: "row-2", variantId: "variant-a" });
    expect(findNextEvalMatrixCellSelection({
      rows,
      current: { testCaseId: "row-2", variantId: "variant-a" },
      direction: "left",
      mode: "stacked-list",
    })).toBeNull();
  });

  it("finds a selected cell for the detail drawer", () => {
    const viewModel = createEvalMatrixViewModelFromRunResult(createReadyViewModel(), createRunResult());

    const cell = findEvalMatrixCell(viewModel.rows, { testCaseId: "high-stakes-finance", variantId: "default" });

    expect(cell?.testCaseName).toBe("high-stakes-finance");
    expect(cell?.detail?.assertions[1].message).toBe("Gave advice-like wording.");
  });
});


function createNavigationRows(): EvalMatrixTestCaseRow[] {
  return [
    createNavigationRow("row-1", ["variant-a", "variant-b"]),
    createNavigationRow("row-2", ["variant-a", "variant-b"]),
  ];
}

function createNavigationRow(testCaseId: string, variantIds: string[]): EvalMatrixTestCaseRow {
  return {
    testCase: { id: testCaseId, name: testCaseId, inputVariables: {} },
    inputSummary: "No input variables",
    cells: variantIds.map((variantId) => createNavigationCell(testCaseId, variantId)),
  };
}

function createNavigationCell(testCaseId: string, variantId: string): EvalMatrixShellCell {
  return {
    id: `${testCaseId}::${variantId}`,
    testCaseId,
    testCaseName: testCaseId,
    testCaseInputSummary: "No input variables",
    variantId,
    variantName: variantId,
    variantModelLabel: "test-model",
    status: "passed",
    statusLabel: "Passed",
    assertionSummary: "1/1 assertions",
    metricSummary: "Latency not reported · tokens not reported · cost not reported",
    diagnosticsSummary: "No diagnostics",
    outputPreview: "Output",
  };
}
