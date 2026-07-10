import { readFile } from "node:fs/promises";
import path from "node:path";

import OpenAI from "openai";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";

import { loadServerLoggingConfig } from "../../../server/logging/config";
import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { serverLogger } from "../../../server/logging/logger";
import { serializeAiPayloadForLog, serializeErrorForLog } from "../../../server/logging/redaction";
import type {
  AdventureGenerator,
  AdventureGeneratorRequest,
} from "../application/generate-adventure/ports";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import {
  parseGeneratedAdventure,
  type GeneratedAdventure,
} from "../domain/generated-adventure";
import {
  loadOpenAIAdventureGenerationConfig,
  type OpenAIGameMasterInterviewerConfig,
} from "../../game-master-assistant/infra/openai-game-master-interviewer-config";

const PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/adventure-planner/infra/prompts/generate-adventure.md",
);

const OPERATION = "generate_adventure";
const MAX_OUTPUT_TOKENS = 6_000;
const MAX_REPAIR_OUTPUT_PREVIEW_CHARS = 16_000;

type OpenAIResponsesClient = {
  responses: {
    create(params: ResponseCreateParamsNonStreaming): Promise<Response>;
  };
};

type OpenAIAdventureGeneratorOptions = {
  config?: OpenAIGameMasterInterviewerConfig;
  client?: OpenAIResponsesClient;
  instructions?: string;
  promptPath?: string;
};

export class OpenAIAdventureGenerator implements AdventureGenerator {
  private readonly config: OpenAIGameMasterInterviewerConfig;
  private readonly client: OpenAIResponsesClient;
  private readonly instructions?: string;
  private readonly promptPath: string;

  constructor(options: OpenAIAdventureGeneratorOptions = {}) {
    this.config = options.config ?? loadOpenAIAdventureGeneratorConfig();
    this.client = options.client ?? new OpenAI({ apiKey: this.config.apiKey });
    this.instructions = options.instructions;
    this.promptPath = options.promptPath ?? PROMPT_PATH;
  }

  async generateAdventure(input: AdventureGeneratorRequest): Promise<GeneratedAdventure> {
    const startedAt = Date.now();

    serverLogger.info(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_PROVIDER_STARTED,
        flow: "ai_provider",
        operation: OPERATION,
        result: "started",
        userId: input.userId,
        adventureId: input.adventureId,
        artifactId: input.interviewOutputArtifactId,
        model: this.config.model,
      },
      "OpenAI Adventure generation request started.",
    );

    try {
      const instructions = await this.loadInstructions();
      const request = buildOpenAIRequest(instructions, input, buildResponseInput(input), this.config.model);
      const response = await this.createResponse(request, input);
      const adventure = await this.parseOrRepairGeneratedAdventure(response, request, input);
      const counts = countGeneratedAdventureContent(adventure);

      serverLogger.info(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_PROVIDER_COMPLETED,
          flow: "ai_provider",
          operation: OPERATION,
          result: "success",
          userId: input.userId,
          adventureId: input.adventureId,
          artifactId: input.interviewOutputArtifactId,
          model: this.config.model,
          durationMs: Date.now() - startedAt,
          ...counts,
        },
        "OpenAI Adventure generation request completed.",
      );

