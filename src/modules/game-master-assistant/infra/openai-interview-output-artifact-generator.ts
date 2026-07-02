import { readFile } from "node:fs/promises";
import path from "node:path";

import OpenAI from "openai";
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
  loadOpenAIGameMasterInterviewerConfig,
  type OpenAIGameMasterInterviewerConfig,
} from "./openai-game-master-interviewer-config";

const PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/game-master-assistant/infra/prompts/interview-output-artifact.md",
);

const ARTIFACT_TEXT_FIELDS = [
  "goalSummary",
  "coreWhy",
  "successDefinition",
  "currentStage",
  "compactSourceSummary",
] as const;

const ARTIFACT_ARRAY_FIELDS = [
  "blockers",
  "constraints",
  "existingResources",
  "likelyMissingResources",
  "safetyBoundaries",
  "preferences",
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
    this.config = options.config ?? loadOpenAIGameMasterInterviewerConfig();
    this.client = options.client ?? new OpenAI({ apiKey: this.config.apiKey });
    this.instructions = options.instructions;
    this.promptPath = options.promptPath ?? PROMPT_PATH;
  }

  async generateArtifact(
    input: InterviewOutputArtifactGenerationRequest,
  ): Promise<InterviewOutputArtifact> {
    try {
      const instructions = await this.loadInstructions();
      const response = await this.client.responses.create({
        model: this.config.model,
        instructions,
        input: buildResponseInput(input),
        text: { format: INTERVIEW_OUTPUT_ARTIFACT_FORMAT },
        max_output_tokens: 1200,
        store: false,
        safety_identifier: input.userId.slice(0, 64),
      });

      return parseInterviewOutputArtifactResponse(response);
    } catch (error) {
      if (error instanceof GameMasterInterviewerError) {
        throw error;
      }

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
