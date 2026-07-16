import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
import { serverLogger } from "../../../../server/logging/logger";
import { OpenAIGameMasterInterviewer } from "../../infra/openai-game-master-interviewer";
import { runGameMasterInterviewEvalUseCase } from "../application/run-game-master-interview-evals/usecase";
import type { RunGameMasterInterviewEvalsInput } from "../application/run-game-master-interview-evals/input";
import type {
  GameMasterInterviewEvalBlockedResult,
  GameMasterInterviewEvalErrorResult,
  GameMasterInterviewEvalFailedResult,
  GameMasterInterviewEvalPassedResult,
  GameMasterInterviewEvalRunResult,
} from "../application/run-game-master-interview-evals/output";
import type {
  GameMasterInterviewEvalFixtureLoader,
  GameMasterInterviewEvalInstructionsLoader,
  GameMasterInterviewEvalInterviewerFactory,
  GameMasterInterviewEvalLogger,
  GameMasterInterviewEvalRunnerEnvironment,
} from "../application/run-game-master-interview-evals/ports";
import {
  DEFAULT_GAME_MASTER_INTERVIEW_EVAL_FIXTURES_DIR,
  loadGameMasterInterviewEvalFixtures,
} from "./file-system-game-master-interview-eval-fixtures";

const PRODUCTION_PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/game-master-assistant/infra/prompts/game-master-interview.md",
);

type WritableStream = Pick<NodeJS.WriteStream, "write">;

export type GameMasterInterviewEvalRunOptions = {
  environment?: GameMasterInterviewEvalRunnerEnvironment;
  fixturesDirectory?: string;
  testCaseId?: string;
  loadFixtures?: GameMasterInterviewEvalFixtureLoader;
  loadInstructions?: GameMasterInterviewEvalInstructionsLoader;
  createInterviewer?: GameMasterInterviewEvalInterviewerFactory;
  output?: WritableStream;
  errorOutput?: WritableStream;
};

export async function runGameMasterInterviewEvals(
  options: GameMasterInterviewEvalRunOptions = {},
): Promise<GameMasterInterviewEvalRunResult> {
  loadNextEnvironmentWhenUsingProcessEnv(options.environment);
  const output = options.output ?? process.stdout;
  const errorOutput = options.errorOutput ?? process.stderr;
  const shouldWriteCliOutput =
    options.output !== undefined || options.errorOutput !== undefined;

  const result = await runGameMasterInterviewEvalUseCase({
    environment: options.environment ?? process.env,
    loadFixtures: options.loadFixtures ?? createFileSystemFixtureLoader(options.fixturesDirectory),
    loadInstructions: options.loadInstructions ?? loadProductionInstructions,
    createInterviewer: options.createInterviewer ?? createProductionInterviewer,
    testCaseId: options.testCaseId,
    logger: createGameMasterInterviewEvalLogger(),
  } satisfies RunGameMasterInterviewEvalsInput);

  if (shouldWriteCliOutput) {
    writeGameMasterInterviewEvalRunResult(result, { output, errorOutput });
  }

  return result;
}

export function writeGameMasterInterviewEvalRunResult(
  result: GameMasterInterviewEvalRunResult,
  streams: { output?: WritableStream; errorOutput?: WritableStream } = {},
): void {
  writeCliOutput(result, streams.output ?? process.stdout, streams.errorOutput ?? process.stderr);
}

function createFileSystemFixtureLoader(
  fixturesDirectory = DEFAULT_GAME_MASTER_INTERVIEW_EVAL_FIXTURES_DIR,
): GameMasterInterviewEvalFixtureLoader {
  return () => loadGameMasterInterviewEvalFixtures(fixturesDirectory);
}

function loadProductionInstructions(): Promise<string> {
  return readFile(PRODUCTION_PROMPT_PATH, "utf8");
}

function createProductionInterviewer({
  instructions,
}: Parameters<GameMasterInterviewEvalInterviewerFactory>[0]): OpenAIGameMasterInterviewer {
  return new OpenAIGameMasterInterviewer({ instructions });
}

