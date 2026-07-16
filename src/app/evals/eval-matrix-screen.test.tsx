import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  type EvalSuiteSummary,
} from "@/modules/product-quality-evaluation/domain/eval-suite";

import { EvalMatrixScreen } from "./eval-matrix-screen";
import type { EvalMatrixViewModel } from "./eval-matrix-types";
import {
  createEvalMatrixViewModelFromRunResult,
  createReadyEvalMatrixViewModel,
  createRunningEvalMatrixViewModel,
} from "./eval-matrix-view-model";

const suites: EvalSuiteSummary[] = [
  {
    id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
    name: "Game Master Interview",
    shortDescription: "Checks focused, useful interview turns.",
    purpose: "Checks focused Game Master interview behavior.",
  },
];

function createReadyViewModel(): EvalMatrixViewModel {
  return createReadyEvalMatrixViewModel(suites, GAME_MASTER_INTERVIEW_EVAL_SUITE_ID);
}

function renderMarkup(viewModel: EvalMatrixViewModel): string {
  return renderToStaticMarkup(
    <EvalMatrixScreen viewModel={viewModel} onRunSelectedEval={() => undefined} />,
  );
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
});
