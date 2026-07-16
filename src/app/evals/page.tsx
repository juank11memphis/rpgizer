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
  const initialViewModel = createReadyEvalMatrixViewModel(
    suites,
    GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
    { modelLabel: productQualityEvaluation.getGameMasterInterviewModelLabel() },
  );

  return (
    <EvalMatrixClient
      initialViewModel={initialViewModel}
      runSelectedEvalSuite={runSelectedEvalSuiteAction}
    />
  );
}