function loadNextEnvironmentWhenUsingProcessEnv(
  environment: GameMasterInterviewEvalRunnerEnvironment | undefined,
): void {
  if (environment !== undefined) {
    return;
  }

  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
}

function writeCliOutput(
  result: GameMasterInterviewEvalRunResult,
  output: WritableStream,
  errorOutput: WritableStream,
): void {
  if (result.status === "passed") {
    output.write(`Game Master evals passed: ${result.fixtureIds.join(", ")}\n`);
    return;
  }

  if (result.status === "blocked") {
    output.write(
      `Game Master evals skipped: ${result.diagnostics[0].message}. Set OPENAI_API_KEY to run live local evals; OPENAI_GAME_MASTER_MODEL is optional.\n`,
    );
    return;
  }

  if (result.status === "failed") {
    for (const diagnostic of result.diagnostics) {
      errorOutput.write(`[${diagnostic.fixtureId}] ${diagnostic.message}\n`);
    }
    return;
  }

  errorOutput.write(`Game Master evals failed: ${result.diagnostics[0].message}\n`);
}

function createGameMasterInterviewEvalLogger(): GameMasterInterviewEvalLogger {
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
      event: APPLICATION_LOG_EVENTS.GAME_MASTER_INTERVIEW_EVAL_STARTED,
      flow: "game_master_interview_eval",
      operation: "eval_game_master_interview",
      result: "started",
      fixtureCount: fixtureIds.length,
      fixtureIds,
    },
    "Game Master Interview eval run started.",
  );
}

function logEvalCompleted(result: GameMasterInterviewEvalPassedResult): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.GAME_MASTER_INTERVIEW_EVAL_COMPLETED,
      flow: "game_master_interview_eval",
      operation: "eval_game_master_interview",
      result: "passed",
      fixtureCount: result.fixtureIds.length,
      fixtureIds: result.fixtureIds,
      diagnosticCount: 0,
      durationMs: result.durationMs,
    },
    "Game Master Interview eval run completed.",
  );
}

function logEvalFailed(result: GameMasterInterviewEvalFailedResult): void {
  serverLogger.warn(
    {
      event: APPLICATION_LOG_EVENTS.GAME_MASTER_INTERVIEW_EVAL_FAILED,
      flow: "game_master_interview_eval",
      operation: "eval_game_master_interview",
      result: "failed",
      fixtureCount: result.fixtureIds.length,
      fixtureIds: result.fixtureIds,
      diagnosticCount: result.diagnostics.length,
      diagnosticFixtureIds: [
        ...new Set(result.diagnostics.map((diagnostic) => diagnostic.fixtureId)),
      ],
      durationMs: result.durationMs,
    },
    "Game Master Interview eval run failed expectations.",
  );
}

function logEvalBlocked(result: GameMasterInterviewEvalBlockedResult): void {
  serverLogger.warn(
    {
      event: APPLICATION_LOG_EVENTS.GAME_MASTER_INTERVIEW_EVAL_CONFIG_BLOCKED,
      flow: "game_master_interview_eval",
      operation: "eval_game_master_interview",
      result: "configuration_blocked",
      blocker: result.blocker,
      diagnosticCount: result.diagnostics.length,
      durationMs: result.durationMs,
    },
    "Game Master Interview eval configuration is unavailable.",
  );
}

function logEvalError(result: GameMasterInterviewEvalErrorResult, error: unknown): void {
  const errorName = error instanceof Error ? error.name || "Error" : "NonErrorThrownValue";

  serverLogger.error(
    {
      event: APPLICATION_LOG_EVENTS.GAME_MASTER_INTERVIEW_EVAL_UNEXPECTED_ERROR,
      flow: "game_master_interview_eval",
      operation: "eval_game_master_interview",
      result: "error",
      fixtureCount: result.fixtureIds.length,
      fixtureIds: result.fixtureIds,
      diagnosticCount: result.diagnostics.length,
      error: { name: errorName },
      durationMs: result.durationMs,
    },
    "Game Master Interview eval run encountered an unexpected error.",
  );
}