      return adventure;
    } catch (error) {
      if (error instanceof AdventureGeneratorError) {
        logProviderError(error, input, this.config.model, startedAt);
        throw error;
      }

      serverLogger.error(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_PROVIDER_FAILED,
          flow: "ai_provider",
          operation: OPERATION,
          result: "failure",
          userId: input.userId,
          adventureId: input.adventureId,
          artifactId: input.interviewOutputArtifactId,
          model: this.config.model,
          providerErrorCategory: "request_failed",
          error: serializeProviderRequestErrorForLog(error),
          durationMs: Date.now() - startedAt,
        },
        "OpenAI Adventure generation request failed.",
      );

      throw new AdventureGeneratorError(
        "provider_request_failed",
        "OpenAI Adventure generation request failed.",
        { cause: error },
      );
    }
  }

  private async parseOrRepairGeneratedAdventure(
    response: Response,
    originalRequest: ResponseCreateParamsNonStreaming,
    input: AdventureGeneratorRequest,
  ): Promise<GeneratedAdventure> {
    try {
      return parseGeneratedAdventureResponse(response);
    } catch (error) {
      if (!shouldRetryInvalidOutput(error)) {
        throw error;
      }

      logProviderRepairAttempt(error, input, this.config.model);

      const repairRequest = buildOpenAIRequest(
        originalRequest.instructions ?? "",
        input,
        buildRepairResponseInput(originalRequest.input, response, error),
        this.config.model,
      );
      const repairedResponse = await this.createResponse(repairRequest, input);
      return parseGeneratedAdventureResponse(repairedResponse);
    }
  }

  private async createResponse(
    request: ResponseCreateParamsNonStreaming,
    input: AdventureGeneratorRequest,
  ): Promise<Response> {
    logAiPayloadDebug(input, { direction: "request", payload: request });
    const response = await this.client.responses.create(request);
    logAiPayloadDebug(input, { direction: "response", payload: response });
    return response;
  }

  private async loadInstructions(): Promise<string> {
    if (this.instructions !== undefined) {
      return this.instructions;
    }

    return readFile(this.promptPath, "utf8");
  }
}

export const GENERATED_ADVENTURE_FORMAT = {
  type: "json_schema" as const,
  name: "rpgizer_generated_adventure",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "themeSummary",
      "goalSummary",
      "safetyNotes",
      "acts",
      "skills",
      "inventoryItems",
      "achievements",
      "focusedNextActions",
    ],
    properties: {
      title: nonEmptyStringSchema(),
      themeSummary: nonEmptyStringSchema(),
      goalSummary: nonEmptyStringSchema(),
      safetyNotes: arrayOf(nonEmptyStringSchema()),
      skills: nonEmptyArrayOf({
        type: "object",
        additionalProperties: false,
        required: ["key", "name", "description"],
        properties: {
          key: keySchema(),
          name: nonEmptyStringSchema(),
          description: nonEmptyStringSchema(
            "Verb-based real-world capability the user can improve; not a decorative RPG stat.",
          ),
        },
      }),
      inventoryItems: nonEmptyArrayOf({
        type: "object",
        additionalProperties: false,
        required: ["key", "name", "purpose"],
        properties: {
          key: keySchema(),
          name: nonEmptyStringSchema(),
          purpose: nonEmptyStringSchema(
            "How this practical readiness item, tool, resource, routine, or setup will be used in the real world.",
          ),
        },
      }),
      achievements: nonEmptyArrayOf({
        type: "object",
        additionalProperties: false,
        required: ["key", "name", "description", "unlockCondition"],
        properties: {
          key: keySchema(),
          name: nonEmptyStringSchema(),
          description: nonEmptyStringSchema(),
          unlockCondition: nonEmptyStringSchema(
            "Concrete unlock condition using observable evidence, for example: Unlocked when five testers complete the prototype and feedback is recorded.",
          ),
        },
      }),
      focusedNextActions: nonEmptyArrayOf({
        type: "object",
        additionalProperties: false,
        required: ["title", "description"],
        properties: {
          title: nonEmptyStringSchema(),
          description: nonEmptyStringSchema(
            "Small immediate next action with a concrete verb and object; avoid vague start/begin/progress language.",
          ),
        },
      }),
      acts: nonEmptyArrayOf({
        type: "object",
        additionalProperties: false,
        required: ["key", "title", "summary", "mainQuests", "sideQuests", "bossFights"],
        properties: {
          key: keySchema(),
          title: nonEmptyStringSchema(),
          summary: nonEmptyStringSchema(),
          mainQuests: nonEmptyArrayOf(questSchema()),
          sideQuests: nonEmptyArrayOf(questSchema()),
          bossFights: nonEmptyArrayOf(bossFightSchema()),
        },
      }),
    },
  },
};

function loadOpenAIAdventureGeneratorConfig(): OpenAIGameMasterInterviewerConfig {
  try {
    return loadOpenAIAdventureGenerationConfig();
  } catch (error) {
    throw new AdventureGeneratorError(
      "configuration_missing",
      "OPENAI_API_KEY is required to use the OpenAI Adventure generator; OPENAI_ADVENTURE_GENERATION_MODEL overrides the default model when set.",
      { cause: error },
    );
  }
}

