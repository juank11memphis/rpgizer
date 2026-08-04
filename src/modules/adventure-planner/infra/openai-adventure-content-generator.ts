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
import type { AdventureGeneratorRequest } from "../application/generate-adventure/ports";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import {
  parseGeneratedAdventureContent,
  type GeneratedAdventureContent,
} from "../domain/generated-adventure-content";
import {
  loadOpenAIAdventureContentConfig,
  type OpenAIGameMasterInterviewerConfig,
} from "../../game-master-assistant/infra/openai-game-master-interviewer-config";

const PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/adventure-planner/infra/prompts/generate-adventure-content.md",
);

const OPERATION = "generate_adventure_content";
const STEP = "content_generation";
const MAX_OUTPUT_TOKENS = 6_000;

type OpenAIResponsesClient = {
  responses: {
    create(params: ResponseCreateParamsNonStreaming): Promise<Response>;
  };
};

type OpenAIAdventureContentGeneratorOptions = {
  config?: OpenAIGameMasterInterviewerConfig;
  client?: OpenAIResponsesClient;
  instructions?: string;
  promptPath?: string;
};

export class OpenAIAdventureContentGenerator {
  private readonly config: OpenAIGameMasterInterviewerConfig;
  private readonly client: OpenAIResponsesClient;
  private readonly instructions?: string;
  private readonly promptPath: string;

  constructor(options: OpenAIAdventureContentGeneratorOptions = {}) {
    this.config = options.config ?? loadOpenAIAdventureContentGeneratorConfig();
    this.client = options.client ?? new OpenAI({ apiKey: this.config.apiKey });
    this.instructions = options.instructions;
    this.promptPath = options.promptPath ?? PROMPT_PATH;
  }

  async generateAdventureContent(
    input: AdventureGeneratorRequest,
  ): Promise<GeneratedAdventureContent> {
    const startedAt = Date.now();
    logStarted(input, this.config.model);

    try {
      const instructions = await this.loadInstructions();
      const request = buildOpenAIRequest(instructions, input, this.config.model);
      const response = await this.createResponse(request, input);
      const content = parseGeneratedAdventureContentResponse(response);

      logCompleted(input, this.config.model, startedAt, countGeneratedAdventureContent(content));

      return content;
    } catch (error) {
      if (error instanceof AdventureGeneratorError) {
        logProviderError(error, input, this.config.model, startedAt);
        throw error;
      }

      const normalizedError = new AdventureGeneratorError(
        "provider_request_failed",
        "OpenAI Adventure content generation request failed.",
        { cause: error },
      );
      logProviderError(normalizedError, input, this.config.model, startedAt);
      throw normalizedError;
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

export const GENERATED_ADVENTURE_CONTENT_FORMAT = {
  type: "json_schema" as const,
  name: "rpgizer_generated_adventure_content",
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
          mainQuests: nonEmptyArrayOf(contentQuestSchema()),
          sideQuests: nonEmptyArrayOf(contentQuestSchema()),
          bossFights: nonEmptyArrayOf(contentBossFightSchema()),
        },
      }),
    },
  },
};

function loadOpenAIAdventureContentGeneratorConfig(): OpenAIGameMasterInterviewerConfig {
  try {
    return loadOpenAIAdventureContentConfig();
  } catch (error) {
    throw new AdventureGeneratorError(
      "configuration_missing",
      "OPENAI_API_KEY is required to use the OpenAI Adventure content generator; OPENAI_ADVENTURE_CONTENT_MODEL overrides the default Adventure model when set.",
      { cause: error },
    );
  }
}

function buildOpenAIRequest(
  instructions: string,
  input: AdventureGeneratorRequest,
  model: string,
): ResponseCreateParamsNonStreaming {
  return {
    model,
    instructions,
    input: buildResponseInput(input),
    text: { format: GENERATED_ADVENTURE_CONTENT_FORMAT },
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

function parseGeneratedAdventureContentResponse(response: unknown): GeneratedAdventureContent {
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
    return parseGeneratedAdventureContent(parsed);
  } catch (error) {
    throw invalidOutput("OpenAI structured output was not valid unlinked Adventure content.", error);
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

function logStarted(input: AdventureGeneratorRequest, model: string): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_CONTENT_STARTED,
      flow: "ai_provider",
      operation: OPERATION,
      result: "started",
      userId: input.userId,
      adventureId: input.adventureId,
      artifactId: input.interviewOutputArtifactId,
      model,
      step: STEP,
    },
    "OpenAI Adventure content generation request started.",
  );
}

