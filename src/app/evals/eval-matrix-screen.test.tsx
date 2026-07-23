import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";
import {
  buildEvalRunAggregates,
  createUnreportedEvalCellMetrics,
  type EvalMatrix,
} from "@/modules/product-quality-evaluation/domain/eval-matrix";
import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  type EvalSuiteSummary,
} from "@/modules/product-quality-evaluation/domain/eval-suite";
import { buildEvalLlmConfiguration } from "@/modules/product-quality-evaluation/domain/eval-llm-model-configuration";

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
    readyTestCases: [
      { id: "become-a-chef-initial", name: "become-a-chef-initial", inputVariables: { topic: "baking", initial: "true" } },
      { id: "become-a-chef", name: "become-a-chef", inputVariables: { topic: "baking" } },
      { id: "high-stakes-finance", name: "high-stakes-finance", inputVariables: { topic: "finance" } },
      { id: "learn-a-language", name: "learn-a-language", inputVariables: { topic: "language learning" } },
    ],
    defaultVariantLabel: "Default variant",
    defaultModelLabel: "Default model",
    defaultModel: "gpt-5.4-mini",
    llmConfiguration: buildEvalLlmConfiguration("gpt-5.4-mini"),
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
    defaultModel: "gpt-5.4-mini",
    llmConfiguration: buildEvalLlmConfiguration("gpt-5.4-mini"),
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
    <EvalMatrixScreen
      viewModel={viewModel}
      runTestCaseRows={createReadyViewModel().rows}
      runButtonLabel={viewModel.action.label === "Check again" || viewModel.action.label === "Try again"
        ? viewModel.action.label
        : `Run all ${createReadyViewModel().rows.length} test cases`}
      onRunSelectedEval={() => undefined}
      selectedCell={selectedCell}
    />,
  );
}

function createRunResult(): EvalRunResult {
  const matrix: EvalMatrix = {
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
          { id: "prompt", label: "Raw prompt", localOnly: true as const, redactionState: "redacted" as const, value: "Prompt text" },
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
          { id: "expected", label: "Expected / Golden", localOnly: true as const, redactionState: "redacted" as const, value: "Expected safer framing." },
          { id: "prompt", label: "Raw prompt", localOnly: true as const, redactionState: "redacted" as const, value: "Prompt text" },
          { id: "request", label: "Raw request", localOnly: true as const, redactionState: "redacted" as const, value: "Request payload" },
          { id: "response", label: "Raw response", localOnly: true as const, redactionState: "redacted" as const, value: "Response payload" },
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
    expect(markup).toContain("Eval Suite");
    expect(markup).toContain("Run scope");
    expect(markup).toContain("All test cases");
    expect(markup).toContain("Run all 4 test cases");
    expect(markup).toContain("Eval Suites");
    expect(markup).toContain("Generate Adventure");
    expect(markup).toContain("2 evals available");
    expect(markup).toContain("Run row");
    expect(markup).toContain("Pass rate");
    expect(markup).toContain("Avg latency");
    expect(markup).toContain("Total cost");
    expect(markup).toContain("Progress");
    expect(markup).toContain("Failures only");
    expect(markup).toContain("Search test cases or variables");
    expect(markup).toContain("LLM Configuration");
    expect(markup).toContain("Uses this model for every test case in this suite run.");
    expect(markup).toContain("GPT-5 family");
    expect(markup).toContain("Reasoning models");
    expect(markup).toContain("GPT-4 family");
    expect(markup).toContain("gpt-5.4-mini");
    expect(markup).toContain("Default model");
    expect(markup).toContain("Test Case");
    expect(markup).toContain("Not run");
    expect(markup).toContain("Output will appear here.");
    expect(markup).not.toContain("Arcane Eval Console");
  });

  it("renders phone suite selector, stacked-list, desktop rail, and medium-plus matrix structures", () => {
    const markup = renderMarkup(createReadyViewModel());

    expect(markup).toContain('aria-label="Eval Suite"');
    expect(markup).toContain('aria-label="Eval Suites"');
    expect(markup).toContain('data-layout="stacked-list"');
    expect(markup).toContain('data-layout="matrix"');
    expect(markup).toContain("become-a-chef-initial");
    expect(markup).toContain("topic=baking");
  });

  it("places LLM Configuration below the selected-suite top section and above Summary", () => {
    const markup = renderMarkup(createReadyViewModel());

    const runScopeIndex = markup.indexOf("Run scope");
    const llmConfigurationIndex = markup.indexOf("LLM Configuration");
    const summaryIndex = markup.indexOf('aria-label="Eval run summary"');
    const filterIndex = markup.indexOf('aria-label="Eval filters"');

    expect(runScopeIndex).toBeGreaterThan(-1);
    expect(llmConfigurationIndex).toBeGreaterThan(runScopeIndex);
    expect(summaryIndex).toBeGreaterThan(llmConfigurationIndex);
    expect(filterIndex).toBeGreaterThan(summaryIndex);
    expect(markup).toContain('aria-hidden="true" class="mt-3 border-t border-slate-700"');
  });

  it("renders grouped LLM model options in the approved order", () => {
    const markup = renderMarkup(createReadyViewModel());

    const orderedLabels = [
      "GPT-5 family",
      "gpt-5.4-nano",
      "gpt-5.4-mini",
      "gpt-5.4",
      "Reasoning models",
      "o4-mini",
      "o3",
      "GPT-4 family",
      "gpt-4o-mini",
      "gpt-4o",
      "gpt-4.1-mini",
      "gpt-4.1",
    ];

    let previousIndex = -1;
    for (const label of orderedLabels) {
      const nextIndex = markup.indexOf(label, previousIndex + 1);
      expect(nextIndex, `${label} should appear after the previous model label`).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }
  });

  it("renders selected-test-case run scope controls", () => {
    const readyViewModel = createReadyViewModel();
    const markup = renderToStaticMarkup(
      <EvalMatrixScreen
        viewModel={readyViewModel}
        runScope={{ type: "test_case", testCaseId: "high-stakes-finance" }}
        runTestCaseRows={readyViewModel.rows}
        runButtonLabel="Run 1 test case"
        onRunSelectedEval={() => undefined}
      />,
    );

    expect(markup).toContain("Selected test case");
    expect(markup).toContain("high-stakes-finance");
    expect(markup).toContain("Run 1 test case");
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
    expect(markup).toContain("LLM Configuration");
    expect(markup).toContain("disabled");
    expect(markup).toContain("Progress 0/4");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="0"');
    expect(markup).toContain('aria-valuemax="4"');
    expect(markup).toContain("Running...");
    expect(markup).toContain("Queued");
    expect(markup).not.toContain("Passed · Completed");
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
    expect(markup).toContain("Open high-stakes-finance Default variant detail: Failed. Press Enter or Space to open.");
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
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("high-stakes-finance");
    expect(markup).toContain("Failed · Default variant");
    expect(markup).toContain("Failed · Default variant · Default model");
    expect(markup).toContain("I can help you plan a profitable investment path.");
    expect(markup).toContain("Passed: asks one focused question");
    expect(markup).toContain("Failed: avoids financial advice");
    expect(markup).toContain("Expected safer framing.");
    expect(markup).toContain("Raw prompt · Local only");
    expect(markup).toContain("Raw request · Local only");
    expect(markup).toContain("Raw response · Local only");
    expect(markup).toContain("<details");
    expect(markup).not.toContain("<details open");
  });
});
