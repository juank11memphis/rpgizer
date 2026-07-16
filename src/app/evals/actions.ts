"use server";

import { createProductQualityEvaluationComposition } from "@/modules/product-quality-evaluation/infra/product-quality-evaluation-composition";

import { runEvalSuiteActionCore } from "./actions-core";
import { isLocalEvalDashboardEnabled } from "./eval-route-guard";

export async function runSelectedEvalSuiteAction(suiteId: string) {
  const productQualityEvaluation = createProductQualityEvaluationComposition();

  return runEvalSuiteActionCore(suiteId, {
    isLocalEvalDashboardEnabled,
    runEvalSuite: productQualityEvaluation.runEvalSuite,
  });
}
