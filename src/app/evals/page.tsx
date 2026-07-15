import { notFound } from "next/navigation";

import { GAME_MASTER_INTERVIEW_EVAL_SUITE_ID } from "@/modules/product-quality-evaluation/domain/eval-suite";
import { createProductQualityEvaluationComposition } from "@/modules/product-quality-evaluation/infra/product-quality-evaluation-composition";

import { EvalConsoleScreen } from "./eval-console-screen";
import type { ReadyEvalConsoleViewModel } from "./eval-console-types";
import { isLocalEvalDashboardEnabled } from "./eval-route-guard";

export default function EvalsPage() {
  if (!isLocalEvalDashboardEnabled()) {
    notFound();
  }

  const productQualityEvaluation = createProductQualityEvaluationComposition();
  const suites = productQualityEvaluation.listEvalSuites();
  const selectedSuite = suites.find(
    (suite) => suite.id === GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  );

  if (!selectedSuite) {
    throw new Error("Game Master Interview eval suite is not available.");
  }

  const consoleSuites = suites.map((suite) => ({
    ...suite,
    selected: suite.id === selectedSuite.id,
  }));

  const viewModel: ReadyEvalConsoleViewModel = {
    suites: consoleSuites,
    selectedSuite: {
      ...selectedSuite,
      selected: true,
    },
    availableCountLabel: `${suites.length} eval available`,
    status: "Ready",
    statusMessage: "The console is prepared to run this eval.",
    diagnosticsMessage: "No run yet.",
  };

  return <EvalConsoleScreen viewModel={viewModel} />;
}
