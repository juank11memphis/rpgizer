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
  InterviewOutputArtifactGenerationRequest,
  InterviewOutputArtifactGenerator,
} from "../application/generate-interview-output-artifact/ports";
import { GameMasterInterviewerError } from "../application/start-adventure-interview/provider-error";
import {
  parseInterviewOutputArtifact,
  type InterviewOutputArtifact,
} from "../domain/interview-output-artifact";
import type { InterviewMessage } from "../domain/interview-message";
import {
  loadOpenAIInterviewSummaryConfig,
  type OpenAIGameMasterInterviewerConfig,
} from "./openai-game-master-interviewer-config";

const PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/game-master-assistant/infra/prompts/interview-output-artifact.md",
);

const ARTIFACT_TEXT_FIELDS = [
  "goalSummary",
  "goalType",
  "coreWhy",
  "successDefinition",
  "currentStage",
  "currentSkillOrBaseline",
  "firstMilestoneReadiness",
  "compactSourceSummary",
] as const;

const ARTIFACT_ARRAY_FIELDS = [
  "motivationDetails",
  "blockers",
  "constraints",
  "existingResources",
  "likelyMissingResources",
  "missingResources",
  "safetyBoundaries",
  "preferences",
  "dislikesOrAvoidances",
  "priorAttempts",
  "confidenceGaps",
  "examplesOrInspirations",
] as const;

type OpenAIResponsesClient = {
  responses: {
    create(params: ResponseCreateParamsNonStreaming): Promise<Response>;
  };
};

type OpenAIInterviewOutputArtifactGeneratorOptions = {
  config?: OpenAIGameMasterInterviewerConfig;
  client?: OpenAIResponsesClient;
  instructions?: string;
  promptPath?: string;
};

export class OpenAIInterviewOutputArtifactGenerator implements InterviewOutputArtifactGenerator {
  private readonly config: OpenAIGameMasterInterviewerConfig;
  private readonly client: OpenAIResponsesClient;
  private readonly instructions?: string;
  private readonly promptPath: string;

  constructor(options: OpenAIInterviewOutputArtifactGeneratorOptions = {}) {
    this.config = options.config ?? loadOpenAIInterviewSummaryConfig();
    this.client = options.client ?? new OpenAI({ apiKey: this.config.apiKey });
    this.instructions = options.instructions;
    this.promptPath = options.promptPath ?? PROMPT_PATH;
  }

  async generateArtifact(
    input: InterviewOutputArtifactGenerationRequest,
  ): Promise<InterviewOutputArtifact> {
    const startedAt = Date.now();

    try {
      const instructions = await this.loadInstructions();
      const request = {
        model: this.config.model,
        instructions,
        input: buildResponseInput(input),
        text: { format: INTERVIEW_OUTPUT_ARTIFACT_FORMAT },
        max_output_tokens: 1800,
        store: false,
        safety_identifier: input.userId.slice(0, 64),
      } satisfies ResponseCreateParamsNonStreaming;

      logAiPayloadDebug("interview_output_artifact.generate", input, {
        direction: "request",
        payload: request,
      });

      const response = await this.client.responses.create(request);

      logAiPayloadDebug("interview_output_artifact.generate", input, {
        direction: "response",
        payload: response,
      });

      const artifact = parseInterviewOutputArtifactResponse(response);

      serverLogger.info(
        {
          event: APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_COMPLETED,
          flow: "ai_provider",
          operation: "interview_output_artifact.generate",
          result: "success",
          userId: input.userId,
          adventureId: input.adventureId,
          model: this.config.model,
          durationMs: Date.now() - startedAt,
        },
        "OpenAI interview output artifact request completed.",
      );

      return artifact;
    } catch (error) {
      if (error instanceof GameMasterInterviewerError) {
        logProviderError(error, input, this.config.model, startedAt);
        throw error;
      }

      serverLogger.error(
        {
          event: APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_FAILED,
          flow: "ai_provider",
          operation: "interview_output_artifact.generate",
          result: "failure",
          userId: input.userId,
          adventureId: input.adventureId,
          model: this.config.model,
          providerErrorCategory: "request_failed",
          error: serializeProviderRequestErrorForLog(error),
          durationMs: Date.now() - startedAt,
        },
        "OpenAI interview output artifact request failed.",
      );

      throw new GameMasterInterviewerError(
        "provider_request_failed",
        "OpenAI interview output artifact request failed.",
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
  input: Pick<InterviewOutputArtifactGenerationRequest, "userId" | "adventureId">,
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
    "OpenAI interview output artifact payload preview.",
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
  input: Pick<InterviewOutputArtifactGenerationRequest, "userId" | "adventureId">,
  model: string,
  startedAt: number,
): void {
  if (error.code === "provider_output_invalid") {
    serverLogger.warn(
      {
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_OUTPUT_INVALID,
        flow: "ai_provider",
        operation: "interview_output_artifact.generate",
        result: "failure",
        userId: input.userId,
        adventureId: input.adventureId,
        model,
        providerErrorCode: error.code,
        providerErrorCategory: "invalid_output",
        error: serializeErrorForLog(error),
        durationMs: Date.now() - startedAt,
      },
      "OpenAI interview output artifact returned invalid output.",
    );

    return;
  }

  serverLogger.error(
    {
      event: APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_FAILED,
      flow: "ai_provider",
      operation: "interview_output_artifact.generate",
      result: "failure",
      userId: input.userId,
      adventureId: input.adventureId,
      model,
      providerErrorCode: error.code,
      providerErrorCategory: "request_failed",
      error: serializeProviderRequestErrorForLog(error),
      durationMs: Date.now() - startedAt,
    },
    "OpenAI interview output artifact request failed.",
  );
}

const INTERVIEW_OUTPUT_ARTIFACT_FORMAT = {
  type: "json_schema" as const,
  name: "rpgizer_interview_output_artifact",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [...ARTIFACT_TEXT_FIELDS, ...ARTIFACT_ARRAY_FIELDS],
    properties: {
      ...Object.fromEntries(
        ARTIFACT_TEXT_FIELDS.map((field) => [field, { type: "string", minLength: 1 }]),
      ),
      ...Object.fromEntries(
        ARTIFACT_ARRAY_FIELDS.map((field) => [
          field,
          {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 },
          },
        ]),
      ),
    },
  },
};

function buildResponseInput(
  input: InterviewOutputArtifactGenerationRequest,
): ResponseCreateParamsNonStreaming["input"] {
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
    role: message.role === "game_master" ? ("assistant" as const) : ("user" as const),
    content: message.content,
  };
}

function parseInterviewOutputArtifactResponse(response: unknown): InterviewOutputArtifact {
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

  try {
    return parseInterviewOutputArtifact(parsed);
  } catch (error) {
    throw invalidOutput("OpenAI structured output was not a valid interview artifact.", error);
  }
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
