import path from "node:path";
import { fileURLToPath } from "node:url";

export {
  runGameMasterInterviewEvals,
  writeGameMasterInterviewEvalRunResult,
  type GameMasterInterviewEvalRunOptions,
} from "./infra/game-master-interview-eval-composition";
export { GAME_MASTER_INTERVIEW_DEFAULT_VARIANT_ID } from "./application/run-game-master-interview-evals/output";
export type {
  GameMasterInterviewEvalDiagnostic,
  GameMasterInterviewEvalRunDiagnostic,
  GameMasterInterviewEvalRunResult,
  GameMasterInterviewEvalAssertion,
  GameMasterInterviewEvalArtifact,
  GameMasterInterviewEvalCell,
  GameMasterInterviewEvalCellMetrics,
  GameMasterInterviewEvalPassedResult,
  GameMasterInterviewEvalFailedResult,
  GameMasterInterviewEvalBlockedResult,
  GameMasterInterviewEvalErrorResult,
} from "./application/run-game-master-interview-evals/output";
export type {
  GameMasterInterviewEvalFixtureLoader,
  GameMasterInterviewEvalInstructionsLoader,
  GameMasterInterviewEvalInterviewer,
  GameMasterInterviewEvalInterviewerFactory,
  GameMasterInterviewEvalRunnerEnvironment,
} from "./application/run-game-master-interview-evals/ports";
export type {
  GameMasterInterviewEvalExpectations,
  GameMasterInterviewEvalFixture,
} from "./domain/game-master-interview-eval-types";

import { runGameMasterInterviewEvals } from "./infra/game-master-interview-eval-composition";

async function main(): Promise<void> {
  const result = await runGameMasterInterviewEvals({
    output: process.stdout,
    errorOutput: process.stderr,
  });

  if (result.status === "failed" || result.status === "error") {
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] === undefined ? "" : path.resolve(process.argv[1]);

if (invokedFilePath === currentFilePath) {
  void main();
}
