import type { EvalSuiteSummary } from "../../domain/eval-suite";
import { listRegisteredEvalSuiteSummaries } from "../../evals/registry";
import type { EvalSuiteModelEnvironment } from "../../evals/suite-model-defaults";

export function listEvalSuites(environment?: EvalSuiteModelEnvironment): EvalSuiteSummary[] {
  return listRegisteredEvalSuiteSummaries(environment);
}
