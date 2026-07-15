import { listEvalSuites } from "../application/list-eval-suites/usecase";

export function createProductQualityEvaluationComposition() {
  return {
    listEvalSuites,
  };
}
