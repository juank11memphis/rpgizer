import { readFile } from "node:fs/promises";
import path from "node:path";

import OpenAI from "openai";

import { loadServerLoggingConfig } from "../../../server/logging/config";
import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { serverLogger } from "../../../server/logging/logger";
import { serializeAiPayloadForLog, serializeErrorForLog } from "../../../server/logging/redaction";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";

import type {
  GameMasterInterviewer,
  InterviewTurnRequest,
  InterviewTurnResult,
} from "../application/start-adventure-interview/ports";
import { GameMasterInterviewerError } from "../application/start-adventure-interview/provider-error";
import { INTERVIEW_READINESS_STATUSES, isInterviewReadinessStatus } from "../domain/interview-readiness";
import type { InterviewMessage } from "../domain/interview-message";
import {
  loadOpenAIGameMasterInterviewerConfig,
  type OpenAIGameMasterInterviewerConfig,
} from "./openai-game-master-interviewer-config";

const PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/game-master-assistant/infra/prompts/game-master-interview.md",
);

const INTERVIEW_READINESS_CONFIRMATIONS = ["confirmed", "not_confirmed"] as const;

const COVERED_SIGNAL_KEYS = [
  "motivation",
  "successDefinition",
  "currentStage",
  "pastFriction",
  "constraints",
  "existingInventory",
  "likelyMissingResources",
  "safetyBoundary",
] as const;

type CoveredSignalKey = (typeof COVERED_SIGNAL_KEYS)[number];

type OpenAIResponsesClient = {
  responses: {
    create(params: ResponseCreateParamsNonStreaming): Promise<Response>;
  };
};

type OpenAIGameMasterInterviewerOptions = {
  config?: OpenAIGameMasterInterviewerConfig;
  client?: OpenAIResponsesClient;
  instructions?: string;
  promptPath?: string;
};

export class OpenAIGameMasterInterviewer implements GameMasterInterviewer {
  private readonly config: OpenAIGameMasterInterviewerConfig;
  private readonly client: OpenAIResponsesClient;
  private readonly instructions?: string;
  private readonly promptPath: string;

  constructor(options: OpenAIGameMasterInterviewerOptions = {}) {
    this.config = options.config ?? loadOpenAIGameMasterInterviewerConfig();
    this.client =
      options.client ?? new OpenAI({ apiKey: this.config.apiKey });
    this.instructions = options.instructions;
    this.promptPath = options.promptPath ?? PROMPT_PATH;
  }

  async askNextQuestion(input: InterviewTurnRequest): Promise<InterviewTurnResult> {
    const startedAt = Date.now();

    try {
      const instructions = await this.loadInstructions();
      const request = {
        model: this.config.model,
        instructions,
        input: buildResponseInput(input),
        text: { format: INTERVIEW_TURN_RESULT_FORMAT },
        max_output_tokens: 800,
        store: false,
        safety_identifier: input.userId.slice(0, 64),
      } satisfies ResponseCreateParamsNonStreaming;

      logAiPayloadDebug("game_master_interviewer.ask_next_question", input, {
        direction: "request",
        payload: request,
      });

      const response = await this.client.responses.create(request);

      logAiPayloadDebug("game_master_interviewer.ask_next_question", input, {
        direction: "response",
        payload: response,
      });

      const result = parseInterviewTurnResponse(response);

      serverLogger.info(
        {
          event: APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_COMPLETED,
          flow: "ai_provider",
          operation: "game_master_interviewer.ask_next_question",
          result: "success",
          userId: input.userId,
          adventureId: input.adventureId,
          model: this.config.model,
          durationMs: Date.now() - startedAt,
        },
        "OpenAI Game Master interviewer request completed.",
      );

      return result;
    } catch (error) {
      if (error instanceof GameMasterInterviewerError) {
        logProviderError(error, input, this.config.model, startedAt);
        throw error;
      }

      serverLogger.error(
        {
          event: APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_FAILED,
          flow: "ai_provider",
          operation: "game_master_interviewer.ask_next_question",
          result: "failure",
          userId: input.userId,
          adventureId: input.adventureId,
          model: this.config.model,
          providerErrorCategory: "request_failed",
          error: serializeProviderRequestErrorForLog(error),
          durationMs: Date.now() - startedAt,
        },
        "OpenAI Game Master interviewer request failed.",
      );

      throw new GameMasterInterviewerError(
        "provider_request_failed",
        "OpenAI Game Master interviewer request failed.",
        { cause: error },
      );
    }
  }