function logCompleted(
  input: AdventureGeneratorRequest,
  model: string,
  startedAt: number,
  counts: GeneratedAdventureContentCounts,
): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_CONTENT_COMPLETED,
      flow: "ai_provider",
      operation: OPERATION,
      result: "success",
      userId: input.userId,
      adventureId: input.adventureId,
      artifactId: input.interviewOutputArtifactId,
      model,
      step: STEP,
      durationMs: Date.now() - startedAt,
      ...counts,
    },
    "OpenAI Adventure content generation request completed.",
  );
}

function logProviderError(
  error: AdventureGeneratorError,
  input: AdventureGeneratorRequest,
  model: string,
  startedAt: number,
): void {
  const payload = {
    event:
      error.code === "provider_output_invalid"
        ? APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_CONTENT_INVALID
        : APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_CONTENT_FAILED,
    flow: "ai_provider",
    operation: OPERATION,
    result: "failure",
    userId: input.userId,
    adventureId: input.adventureId,
    artifactId: input.interviewOutputArtifactId,
    model,
    step: STEP,
    providerErrorCode: error.code,
    providerErrorCategory: error.code === "provider_output_invalid" ? "invalid_output" : "request_failed",
    error:
      error.code === "provider_output_invalid"
        ? serializeErrorForLog(error)
        : serializeProviderRequestErrorForLog(error),
    durationMs: Date.now() - startedAt,
  };

  if (error.code === "provider_output_invalid") {
    serverLogger.warn(payload, "OpenAI Adventure content generation returned invalid output.");
    return;
  }

  serverLogger.error(payload, "OpenAI Adventure content generation request failed.");
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
      step: STEP,
      direction: payloadInfo.direction,
      payload: payloadPreview.payload,
    },
    "OpenAI Adventure content generation payload preview.",
  );
}

function serializeProviderRequestErrorForLog(error: unknown) {
  return {
    ...serializeErrorForLog(error),
    message: "Provider request failed.",
  };
}

type GeneratedAdventureContentCounts = ReturnType<typeof countGeneratedAdventureContent>;

function countGeneratedAdventureContent(content: GeneratedAdventureContent) {
  return {
    actCount: content.acts.length,
    questCount: content.acts.reduce(
      (count, act) => count + act.mainQuests.length + act.sideQuests.length,
      0,
    ),
    bossFightCount: content.acts.reduce((count, act) => count + act.bossFights.length, 0),
    skillCount: content.skills.length,
    inventoryItemCount: content.inventoryItems.length,
    achievementCount: content.achievements.length,
    focusedNextActionCount: content.focusedNextActions.length,
  };
}

function contentQuestSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["key", "title", "description", "doneCondition", "rewardIntent", "steps"],
    properties: {
      key: keySchema(),
      title: nonEmptyStringSchema(),
      description: nonEmptyStringSchema("Real-world action, context, and why it matters."),
      steps: questStepsSchema(),
      doneCondition: nonEmptyStringSchema(
        "Full verifiable evidence sentence proving completion; not a title, imperative command, or feeling-only phrase.",
      ),
      rewardIntent: nonEmptyStringSchema(
        "Why completion should later be linked to relevant real-world skill growth; do not include reward amounts or skill keys.",
      ),
    },
  };
}

function contentBossFightSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["key", "title", "description", "doneCondition", "rewardIntent"],
    properties: {
      key: keySchema(),
      title: nonEmptyStringSchema(),
      description: nonEmptyStringSchema("Real-world challenge, stakes, and why it matters."),
      doneCondition: nonEmptyStringSchema(
        "Full verifiable evidence sentence proving completion; not a title, imperative command, or feeling-only phrase.",
      ),
      rewardIntent: nonEmptyStringSchema(
        "Why completion should later be linked to relevant real-world skill growth; do not include reward amounts or skill keys.",
      ),
    },
  };
}

function questStepsSchema() {
  return {
    type: "array",
    minItems: 2,
    maxItems: 7,
    items: {
      type: "object",
      additionalProperties: false,
      required: ["key", "description"],
      properties: {
        key: keySchema(),
        description: nonEmptyStringSchema(
          "Concrete Quest-specific user action, decision, check, or artifact; avoid generic filler.",
        ),
      },
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
