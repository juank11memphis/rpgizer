import type { EvalSuiteId } from "../../domain/eval-suite";

export type RunEvalSuiteInput = {
  suiteId: EvalSuiteId | string;
  testCaseId?: string;
};
