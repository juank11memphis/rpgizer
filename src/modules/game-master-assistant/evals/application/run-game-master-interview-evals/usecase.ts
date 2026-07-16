import type { InterviewTurnRequest } from "../../../application/start-adventure-interview/ports";
import { checkGameMasterInterviewEvalAssertions } from "../../domain/game-master-interview-eval-checks";
import type { GameMasterInterviewEvalFixture } from "../../domain/game-master-interview-eval-types";
import type { RunGameMasterInterviewEvalsInput } from "./input";
import type { GameMasterInterviewEvalInterviewer } from "./ports";
import {
  GAME_MASTER_INTERVIEW_DEFAULT_VARIANT_ID,
  createUnavailableGameMasterInterviewEvalCellMetrics,
  type GameMasterInterviewEvalArtifact,
  type GameMasterInterviewEvalBlockedResult,
  type GameMasterInterviewEvalCell,
  type GameMasterInterviewEvalErrorResult,
  type GameMasterInterviewEvalFailedResult,
  type GameMasterInterviewEvalRunDiagnostic,
  type GameMasterInterviewEvalRunResult,
} from "./output";

const EVAL_CREATED_AT = new Date(0);
const NOOP_LOGGER = {
  started() {},
  completed() {},
  failed() {},
  blocked() {},
  error() {},
};

type FixtureResult = GameMasterInterviewEvalCell;

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
    const fixtures = selectFixtures(await input.loadFixtures(), input.testCaseId);
    fixtureIds = fixtures.map((fixture) => fixture.id);

    if (input.testCaseId && fixtures.length === 0) {
      const result: GameMasterInterviewEvalErrorResult = {
        status: "error",
        modelLabel: input.modelLabel,
        fixtureIds: [],
        diagnostics: [
          {
            errorName: "UnknownEvalTestCase",
            message: "Game Master eval runner error: Error: Selected test case is not available.",
          },
        ],
        durationMs: Date.now() - startedAt,
      };
      logger.error(result, new Error("Unknown eval test case"));
      return result;
    }

    logger.started(fixtureIds);

    const instructions = await input.loadInstructions();
    const interviewer = await input.createInterviewer({
      instructions,
      environment: input.environment,
    });
    const results: FixtureResult[] = [];

    for (const fixture of fixtures) {
      results.push(await runFixture(fixture, interviewer, instructions));
    }

    const diagnostics = results.flatMap((result) => result.diagnostics);

    if (diagnostics.length > 0) {
      const result: GameMasterInterviewEvalFailedResult = {
        status: "failed",
        modelLabel: input.modelLabel,
        fixtureIds,
        diagnostics,
        cells: results,
        durationMs: Date.now() - startedAt,
      };
      logger.failed(result);
      return result;
    }

    const result = {
      status: "passed",
      modelLabel: input.modelLabel,
      fixtureIds,
      diagnostics: [],
      cells: results,
      durationMs: Date.now() - startedAt,
    } satisfies GameMasterInterviewEvalRunResult;
    logger.completed(result);
    return result;
  } catch (error) {
    const result: GameMasterInterviewEvalErrorResult = {
      status: "error",
      modelLabel: input.modelLabel,
      fixtureIds,
      diagnostics: [formatUnexpectedErrorDiagnostic(error)],
      durationMs: Date.now() - startedAt,
    };
    logger.error(result, error);
    return result;
  }
}

function selectFixtures(
  fixtures: GameMasterInterviewEvalFixture[],
  testCaseId: string | undefined,
): GameMasterInterviewEvalFixture[] {
  if (!testCaseId) {
    return fixtures;
  }

  return fixtures.filter((fixture) => fixture.id === testCaseId);
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
  instructions: string,
): Promise<FixtureResult> {
  const request = buildRequest(fixture);
  const startedAt = Date.now();
  const result = await interviewer.askNextQuestion(request);
  const latencyMs = Date.now() - startedAt;
  const assertions = checkGameMasterInterviewEvalAssertions(fixture, result);
  const diagnostics = assertions
    .filter((assertion) => assertion.status === "failed")
    .map((assertion) => ({
      fixtureId: fixture.id,
      message: assertion.message ?? assertion.label,
    }));

  return {
    id: `${fixture.id}::${GAME_MASTER_INTERVIEW_DEFAULT_VARIANT_ID}`,
    fixtureId: fixture.id,
    testCaseId: fixture.id,
    testCaseName: fixture.name,
    inputVariables: buildInputVariables(fixture),
    variantId: GAME_MASTER_INTERVIEW_DEFAULT_VARIANT_ID,
    variantName: "Default variant",
    status: diagnostics.length > 0 ? "failed" : "passed",
    output: redactSensitiveText(result.messageToUser),
    outputPreview: buildOutputPreview(result.messageToUser),
    assertions,
    diagnostics,
    metrics: createUnavailableGameMasterInterviewEvalCellMetrics(latencyMs),
    artifacts: buildRedactedArtifacts({ fixture, instructions, request, response: result }),
  };
}

function buildInputVariables(fixture: GameMasterInterviewEvalFixture): Record<string, string> {
  return {
    goal: redactSensitiveText(fixture.goalText),
    transcriptTurns: String(fixture.transcript.length),
  };
}

function buildOutputPreview(output: string): string {
  const redactedOutput = redactSensitiveText(output).replace(/\s+/g, " ").trim();
  return redactedOutput.length > 160 ? `${redactedOutput.slice(0, 157)}…` : redactedOutput;
}

function buildRedactedArtifacts(input: {
  fixture: GameMasterInterviewEvalFixture;
  instructions: string;
  request: InterviewTurnRequest;
  response: unknown;
}): GameMasterInterviewEvalArtifact[] {
  return [
    buildArtifact("prompt", "Raw prompt", input.instructions),
    buildArtifact("request", "Raw request", input.request),
    buildArtifact("response", "Raw response", input.response),
    buildArtifact("expected", "Expected / golden", input.fixture.expectations),
  ];
}

function buildArtifact(id: string, label: string, value: unknown): GameMasterInterviewEvalArtifact {
  const serializedValue = serializeArtifactValue(value);

  if (serializedValue.length === 0) {
    return { id, label, localOnly: true, redactionState: "not_available" };
  }

  const redactedValue = redactSensitiveText(serializedValue);

  return {
    id,
    label,
    localOnly: true,
    redactionState: "redacted",
    value: redactedValue,
    preview: buildOutputPreview(redactedValue),
  };
}

function serializeArtifactValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  try {
    return JSON.stringify(value, redactSecretBearingFields, 2) ?? "";
  } catch {
    return "[Unserializable local artifact]";
  }
}

function redactSecretBearingFields(key: string, value: unknown): unknown {
  if (isSecretBearingKey(key)) {
    return "[REDACTED]";
  }

  return value;
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/sk-[a-z0-9_-]+/giu, "[REDACTED]")
    .replace(/(authorization\s*["':=]\s*)(bearer\s+)?[^\s"',}]+/giu, "$1[REDACTED]")
    .replace(/(api[_-]?key|token|secret|credential|password|session|cookie)(\s*["':=]\s*)[^\s"',}]+/giu, "$1$2[REDACTED]");
}

function isSecretBearingKey(key: string): boolean {
  return /api[_-]?key|authorization|cookie|token|secret|credential|password|session/iu.test(key);
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
