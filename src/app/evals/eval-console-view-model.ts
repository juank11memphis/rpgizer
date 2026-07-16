import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";
import type { EvalSuiteSummary } from "@/modules/product-quality-evaluation/domain/eval-suite";

import type { EvalConsoleViewModel } from "./eval-console-types";

export function createReadyEvalConsoleViewModel(
  suites: EvalSuiteSummary[],
  selectedSuiteId: string,
): EvalConsoleViewModel {
  const selectedSuite = selectSuite(suites, selectedSuiteId);
  const consoleSuites = suites.map((suite) => ({
    ...suite,
    selected: suite.id === selectedSuite.id,
  }));

  return {
    suites: consoleSuites,
    selectedSuite: { ...selectedSuite, selected: true },
    availableCountLabel: `${suites.length} ${suites.length === 1 ? "eval" : "evals"} available`,
    status: "ready",
    statusLabel: "Ready",
    statusMessage: "The console is prepared to run this eval.",
    actionLabel: "Run Selected Eval",
    actionDisabled: false,
    diagnosticsTitle: "Diagnostics",
    diagnosticsMessage: "No run yet.",
    diagnostics: [],
  };
}

export function createRunningEvalConsoleViewModel(
  currentViewModel: EvalConsoleViewModel,
): EvalConsoleViewModel {
  return {
    ...currentViewModel,
    status: "running",
    statusLabel: "Running",
    statusMessage: "The Game Master is being checked against fixtures.",
    actionLabel: "Running…",
    actionDisabled: true,
    diagnosticsTitle: "Diagnostics",
    diagnosticsMessage: "Waiting for results…",
    diagnostics: [],
  };
}

export function createEvalConsoleViewModelFromRunResult(
  currentViewModel: EvalConsoleViewModel,
  result: EvalRunResult,
): EvalConsoleViewModel {
  if (result.status === "passed") {
    return {
      ...currentViewModel,
      status: "passed",
      statusLabel: "Passed",
      statusMessage: "Game Master Interview Evals passed.",
      actionLabel: "Run Again",
      actionDisabled: false,
      diagnosticsTitle: "Diagnostics",
      diagnosticsMessage: "No diagnostics.",
      diagnostics: [],
    };
  }

  if (result.status === "failed") {
    return {
      ...currentViewModel,
      status: "failed",
      statusLabel: "Failed",
      statusMessage: "Some fixtures need attention.",
      actionLabel: "Run Again",
      actionDisabled: false,
      diagnosticsTitle: "Diagnostics",
      diagnosticsMessage: undefined,
      diagnostics: result.diagnostics,
    };
  }

  if (result.status === "blocked") {
    return {
      ...currentViewModel,
      status: "blocked",
      statusLabel: "Blocked",
      statusMessage: "Local configuration is missing or invalid.",
      actionLabel: "Check Again",
      actionDisabled: false,
      diagnosticsTitle: "Configuration",
      diagnosticsMessage: undefined,
      diagnostics: result.diagnostics,
    };
  }

  return {
    ...currentViewModel,
    status: "error",
    statusLabel: "Could not run",
    statusMessage: "The eval did not finish.",
    actionLabel: "Try Again",
    actionDisabled: false,
    diagnosticsTitle: "Diagnostics",
    diagnosticsMessage: undefined,
    diagnostics: result.diagnostics,
  };
}

function selectSuite(suites: EvalSuiteSummary[], selectedSuiteId: string): EvalSuiteSummary {
  const selectedSuite = suites.find((suite) => suite.id === selectedSuiteId);

  if (!selectedSuite) {
    throw new Error("Selected eval suite is not available.");
  }

  return selectedSuite;
}
