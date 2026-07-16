import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";
import { buildEvalRunAggregates, createUnreportedEvalCellMetrics } from "@/modules/product-quality-evaluation/domain/eval-matrix";
import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  type EvalSuiteSummary,
} from "@/modules/product-quality-evaluation/domain/eval-suite";

import { EvalMatrixScreen } from "./eval-matrix-screen";
import type { EvalMatrixShellCell, EvalMatrixViewModel } from "./eval-matrix-types";
import {
  createEvalMatrixViewModelFromRunResult,
  createReadyEvalMatrixViewModel,
  createRunningEvalMatrixViewModel,
  filterEvalMatrixRows,
  findEvalMatrixCell,
} from "./eval-matrix-view-model";

const suites: EvalSuiteSummary[] = [
  {
    id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
    name: "Game Master Interview",
    shortDescription: "Checks focused, useful interview turns.",
    purpose: "Checks focused Game Master interview behavior.",
  },
];

const defaultVariant = {
  id: "default",
  name: "Default variant",
  promptLabel: "Default prompt",
  modelLabel: "Default model",
};

function createReadyViewModel(): EvalMatrixViewModel {
  return createReadyEvalMatrixViewModel(suites, GAME_MASTER_INTERVIEW_EVAL_SUITE_ID);
}

function createResultViewModel(): EvalMatrixViewModel {
  return createEvalMatrixViewModelFromRunResult(createReadyViewModel(), createRunResult());
}

function renderMarkup(viewModel: EvalMatrixViewModel, selectedCell: EvalMatrixShellCell | null = null): string {
  return renderToStaticMarkup(
    <EvalMatrixScreen viewModel={viewModel} onRunSelectedEval={() => undefined} selectedCell={selectedCell} />,
  );
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

describe("EvalMatrixScreen", () => {
  it("renders the ready Local Eval Matrix shell for Game Master Interview", () => {
    const markup = renderMarkup(createReadyViewModel());

    expect(markup).toContain("Local Eval Matrix");
    expect(markup).toContain("Game Master Interview");
    expect(markup).toContain("Run eval");
    expect(markup).toContain("Pass rate");
    expect(markup).toContain("Avg latency");
    expect(markup).toContain("Total cost");
    expect(markup).toContain("Progress");
    expect(markup).toContain("Failures only");
    expect(markup).toContain("Search test cases or variables");
    expect(markup).toContain("Default variant");
    expect(markup).toContain("Test Case");
    expect(markup).toContain("Not run");
    expect(markup).toContain("Output will appear here.");
    expect(markup).not.toContain("Arcane Eval Console");
  });

  it("renders phone stacked-list and medium-plus matrix structures", () => {
    const markup = renderMarkup(createReadyViewModel());

    expect(markup).toContain('data-layout="stacked-list"');
    expect(markup).toContain('data-layout="matrix"');
    expect(markup).toContain("become-a-chef-initial");
    expect(markup).toContain("topic=baking");
  });

  it("renders blocked configuration guidance instead of an empty matrix", () => {
    const blockedViewModel = createEvalMatrixViewModelFromRunResult(createReadyViewModel(), {
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      status: "blocked",
      summary: "Local configuration is missing or invalid.",
      diagnostics: [
        {
          scope: "configuration",
          code: "missing_openai_api_key",
          message: "OPENAI_API_KEY is not configured.",
        },
      ],
      blocker: "missing_openai_api_key",
      durationMs: 1,
    });

    const markup = renderMarkup(blockedViewModel);

    expect(markup).toContain("Local Eval Matrix");
    expect(markup).toContain("Game Master Interview");
    expect(markup).toContain("Blocked");
    expect(markup).toContain("OPENAI_API_KEY is not configured.");
    expect(markup).toContain("Add local config, then run the eval again.");
    expect(markup).toContain("Matrix unavailable until configuration is ready.");
    expect(markup).toContain("Check again");
    expect(markup).not.toContain('data-layout="matrix"');
  });

  it("renders running progress and disables duplicate runs", () => {
    const markup = renderMarkup(createRunningEvalMatrixViewModel(createReadyViewModel()));

    expect(markup).toContain("Local Eval Matrix");
    expect(markup).toContain("Game Master Interview");
    expect(markup).toContain("Running...");
    expect(markup).toContain("disabled");
    expect(markup).toContain("Progress 1/4");
    expect(markup).toContain("Passed");
    expect(markup).toContain("Queued");
    expect(markup).toContain("Output will appear here.");
  });

  it("renders passed and failed result cells with summaries, previews, diagnostics, and metrics", () => {
    const markup = renderMarkup(createResultViewModel());

    expect(markup).toContain("1 of 2 cells failed.");
    expect(markup).toContain("50%");
    expect(markup).toContain("1200 ms");
    expect(markup).toContain("Not reported");
    expect(markup).toContain("Passed · 1/1 assertions");
    expect(markup).toContain("Failed · 1 failed / 2 assertions");
    expect(markup).toContain("What kind of cooking adventure sounds fun?");
    expect(markup).toContain("I can help you plan a profitable investment path.");
    expect(markup).toContain("Gave advice-like wording.");
    expect(markup).toContain("Open high-stakes-finance Default variant detail: Failed");
  });

  it("renders filtered and searched result states", () => {
    const viewModel = createResultViewModel();
    const filteredRows = filterEvalMatrixRows({
      rows: viewModel.rows,
      failuresOnly: true,
      searchQuery: "topic=finance",
      visibleVariantIds: ["default"],
    });
    const markup = renderMarkup({ ...viewModel, rows: filteredRows });

    expect(markup).toContain("high-stakes-finance");
    expect(markup).toContain("topic=finance");
    expect(markup).toContain("Failed · 1 failed / 2 assertions");
    expect(markup).not.toContain("become-a-chef</p>");
    expect(markup).toContain("Default variant");
  });

  it("renders the cell detail drawer with collapsed local-only raw artifacts", () => {
    const viewModel = createResultViewModel();
    const selectedCell = findEvalMatrixCell(viewModel.rows, { testCaseId: "high-stakes-finance", variantId: "default" });
    const markup = renderMarkup(viewModel, selectedCell);

    expect(markup).toContain("Cell detail");
    expect(markup).toContain("high-stakes-finance");
    expect(markup).toContain("Failed · Default variant");
    expect(markup).toContain("I can help you plan a profitable investment path. What stock do you want?");
    expect(markup).toContain("avoids financial advice");
    expect(markup).toContain("Expected safer framing.");
    expect(markup).toContain("Raw prompt · Local only");
    expect(markup).toContain("Raw request · Local only");
    expect(markup).toContain("Raw response · Local only");
    expect(markup).toContain("<details");
    expect(markup).not.toContain("<details open");
  });
});
