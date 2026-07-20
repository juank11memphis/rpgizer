import path from "node:path";
import { fileURLToPath } from "node:url";

export {
  runInterviewOutputArtifactEvals,
  writeInterviewOutputArtifactEvalRunResult,
  type InterviewOutputArtifactEvalRunOptions,
} from "./infra/interview-output-artifact-eval-composition";
export { INTERVIEW_OUTPUT_ARTIFACT_DEFAULT_VARIANT_ID } from "./application/run-interview-output-artifact-evals/output";
export type {
  InterviewOutputArtifactEvalRunResult,
  InterviewOutputArtifactEvalAssertion,
  InterviewOutputArtifactEvalArtifact,
  InterviewOutputArtifactEvalCell,
  InterviewOutputArtifactEvalCellMetrics,
  InterviewOutputArtifactEvalPassedResult,
  InterviewOutputArtifactEvalFailedResult,
  InterviewOutputArtifactEvalBlockedResult,
  InterviewOutputArtifactEvalErrorResult,
} from "./application/run-interview-output-artifact-evals/output";
export type {
  InterviewOutputArtifactEvalFixtureLoader,
  InterviewOutputArtifactEvalInstructionsLoader,
  InterviewOutputArtifactEvalGenerator,
  InterviewOutputArtifactEvalGeneratorFactory,
  InterviewOutputArtifactEvalRunnerEnvironment,
} from "./application/run-interview-output-artifact-evals/ports";
export type {
  InterviewOutputArtifactEvalExpectations,
  InterviewOutputArtifactEvalFixture,
} from "./domain/interview-output-artifact-eval-types";

import { runInterviewOutputArtifactEvals } from "./infra/interview-output-artifact-eval-composition";

async function main(): Promise<void> {
  const result = await runInterviewOutputArtifactEvals({
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
