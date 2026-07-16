import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GAME_MASTER_INTERVIEW_EVAL_SUITE_ID } from "@/modules/product-quality-evaluation/domain/eval-suite";

import { EvalConsoleScreen } from "./eval-console-screen";
import type { EvalConsoleViewModel } from "./eval-console-types";
import { createEvalConsoleViewModelFromRunResult, createRunningEvalConsoleViewModel } from "./eval-console-view-model";

function renderMarkup(viewModel: EvalConsoleViewModel): string {
  return renderToStaticMarkup(
    <EvalConsoleScreen viewModel={viewModel} onRunSelectedEval={() => undefined} />,
  );
}

const readyViewModel: EvalConsoleViewModel = {
  suites: [
    {
      id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      name: "Game Master Interview",
      shortDescription: "Checks focused, useful interview turns.",
      purpose: "Checks focused Game Master interview behavior.",
      selected: true,
    },
  ],
  selectedSuite: {
    id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
    name: "Game Master Interview",
    shortDescription: "Checks focused, useful interview turns.",
    purpose: "Checks focused Game Master interview behavior.",
    selected: true,
  },
  availableCountLabel: "1 eval available",
  status: "ready",
  statusLabel: "Ready",
  statusMessage: "The console is prepared to run this eval.",
  actionLabel: "Run Selected Eval",
  actionDisabled: false,
  diagnosticsTitle: "Diagnostics",
  diagnosticsMessage: "No run yet.",
  diagnostics: [],
};

describe("EvalConsoleScreen", () => {
  it("renders the Ready shell for the selected Game Master Interview suite", () => {
    const markup = renderMarkup(readyViewModel);

    expect(markup).toContain("Arcane Eval Console");
    expect(markup).toContain("Local evals before changes ship.");
    expect(markup).toContain("Available Evals");
    expect(markup).toContain("Game Master Interview");
    expect(markup).toContain("Checks focused, useful interview turns.");
    expect(markup).toContain("1 eval available");
    expect(markup).toContain("Selected Eval");
    expect(markup).toContain("Status: Ready");
    expect(markup).toContain("Run Selected Eval");
    expect(markup).toContain("Diagnostics");
    expect(markup).toContain("No run yet.");
  });

  it("marks the single suite as selected without adding future placeholders", () => {
    const markup = renderMarkup(readyViewModel);

    expect(markup).toContain('role="listbox"');
    expect(markup).toContain('role="option"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).not.toContain("Coming soon");
  });

  it("renders the running state with pending diagnostics and disabled action", () => {
    const markup = renderMarkup(createRunningEvalConsoleViewModel(readyViewModel));

    expect(markup).toContain("Status: Running");
    expect(markup).toContain("The Game Master is being checked against fixtures.");
    expect(markup).toContain("Running…");
    expect(markup).toContain("Waiting for results…");
    expect(markup).toContain("disabled");
  });

  it("renders passed outcomes with no diagnostics", () => {
    const markup = renderMarkup(
      createEvalConsoleViewModelFromRunResult(readyViewModel, {
        suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
        status: "passed",
        summary: "Game Master Interview Evals passed.",
        diagnostics: [],
        durationMs: 1,
      }),
    );

    expect(markup).toContain("Status: Passed");
    expect(markup).toContain("Game Master Interview Evals passed.");
    expect(markup).toContain("Run Again");
    expect(markup).toContain("No diagnostics.");
  });

  it("renders failed fixture diagnostics without blocked guidance", () => {
    const markup = renderMarkup(
      createEvalConsoleViewModelFromRunResult(
        createRunningEvalConsoleViewModel(readyViewModel),
        {
          suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
          status: "failed",
          summary: "Some fixtures need attention.",
          diagnostics: [
            {
              scope: "fixture",
              fixtureId: "learn-a-language",
              message: "Expected one focused follow-up question.",
            },
          ],
          durationMs: 1,
        },
      ),
    );

    expect(markup).toContain("Status: Failed");
    expect(markup).toContain("[learn-a-language]");
    expect(markup).toContain("Expected one focused follow-up question.");
    expect(markup).not.toContain("Add local config, then check again.");
    expect(markup).not.toContain("Waiting for results…");
  });

  it("renders blocked outcomes as configuration guidance", () => {
    const markup = renderMarkup(
      createEvalConsoleViewModelFromRunResult(readyViewModel, {
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
      }),
    );

    expect(markup).toContain("Status: Blocked");
    expect(markup).toContain("Configuration");
    expect(markup).toContain("OPENAI_API_KEY is not configured.");
    expect(markup).toContain("Add local config, then check again.");
    expect(markup).toContain("Check Again");
  });

  it("renders unexpected errors with safe generic copy", () => {
    const markup = renderMarkup(
      createEvalConsoleViewModelFromRunResult(readyViewModel, {
        suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
        status: "error",
        summary: "The eval did not finish.",
        diagnostics: [
          {
            scope: "run",
            code: "Error",
            message: "The eval could not finish. Try again after checking local setup.",
          },
        ],
        durationMs: 1,
        errorName: "Error",
      }),
    );

    expect(markup).toContain("Status: Could not run");
    expect(markup).toContain("The eval did not finish.");
    expect(markup).toContain("Try Again");
    expect(markup).toContain("The eval could not finish. Try again after checking local setup.");
  });
});
