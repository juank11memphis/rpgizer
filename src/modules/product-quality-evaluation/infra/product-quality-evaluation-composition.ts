import { runGameMasterInterviewEvals } from "@/modules/game-master-assistant/evals/run-game-master-interview-evals";

import { listEvalSuites } from "../application/list-eval-suites/usecase";
import { runEvalSuite } from "../application/run-eval-suite/usecase";

export function createProductQualityEvaluationComposition() {
  return {
    listEvalSuites,
    runEvalSuite: (input: Parameters<typeof runEvalSuite>[0]) =>
      runEvalSuite(input, {
        runGameMasterInterviewEvals,
      }),
  };
}