function buildOpenAIRequest(
  instructions: string,
  input: AdventureGeneratorRequest,
  responseInput: ResponseCreateParamsNonStreaming["input"],
  model: string,
): ResponseCreateParamsNonStreaming {
  return {
    model,
    instructions,
    input: responseInput,
    text: { format: GENERATED_ADVENTURE_FORMAT },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    safety_identifier: input.userId.slice(0, 64),
  };
}

function buildResponseInput(
  input: AdventureGeneratorRequest,
): ResponseCreateParamsNonStreaming["input"] {
  return [
    {
      role: "user",
      content: JSON.stringify({
        adventureId: input.adventureId,
        goalText: input.goalText,
        interviewOutputArtifactId: input.interviewOutputArtifactId,
        interviewOutputArtifact: input.interviewOutputArtifact,
      }),
    },
    ...input.transcript.map(toOpenAIInputMessage),
  ];
}

function toOpenAIInputMessage(message: AdventureGeneratorRequest["transcript"][number]) {
  return {
    role: message.role === "game_master" ? ("assistant" as const) : ("user" as const),
    content: message.content,
  };
}

function buildRepairResponseInput(
  originalInput: ResponseCreateParamsNonStreaming["input"] | undefined,
  response: Response,
  error: AdventureGeneratorError,
): ResponseCreateParamsNonStreaming["input"] {
  const priorOutput = typeof response.output_text === "string" ? response.output_text : "";
  const truncatedOutput = priorOutput.slice(0, MAX_REPAIR_OUTPUT_PREVIEW_CHARS);
  const causeMessage = error.cause instanceof Error ? error.cause.message : error.message;

  return [
    ...asResponseInputArray(originalInput),
    {
      role: "user",
      content: [
        "Your previous JSON failed RPGizer validation.",
        `Validation error: ${causeMessage}`,
        "Return corrected JSON only, matching the same schema.",
        "Every skillRewards.skillKey must match an existing top-level skills[].key.",
        "Every inventoryItemKeys entry must match an existing top-level inventoryItems[].key.",
        "Do not add commentary or markdown.",
        `Previous JSON: ${truncatedOutput}`,
      ].join("\n"),
    },
  ];
}

function asResponseInputArray(
  input: ResponseCreateParamsNonStreaming["input"] | undefined,
): Exclude<NonNullable<ResponseCreateParamsNonStreaming["input"]>, string> {
  if (input === undefined) {
    return [];
  }

  if (typeof input === "string") {
    return [{ role: "user", content: input }];
  }

  return input;
}

function shouldRetryInvalidOutput(error: unknown): error is AdventureGeneratorError {
  if (!(error instanceof AdventureGeneratorError) || error.code !== "provider_output_invalid") {
    return false;
  }

  if (!(error.cause instanceof Error)) {
    return false;
  }

  return /references unknown|duplicate key/iu.test(error.cause.message);
}

function parseGeneratedAdventureResponse(response: unknown): GeneratedAdventure {
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
    return parseGeneratedAdventure(parsed);
  } catch (error) {
    throw invalidOutput("OpenAI structured output was not a valid generated Adventure.", error);
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

function invalidOutput(message: string, cause?: unknown): AdventureGeneratorError {
  return new AdventureGeneratorError("provider_output_invalid", message, { cause });
}

function logProviderRepairAttempt(
  error: AdventureGeneratorError,
  input: AdventureGeneratorRequest,
  model: string,
): void {
  serverLogger.warn(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_OUTPUT_INVALID,
      flow: "ai_provider",
      operation: OPERATION,
      result: "retrying",
      userId: input.userId,
      adventureId: input.adventureId,
      artifactId: input.interviewOutputArtifactId,
      model,
      providerErrorCode: error.code,
      providerErrorCategory: "invalid_output",
      error: serializeErrorForLog(error),
    },
    "OpenAI Adventure generation returned invalid output; retrying with repair instructions.",
  );
}

