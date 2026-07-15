import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GAME_MASTER_INTERVIEW_EVAL_SUITE_ID } from "@/modules/product-quality-evaluation/domain/eval-suite";

import { EvalConsoleScreen } from "./eval-console-screen";
import type { ReadyEvalConsoleViewModel } from "./eval-console-types";

function renderMarkup(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

const readyViewModel: ReadyEvalConsoleViewModel = {
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
  status: "Ready",
  statusMessage: "The console is prepared to run this eval.",
  diagnosticsMessage: "No run yet.",
};

describe("EvalConsoleScreen", () => {
  it("renders the Ready shell for the selected Game Master Interview suite", () => {
    const markup = renderMarkup(<EvalConsoleScreen viewModel={readyViewModel} />);

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
    const markup = renderMarkup(<EvalConsoleScreen viewModel={readyViewModel} />);

    expect(markup).toContain('role="listbox"');
    expect(markup).toContain('role="option"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).not.toContain("Coming soon");
  });
});