  private async loadInstructions(): Promise<string> {
    if (this.instructions !== undefined) {
      return this.instructions;
    }

    return readFile(this.promptPath, "utf8");
  }
}

function logAiPayloadDebug(
  operation: string,
  input: Pick<InterviewTurnRequest, "userId" | "adventureId">,
  payloadInfo: Readonly<{ direction: "request" | "response"; payload: unknown }>,
): void {
  const payloadPreview = serializeAiPayloadForLog(
    payloadInfo.payload,
    loadServerLoggingConfig(),
  );

  if (!payloadPreview.enabled) {
    return;
  }

  serverLogger.debug(
    {
      event: APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG,
      flow: "ai_provider",
      operation,
      result: "success",
      userId: input.userId,
      adventureId: input.adventureId,
      direction: payloadInfo.direction,
      payload: payloadPreview.payload,
    },
    "OpenAI Game Master interviewer payload preview.",
  );
}

function serializeProviderRequestErrorForLog(error: unknown) {
  return {
    ...serializeErrorForLog(error),
    message: "Provider request failed.",
  };
}

function logProviderError(
  error: GameMasterInterviewerError,
  input: Pick<InterviewTurnRequest, "userId" | "adventureId">,
  model: string,
  startedAt: number,
): void {
  if (error.code === "provider_output_invalid") {
    serverLogger.warn(
      {
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_OUTPUT_INVALID,
        flow: "ai_provider",
        operation: "game_master_interviewer.ask_next_question",
        result: "failure",
        userId: input.userId,
        adventureId: input.adventureId,
        model,
        providerErrorCode: error.code,
        providerErrorCategory: "invalid_output",
        error: serializeErrorForLog(error),
        durationMs: Date.now() - startedAt,
      },
      "OpenAI Game Master interviewer returned invalid output.",
    );

    return;
  }

  serverLogger.error(
    {
      event: APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_FAILED,
      flow: "ai_provider",
      operation: "game_master_interviewer.ask_next_question",
      result: "failure",
      userId: input.userId,
      adventureId: input.adventureId,
      model,
      providerErrorCode: error.code,
      providerErrorCategory: "request_failed",
      error: serializeProviderRequestErrorForLog(error),
      durationMs: Date.now() - startedAt,
    },
    "OpenAI Game Master interviewer request failed.",
  );
}

const INTERVIEW_TURN_RESULT_FORMAT = {
  type: "json_schema" as const,
  name: "rpgizer_interview_turn_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "messageToUser",
      "readinessStatus",
      "readinessConfirmation",
      "coveredSignals",
      "summaryDelta",
    ],
    properties: {
      messageToUser: { type: "string", minLength: 1 },
      readinessStatus: {
        type: "string",
        enum: INTERVIEW_READINESS_STATUSES,
      },
      readinessConfirmation: {
        type: "string",
        enum: INTERVIEW_READINESS_CONFIRMATIONS,
      },
      coveredSignals: {
        type: "object",
        additionalProperties: false,
        required: COVERED_SIGNAL_KEYS,
        properties: Object.fromEntries(
          COVERED_SIGNAL_KEYS.map((signal) => [signal, { type: "boolean" }]),
        ),
      },
      summaryDelta: { type: ["string", "null"] },
    },
  },
};

function buildResponseInput(input: InterviewTurnRequest): ResponseCreateParamsNonStreaming["input"] {
  return [
    {
      role: "user",
      content: JSON.stringify({
        adventureId: input.adventureId,
        goalText: input.goalText,
        readinessStatus: input.readinessStatus,
        interviewStatus: input.interviewStatus,
      }),
    },
    ...input.transcript.map(toOpenAIInputMessage),
  ];
}

