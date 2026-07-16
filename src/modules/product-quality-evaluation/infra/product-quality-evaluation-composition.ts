import { runGameMasterInterviewEvals } from "@/modules/game-master-assistant/evals/run-game-master-interview-evals";
import { loadOpenAIGameMasterModelLabel } from "@/modules/game-master-assistant/infra/openai-game-master-interviewer-config";

import { listEvalSuites } from "../application/list-eval-suites/usecase";
import { runEvalSuite } from "../application/run-eval-suite/usecase";

export function createProductQualityEvaluationComposition() {
  return {
    listEvalSuites,
    getGameMasterInterviewModelLabel: () => loadOpenAIGameMasterModelLabel(),
    runEvalSuite: (input: Parameters<typeof runEvalSuite>[0]) =>
      runEvalSuite(input, {
        runGameMasterInterviewEvals,
      }),
  };
}