function logProviderError(
  error: AdventureGeneratorError,
  input: AdventureGeneratorRequest,
  model: string,
  startedAt: number,
): void {
  if (error.code === "provider_output_invalid") {
    serverLogger.warn(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_OUTPUT_INVALID,
        flow: "ai_provider",
        operation: OPERATION,
        result: "failure",
        userId: input.userId,
        adventureId: input.adventureId,
        artifactId: input.interviewOutputArtifactId,
        model,
        providerErrorCode: error.code,
        providerErrorCategory: "invalid_output",
        error: serializeErrorForLog(error),
        durationMs: Date.now() - startedAt,
      },
      "OpenAI Adventure generation returned invalid output.",
    );

    return;
  }

  serverLogger.error(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_PROVIDER_FAILED,
      flow: "ai_provider",
      operation: OPERATION,
      result: "failure",
      userId: input.userId,
      adventureId: input.adventureId,
      artifactId: input.interviewOutputArtifactId,
      model,
      providerErrorCode: error.code,
      providerErrorCategory: "request_failed",
      error: serializeProviderRequestErrorForLog(error),
      durationMs: Date.now() - startedAt,
    },
    "OpenAI Adventure generation request failed.",
  );
}

function logAiPayloadDebug(
  input: Pick<AdventureGeneratorRequest, "userId" | "adventureId">,
  payloadInfo: Readonly<{ direction: "request" | "response"; payload: unknown }>,
): void {
  const payloadPreview = serializeAiPayloadForLog(payloadInfo.payload, loadServerLoggingConfig());

  if (!payloadPreview.enabled) {
    return;
  }

  serverLogger.debug(
    {
      event: APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG,
      flow: "ai_provider",
      operation: OPERATION,
      result: "success",
      userId: input.userId,
      adventureId: input.adventureId,
      direction: payloadInfo.direction,
      payload: payloadPreview.payload,
    },
    "OpenAI Adventure generation payload preview.",
  );
}

function serializeProviderRequestErrorForLog(error: unknown) {
  return {
    ...serializeErrorForLog(error),
    message: "Provider request failed.",
  };
}

function countGeneratedAdventureContent(adventure: GeneratedAdventure) {
  return {
    actCount: adventure.acts.length,
    questCount: adventure.acts.reduce(
      (count, act) => count + act.mainQuests.length + act.sideQuests.length,
      0,
    ),
    bossFightCount: adventure.acts.reduce((count, act) => count + act.bossFights.length, 0),
    skillCount: adventure.skills.length,
    inventoryItemCount: adventure.inventoryItems.length,
    achievementCount: adventure.achievements.length,
  };
}

function questSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "key",
      "title",
      "description",
      "doneCondition",
      "rewardIntent",
      "skillRewards",
      "inventoryItemKeys",
    ],
    properties: {
      key: keySchema(),
      title: nonEmptyStringSchema(),
      description: nonEmptyStringSchema("Real-world action, context, and why it matters."),
      doneCondition: nonEmptyStringSchema(
        "Full verifiable evidence sentence proving completion; not a title, imperative command, or feeling-only phrase. Good: The due-date calendar contains every account, due date, and minimum payment. Bad: Build the Due-Date Calendar.",
      ),
      rewardIntent: nonEmptyStringSchema("Why completion builds the referenced real-world skill rewards."),
      skillRewards: nonEmptyArrayOf(skillRewardSchema()),
      inventoryItemKeys: nonEmptyArrayOf(keySchema()),
    },
  };
}

function bossFightSchema() {
  return questSchema();
}

function skillRewardSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["skillKey", "xp"],
    properties: {
      skillKey: keySchema(),
      xp: { type: "integer", minimum: 1 },
    },
  };
}

function nonEmptyArrayOf(items: Record<string, unknown>) {
  return {
    type: "array",
    minItems: 1,
    items,
  };
}

function arrayOf(items: Record<string, unknown>) {
  return {
    type: "array",
    items,
  };
}

function keySchema() {
  return {
    type: "string",
    minLength: 1,
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
  };
}

function nonEmptyStringSchema(description?: string) {
  return description === undefined
    ? { type: "string", minLength: 1 }
    : { type: "string", minLength: 1, description };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
