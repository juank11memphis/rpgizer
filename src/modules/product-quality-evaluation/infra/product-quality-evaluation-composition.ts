import { runAdventureContentEvals } from "@/modules/adventure-planner/evals/run-adventure-content-evals";
import { runAdventureLinkingEvals } from "@/modules/adventure-planner/evals/run-adventure-linking-evals";
import { runAdventureXpEvals } from "@/modules/adventure-planner/evals/run-adventure-xp-evals";
import { runGenerateAdventureEvals } from "@/modules/adventure-planner/evals/run-generate-adventure-evals";
import { runGameMasterInterviewEvals } from "@/modules/game-master-assistant/evals/run-game-master-interview-evals";
import { runInterviewOutputArtifactEvals } from "@/modules/game-master-assistant/evals/run-interview-output-artifact-evals";
import { listEvalSuites } from "../application/list-eval-suites/usecase";
import { runEvalSuite } from "../application/run-eval-suite/usecase";

export function createProductQualityEvaluationComposition() {
  return {
    listEvalSuites,
    runEvalSuite: (input: Parameters<typeof runEvalSuite>[0]) =>
      runEvalSuite(input, {
        runGameMasterInterviewEvals,
        runInterviewOutputArtifactEvals,
        runGenerateAdventureEvals,
        runAdventureContentEvals,
        runAdventureLinkingEvals,
        runAdventureXpEvals,
      }),
  };
}
