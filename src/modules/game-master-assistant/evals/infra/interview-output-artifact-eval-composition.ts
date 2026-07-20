import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
import { serverLogger } from "../../../../server/logging/logger";
import { OpenAIInterviewOutputArtifactGenerator } from "../../infra/openai-interview-output-artifact-generator";
import {
  DEFAULT_OPENAI_GAME_MASTER_MODEL,
  loadOpenAIInterviewSummaryConfig,
} from "../../infra/openai-game-master-interviewer-config";
import type { RunInterviewOutputArtifactEvalsInput } from "../application/run-interview-output-artifact-evals/input";
import type {
  InterviewOutputArtifactEvalBlockedResult,
  InterviewOutputArtifactEvalErrorResult,
  InterviewOutputArtifactEvalFailedResult,
  InterviewOutputArtifactEvalPassedResult,
  InterviewOutputArtifactEvalRunResult,
} from "../application/run-interview-output-artifact-evals/output";
import type {
  InterviewOutputArtifactEvalFixtureLoader,
  InterviewOutputArtifactEvalGeneratorFactory,
  InterviewOutputArtifactEvalInstructionsLoader,
  InterviewOutputArtifactEvalLogger,
  InterviewOutputArtifactEvalRunnerEnvironment,
} from "../application/run-interview-output-artifact-evals/ports";
import { runInterviewOutputArtifactEvalUseCase } from "../application/run-interview-output-artifact-evals/usecase";
import {
  DEFAULT_INTERVIEW_OUTPUT_ARTIFACT_EVAL_FIXTURES_DIR,
  loadInterviewOutputArtifactEvalFixtures,
} from "./file-system-interview-output-artifact-eval-fixtures";

const PRODUCTION_PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/game-master-assistant/infra/prompts/interview-output-artifact.md",
);

type WritableStream = Pick<NodeJS.WriteStream, "write">;

export type InterviewOutputArtifactEvalRunOptions = {
  environment?: InterviewOutputArtifactEvalRunnerEnvironment;
  fixturesDirectory?: string;
  testCaseId?: string;
  loadFixtures?: InterviewOutputArtifactEvalFixtureLoader;
  loadInstructions?: InterviewOutputArtifactEvalInstructionsLoader;
  createGenerator?: InterviewOutputArtifactEvalGeneratorFactory;
  output?: WritableStream;
  errorOutput?: WritableStream;
};

export async function runInterviewOutputArtifactEvals(
  options: InterviewOutputArtifactEvalRunOptions = {},
): Promise<InterviewOutputArtifactEvalRunResult> {
  loadNextEnvironmentWhenUsingProcessEnv(options.environment);
  const output = options.output ?? process.stdout;
  const errorOutput = options.errorOutput ?? process.stderr;
  const shouldWriteCliOutput = options.output !== undefined || options.errorOutput !== undefined;
  const environment = options.environment ?? process.env;

  const result = await runInterviewOutputArtifactEvalUseCase({
    environment,
    loadFixtures: options.loadFixtures ?? createFileSystemFixtureLoader(options.fixturesDirectory),
    loadInstructions: options.loadInstructions ?? loadProductionInstructions,
    createGenerator: options.createGenerator ?? createProductionGenerator,
    modelLabel: loadOpenAIInterviewSummaryModelLabel(environment),
    testCaseId: options.testCaseId,
    logger: createInterviewOutputArtifactEvalLogger(),
  } satisfies RunInterviewOutputArtifactEvalsInput);

  if (shouldWriteCliOutput) {
    writeInterviewOutputArtifactEvalRunResult(result, { output, errorOutput });
  }

  return result;
}

export function writeInterviewOutputArtifactEvalRunResult(
  result: InterviewOutputArtifactEvalRunResult,
  streams: { output?: WritableStream; errorOutput?: WritableStream } = {},
): void {
  writeCliOutput(result, streams.output ?? process.stdout, streams.errorOutput ?? process.stderr);
}

function createFileSystemFixtureLoader(
  fixturesDirectory = DEFAULT_INTERVIEW_OUTPUT_ARTIFACT_EVAL_FIXTURES_DIR,
): InterviewOutputArtifactEvalFixtureLoader {
  return () => loadInterviewOutputArtifactEvalFixtures(fixturesDirectory);
}

function loadProductionInstructions(): Promise<string> {
  return readFile(PRODUCTION_PROMPT_PATH, "utf8");
}

function createProductionGenerator({
  instructions,
  environment,
}: Parameters<InterviewOutputArtifactEvalGeneratorFactory>[0]): OpenAIInterviewOutputArtifactGenerator {
  return new OpenAIInterviewOutputArtifactGenerator({
    instructions,
    config: loadOpenAIInterviewSummaryConfig(environment),
  });
}

