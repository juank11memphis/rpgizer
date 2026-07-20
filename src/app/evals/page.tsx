import { notFound } from "next/navigation";

import { GAME_MASTER_INTERVIEW_EVAL_SUITE_ID } from "@/modules/product-quality-evaluation/domain/eval-suite";
import { createProductQualityEvaluationComposition } from "@/modules/product-quality-evaluation/infra/product-quality-evaluation-composition";

import { runSelectedEvalSuiteAction } from "./actions";
import { EvalMatrixClient } from "./eval-matrix-client";
import { createReadyEvalMatrixViewModel } from "./eval-matrix-view-model";
import { isLocalEvalDashboardEnabled } from "./eval-route-guard";

export default function EvalsPage() {
  if (!isLocalEvalDashboardEnabled()) {
    notFound();
  }

  const productQualityEvaluation = createProductQualityEvaluationComposition();
  const suites = productQualityEvaluation.listEvalSuites();
  const gameMasterModelLabel = productQualityEvaluation.getGameMasterInterviewModelLabel();
  const readyViewModels = suites.map((suite) => createReadyEvalMatrixViewModel(
    suites,
    suite.id,
    suite.id === GAME_MASTER_INTERVIEW_EVAL_SUITE_ID ? { modelLabel: gameMasterModelLabel } : {},
  ));
  const initialViewModel = readyViewModels.find(
    (viewModel) => viewModel.selectedSuite.id === GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  ) ?? readyViewModels[0];

  return (
    <EvalMatrixClient
      initialViewModel={initialViewModel}
      readyViewModels={readyViewModels}
      runSelectedEvalSuite={runSelectedEvalSuiteAction}
    />
  );
}
