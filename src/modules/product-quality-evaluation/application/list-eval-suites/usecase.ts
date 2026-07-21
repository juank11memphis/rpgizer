import type { EvalSuiteSummary } from "../../domain/eval-suite";
import { listRegisteredEvalSuiteSummaries } from "../../evals/registry";

export function listEvalSuites(): EvalSuiteSummary[] {
  return listRegisteredEvalSuiteSummaries();
}
