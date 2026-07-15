import type { InterviewTurnRequest } from "../../../application/start-adventure-interview/ports";
import { checkGameMasterInterviewEvalResult } from "../../domain/game-master-interview-eval-checks";
import type { GameMasterInterviewEvalFixture } from "../../domain/game-master-interview-eval-types";
import type { RunGameMasterInterviewEvalsInput } from "./input";
import type { GameMasterInterviewEvalInterviewer } from "./ports";
import type {
  GameMasterInterviewEvalBlockedResult,
  GameMasterInterviewEvalErrorResult,
  GameMasterInterviewEvalFailedResult,
  GameMasterInterviewEvalRunDiagnostic,
  GameMasterInterviewEvalRunResult,
} from "./output";

const EVAL_CREATED_AT = new Date(0);
const NOOP_LOGGER = {
  started() {},
  completed() {},
  failed() {},
  blocked() {},
  error() {},
};

type FixtureResult = {
  fixtureId: string;
  diagnostics: string[];
};

type CredentialStatus =
  | { canRun: true; reason: "credentials configured" }
  | {
      canRun: false;
      blocker: GameMasterInterviewEvalBlockedResult["blocker"];
      reason: string;
    };

export async function runGameMasterInterviewEvalUseCase(
  input: RunGameMasterInterviewEvalsInput,
): Promise<GameMasterInterviewEvalRunResult> {
  const startedAt = Date.now();
  const logger = input.logger ?? NOOP_LOGGER;
  const credentialStatus = getCredentialStatus(input.environment);

  if (!credentialStatus.canRun) {
    const result: GameMasterInterviewEvalBlockedResult = {
      status: "blocked",
      fixtureIds: [],
      diagnostics: [{ message: credentialStatus.reason }],
      blocker: credentialStatus.blocker,
      durationMs: Date.now() - startedAt,
    };
    logger.blocked(result);
    return result;
  }

  let fixtureIds: string[] = [];

  try {
    const fixtures = await input.loadFixtures();
    fixtureIds = fixtures.map((fixture) => fixture.id);
    logger.started(fixtureIds);

    const instructions = await input.loadInstructions();
    const interviewer = await input.createInterviewer({
      instructions,
      environment: input.environment,
    });
    const results: FixtureResult[] = [];

    for (const fixture of fixtures) {
      results.push(await runFixture(fixture, interviewer));
    }

    const diagnostics = results.flatMap((result) =>
      result.diagnostics.map((message) => ({ fixtureId: result.fixtureId, message })),
    );

    if (diagnostics.length > 0) {
      const result: GameMasterInterviewEvalFailedResult = {
        status: "failed",
        fixtureIds,
        diagnostics,
        durationMs: Date.now() - startedAt,
      };
      logger.failed(result);
      return result;
    }

    const result = {
      status: "passed",
      fixtureIds,
      diagnostics: [],
      durationMs: Date.now() - startedAt,
    } satisfies GameMasterInterviewEvalRunResult;
    logger.completed(result);
    return result;
  } catch (error) {
    const result: GameMasterInterviewEvalErrorResult = {
      status: "error",
      fixtureIds,
      diagnostics: [formatUnexpectedErrorDiagnostic(error)],
      durationMs: Date.now() - startedAt,
    };
    logger.error(result, error);
    return result;
  }
}

function getCredentialStatus(
  environment: RunGameMasterInterviewEvalsInput["environment"],
): CredentialStatus {
  const apiKey = environment.OPENAI_API_KEY?.trim() ?? "";
  const model = environment.OPENAI_GAME_MASTER_MODEL?.trim() ?? "";

  if (apiKey.length === 0) {
    return {
      canRun: false,
      blocker: "missing_openai_api_key",
      reason: "OPENAI_API_KEY is not configured",
    };
  }

  if (isPlaceholderValue(apiKey)) {
    return {
      canRun: false,
      blocker: "placeholder_openai_api_key",
      reason: "OPENAI_API_KEY appears to be a placeholder value",
    };
  }

  if (model.length > 0 && isPlaceholderValue(model)) {
    return {
      canRun: false,
      blocker: "placeholder_openai_game_master_model",
      reason: "OPENAI_GAME_MASTER_MODEL appears to be a placeholder value",
    };
  }

  return { canRun: true, reason: "credentials configured" };
}

async function runFixture(
  fixture: GameMasterInterviewEvalFixture,
  interviewer: GameMasterInterviewEvalInterviewer,
): Promise<FixtureResult> {
  const result = await interviewer.askNextQuestion(buildRequest(fixture));
  return {
    fixtureId: fixture.id,
    diagnostics: checkGameMasterInterviewEvalResult(fixture, result),
  };
}

function buildRequest(fixture: GameMasterInterviewEvalFixture): InterviewTurnRequest {
  return {
    userId: `eval-user-${fixture.id}`,
    adventureId: `eval-adventure-${fixture.id}`,
    goalText: fixture.goalText,
    readinessStatus: "not_ready",
    interviewStatus: "interviewing",
    transcript: fixture.transcript.map((message, index) => ({
      id: `${fixture.id}-${index + 1}`,
      role: message.role,
      content: message.content,
      sequenceNumber: index + 1,
      createdAt: EVAL_CREATED_AT,
    })),
  };
}

function isPlaceholderValue(value: string): boolean {
  return /^(changeme|change-me|placeholder|todo|your-|replace-me|replace-with-|example)/iu.test(value.trim());
}

function formatUnexpectedErrorDiagnostic(error: unknown): GameMasterInterviewEvalRunDiagnostic {
  if (error instanceof Error) {
    return {
      errorName: error.name || "Error",
      message: `Game Master eval runner error: ${error.name || "Error"}: ${formatSafeErrorMessage(error.message)}`,
    };
  }

  return {
    errorName: "NonErrorThrownValue",
    message: "Game Master eval runner error: NonErrorThrownValue: A non-Error value was thrown.",
  };
}

function formatSafeErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return "Unknown error.";
  }

  if (!isSafeUnexpectedErrorMessage(trimmed)) {
    return "Unexpected eval runner failure.";
  }

  return trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed;
}

function isSafeUnexpectedErrorMessage(message: string): boolean {
  if (message.length > 240) {
    return false;
  }

  if (
    /sk-[a-z0-9_-]+/iu.test(message) ||
    /api[_ -]?key|secret|token|credential|password|prompt|provider|response|transcript|payload/iu.test(message)
  ) {
    return false;
  }

  return [
    "fixture",
    "json",
    "must be",
    "invalid",
    "unknown",
    "missing",
    "not found",
    "enoent",
    "no game master eval fixtures",
  ].some((safeSignal) => message.toLowerCase().includes(safeSignal));
}