function loadOpenAIInterviewSummaryModelLabel(
  environment: InterviewOutputArtifactEvalRunnerEnvironment,
): string {
  return environment.OPENAI_INTERVIEW_SUMMARY_MODEL?.trim() || DEFAULT_OPENAI_GAME_MASTER_MODEL;
}

function loadNextEnvironmentWhenUsingProcessEnv(
  environment: InterviewOutputArtifactEvalRunnerEnvironment | undefined,
): void {
  if (environment !== undefined) {
    return;
  }

  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
}

function writeCliOutput(
  result: InterviewOutputArtifactEvalRunResult,
  output: WritableStream,
  errorOutput: WritableStream,
): void {
  if (result.status === "passed") {
    output.write(`Interview Output Artifact evals passed: ${result.fixtureIds.join(", ")}\n`);
    return;
  }

  if (result.status === "blocked") {
    output.write(
      `Interview Output Artifact evals skipped: ${result.diagnostics[0].message}. Set OPENAI_API_KEY to run live local evals; OPENAI_INTERVIEW_SUMMARY_MODEL is optional.\n`,
    );
    return;
  }

  if (result.status === "failed") {
    for (const diagnostic of result.diagnostics) {
      errorOutput.write(`[${diagnostic.fixtureId}] ${diagnostic.message}\n`);
    }
    return;
  }

  errorOutput.write(`Interview Output Artifact evals failed: ${result.diagnostics[0].message}\n`);
}

function createInterviewOutputArtifactEvalLogger(): InterviewOutputArtifactEvalLogger {
  return {
    started: logEvalStarted,
    completed: logEvalCompleted,
    failed: logEvalFailed,
    blocked: logEvalBlocked,
    error: logEvalError,
  };
}

function logEvalStarted(fixtureIds: string[]): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.INTERVIEW_OUTPUT_ARTIFACT_EVAL_STARTED,
      flow: "interview_output_artifact_eval",
      operation: "eval_interview_output_artifact",
      result: "started",
      fixtureCount: fixtureIds.length,
      fixtureIds,
    },
    "Interview Output Artifact eval run started.",
  );
}

function logEvalCompleted(result: InterviewOutputArtifactEvalPassedResult): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.INTERVIEW_OUTPUT_ARTIFACT_EVAL_COMPLETED,
      flow: "interview_output_artifact_eval",
      operation: "eval_interview_output_artifact",
      result: "passed",
      fixtureCount: result.fixtureIds.length,
      fixtureIds: result.fixtureIds,
      diagnosticCount: 0,
      durationMs: result.durationMs,
    },
    "Interview Output Artifact eval run completed.",
  );
}

function logEvalFailed(result: InterviewOutputArtifactEvalFailedResult): void {
  serverLogger.warn(
    {
      event: APPLICATION_LOG_EVENTS.INTERVIEW_OUTPUT_ARTIFACT_EVAL_FAILED,
      flow: "interview_output_artifact_eval",
      operation: "eval_interview_output_artifact",
      result: "failed",
      fixtureCount: result.fixtureIds.length,
      fixtureIds: result.fixtureIds,
      diagnosticCount: result.diagnostics.length,
      diagnosticFixtureIds: [
        ...new Set(result.diagnostics.map((diagnostic) => diagnostic.fixtureId)),
      ],
      durationMs: result.durationMs,
    },
    "Interview Output Artifact eval run failed expectations.",
  );
}

function logEvalBlocked(result: InterviewOutputArtifactEvalBlockedResult): void {
  serverLogger.warn(
    {
      event: APPLICATION_LOG_EVENTS.INTERVIEW_OUTPUT_ARTIFACT_EVAL_CONFIG_BLOCKED,
      flow: "interview_output_artifact_eval",
      operation: "eval_interview_output_artifact",
      result: "configuration_blocked",
      blocker: result.blocker,
      diagnosticCount: result.diagnostics.length,
      durationMs: result.durationMs,
    },
    "Interview Output Artifact eval configuration is unavailable.",
  );
}

function logEvalError(result: InterviewOutputArtifactEvalErrorResult, error: unknown): void {
  const errorName = error instanceof Error ? error.name || "Error" : "NonErrorThrownValue";

  serverLogger.error(
    {
      event: APPLICATION_LOG_EVENTS.INTERVIEW_OUTPUT_ARTIFACT_EVAL_UNEXPECTED_ERROR,
      flow: "interview_output_artifact_eval",
      operation: "eval_interview_output_artifact",
      result: "error",
      fixtureCount: result.fixtureIds.length,
      fixtureIds: result.fixtureIds,
      diagnosticCount: result.diagnostics.length,
      error: { name: errorName },
      durationMs: result.durationMs,
    },
    "Interview Output Artifact eval run encountered an unexpected error.",
  );
}