function toOpenAIInputMessage(message: InterviewMessage) {
  return {
    role: message.role === "game_master" ? "assistant" as const : "user" as const,
    content: message.content,
  };
}

function parseInterviewTurnResponse(response: unknown): InterviewTurnResult {
  if (!isObject(response)) {
    throw invalidOutput("OpenAI response was not an object.");
  }

  if (response.status !== "completed") {
    throw invalidOutput("OpenAI response did not complete.");
  }

  if (hasProviderRefusal(response)) {
    throw invalidOutput("OpenAI response was refused.");
  }

  const outputText = response.output_text;
  if (typeof outputText !== "string" || outputText.trim().length === 0) {
    throw invalidOutput("OpenAI response did not include structured output text.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    throw invalidOutput("OpenAI structured output was not valid JSON.", error);
  }

  return validateInterviewTurnResult(parsed);
}

function validateInterviewTurnResult(value: unknown): InterviewTurnResult {
  if (!isObject(value)) {
    throw invalidOutput("Interview turn result was not an object.");
  }

  const messageToUser = value.messageToUser;
  if (typeof messageToUser !== "string" || messageToUser.trim().length === 0) {
    throw invalidOutput("Interview turn result missed messageToUser.");
  }

  const readinessStatus = value.readinessStatus;
  if (typeof readinessStatus !== "string" || !isInterviewReadinessStatus(readinessStatus)) {
    throw invalidOutput("Interview turn result had invalid readinessStatus.");
  }

  const readinessConfirmation = validateReadinessConfirmation(
    value.readinessConfirmation,
    readinessStatus,
  );
  const coveredSignals = validateCoveredSignals(value.coveredSignals);
  const summaryDelta = validateSummaryDelta(value.summaryDelta);

  return {
    messageToUser: messageToUser.trim(),
    readinessStatus,
    readinessConfirmation,
    coveredSignals,
    summaryDelta,
  };
}

function validateReadinessConfirmation(
  value: unknown,
  readinessStatus: InterviewTurnResult["readinessStatus"],
): InterviewTurnResult["readinessConfirmation"] {
  if (
    typeof value !== "string" ||
    !INTERVIEW_READINESS_CONFIRMATIONS.includes(
      value as InterviewTurnResult["readinessConfirmation"],
    )
  ) {
    throw invalidOutput("Interview turn result had invalid readinessConfirmation.");
  }

  if (value === "confirmed" && readinessStatus !== "ready_to_generate") {
    throw invalidOutput(
      "Interview turn result confirmed readiness without ready_to_generate status.",
    );
  }

  return value as InterviewTurnResult["readinessConfirmation"];
}

function validateCoveredSignals(value: unknown): CoveredSignalKey[] {
  if (!isObject(value)) {
    throw invalidOutput("Interview turn result had malformed coveredSignals.");
  }

  const unknownKeys = Object.keys(value).filter(
    (key) => !COVERED_SIGNAL_KEYS.includes(key as CoveredSignalKey),
  );
  if (unknownKeys.length > 0) {
    throw invalidOutput("Interview turn result had unknown coveredSignals.");
  }

  return COVERED_SIGNAL_KEYS.filter((signal) => {
    const isCovered = value[signal];
    if (typeof isCovered !== "boolean") {
      throw invalidOutput("Interview turn result had non-boolean coveredSignals.");
    }

    return isCovered;
  });
}

function validateSummaryDelta(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw invalidOutput("Interview turn result had invalid summaryDelta.");
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function hasProviderRefusal(response: Record<string, unknown>): boolean {
  const output = response.output;
  if (!Array.isArray(output)) {
    return false;
  }

  return output.some((item) => {
    if (!isObject(item) || !Array.isArray(item.content)) {
      return false;
    }

    return item.content.some(
      (contentPart) =>
        isObject(contentPart) &&
        (contentPart.type === "refusal" || typeof contentPart.refusal === "string"),
    );
  });
}

function invalidOutput(message: string, cause?: unknown): GameMasterInterviewerError {
  return new GameMasterInterviewerError("provider_output_invalid", message, { cause });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
