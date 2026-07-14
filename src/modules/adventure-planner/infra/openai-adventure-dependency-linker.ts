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
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import type { GeneratedAdventureContent } from "../domain/generated-adventure-content";
import {
  parseGeneratedAdventureDependencyLinks,
  type GeneratedAdventureDependencyLinks,
} from "../domain/generated-adventure-dependencies";
import {
  loadOpenAIAdventureDependencyLinkerConfig,
  type OpenAIGameMasterInterviewerConfig,
} from "../../game-master-assistant/infra/openai-game-master-interviewer-config";

const PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/adventure-planner/infra/prompts/link-adventure-dependencies.md",
);

const OPERATION = "link_adventure_dependencies";
const STEP = "dependency_linking";
const MAX_OUTPUT_TOKENS = 2_000;
const MAX_INVALID_OUTPUT_ATTEMPTS = 2;

type OpenAIResponsesClient = {
  responses: {
    create(params: ResponseCreateParamsNonStreaming): Promise<Response>;
  };
};

type OpenAIAdventureDependencyLinkerOptions = {
  config?: OpenAIGameMasterInterviewerConfig;
  client?: OpenAIResponsesClient;
  instructions?: string;
  promptPath?: string;
};

export type AdventureDependencyLinkingContext = {
  userId?: string;
  adventureId?: string;
};

export class OpenAIAdventureDependencyLinker {
  private readonly config: OpenAIGameMasterInterviewerConfig;
  private readonly client: OpenAIResponsesClient;
  private readonly instructions?: string;
  private readonly promptPath: string;

  constructor(options: OpenAIAdventureDependencyLinkerOptions = {}) {
    this.config = options.config ?? loadOpenAIAdventureDependencyLinkerProviderConfig();
    this.client = options.client ?? new OpenAI({ apiKey: this.config.apiKey });
    this.instructions = options.instructions;
    this.promptPath = options.promptPath ?? PROMPT_PATH;
  }

  async linkAdventureDependencies(
    content: GeneratedAdventureContent,
    context: AdventureDependencyLinkingContext = {},
  ): Promise<GeneratedAdventureDependencyLinks> {
    const startedAt = Date.now();
    logStarted(context, this.config.model, countLinkingInput(content));

    try {
      const instructions = await this.loadInstructions();
      const request = buildOpenAIRequest(instructions, content, this.config.model, context.userId);
      const links = await this.createValidDependencyLinks(request, content, context, startedAt);

      logCompleted(context, this.config.model, startedAt, {
        ...countLinkingInput(content),
        ...countLinks(links),
      });

      return links;
    } catch (error) {
      if (error instanceof AdventureGeneratorError) {
        logProviderError(error, context, this.config.model, startedAt);
        throw error;
      }

      const normalizedError = new AdventureGeneratorError(
        "provider_request_failed",
        "OpenAI Adventure dependency linking request failed.",
        { cause: error },
      );
      logProviderError(normalizedError, context, this.config.model, startedAt);
      throw normalizedError;
    }
  }

  private async createResponse(
    request: ResponseCreateParamsNonStreaming,
    context: AdventureDependencyLinkingContext,
  ): Promise<Response> {
    logAiPayloadDebug(context, { direction: "request", payload: request });
    const response = await this.client.responses.create(request);
    logAiPayloadDebug(context, { direction: "response", payload: response });
    return response;
  }

  private async createValidDependencyLinks(
    request: ResponseCreateParamsNonStreaming,
    content: GeneratedAdventureContent,
    context: AdventureDependencyLinkingContext,
    startedAt: number,
  ): Promise<GeneratedAdventureDependencyLinks> {
    let lastInvalidOutputError: AdventureGeneratorError | null = null;

    for (let attempt = 1; attempt <= MAX_INVALID_OUTPUT_ATTEMPTS; attempt += 1) {
      const response = await this.createResponse(request, context);

      try {
        return parseGeneratedAdventureDependencyLinksResponse(response, content);
      } catch (error) {
        if (!(error instanceof AdventureGeneratorError) || error.code !== "provider_output_invalid") {
          throw error;
        }

        lastInvalidOutputError = error;
        if (attempt >= MAX_INVALID_OUTPUT_ATTEMPTS) {
          break;
        }

        logInvalidOutputRetry(error, context, this.config.model, startedAt, attempt);
      }
    }

    throw lastInvalidOutputError ?? invalidOutput("OpenAI structured output was not valid Adventure dependency links.");
  }

  private async loadInstructions(): Promise<string> {
    if (this.instructions !== undefined) {
      return this.instructions;
    }

    return readFile(this.promptPath, "utf8");
  }
}

export const GENERATED_ADVENTURE_DEPENDENCY_LINKS_FORMAT = {
  type: "json_schema" as const,
  name: "rpgizer_generated_adventure_dependency_links",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["questLinks", "bossFightLinks"],
    properties: {
      questLinks: arrayOf({
        type: "object",
        additionalProperties: false,
        required: ["questKey", "skillKeys", "inventoryItemKeys"],
        properties: {
          questKey: keySchema(),
          skillKeys: nonEmptyArrayOf(keySchema()),
          inventoryItemKeys: arrayOf(keySchema()),
        },
      }),
      bossFightLinks: arrayOf({
        type: "object",
        additionalProperties: false,
        required: ["bossFightKey", "skillKeys", "inventoryItemKeys"],
        properties: {
          bossFightKey: keySchema(),
          skillKeys: nonEmptyArrayOf(keySchema()),
          inventoryItemKeys: arrayOf(keySchema()),
        },
      }),
    },
  },
};

function loadOpenAIAdventureDependencyLinkerProviderConfig(): OpenAIGameMasterInterviewerConfig {
  try {
    return loadOpenAIAdventureDependencyLinkerConfig();
  } catch (error) {
    throw new AdventureGeneratorError(
      "configuration_missing",
      "OPENAI_API_KEY is required to use the OpenAI Adventure dependency linker; OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL overrides the default Adventure model when set.",
      { cause: error },
    );
  }
}

function buildOpenAIRequest(
  instructions: string,
  content: GeneratedAdventureContent,
  model: string,
  userId?: string,
): ResponseCreateParamsNonStreaming {
  return {
    model,
    instructions,
    input: [
      {
        role: "user",
        content: JSON.stringify(buildDependencyLinkingInput(content)),
      },
    ],
    text: { format: GENERATED_ADVENTURE_DEPENDENCY_LINKS_FORMAT },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    ...(userId !== undefined ? { safety_identifier: userId.slice(0, 64) } : {}),
  };
}

function buildDependencyLinkingInput(content: GeneratedAdventureContent) {
  return {
    title: content.title,
    goalSummary: content.goalSummary,
    skills: content.skills.map(({ key, name, description }) => ({ key, name, description })),
    inventoryItems: content.inventoryItems.map(({ key, name, purpose }) => ({ key, name, purpose })),
    quests: content.acts.flatMap((act) => [
      ...act.mainQuests.map((quest) => ({ actKey: act.key, questType: quest.type, ...linkableQuest(quest) })),
      ...act.sideQuests.map((quest) => ({ actKey: act.key, questType: quest.type, ...linkableQuest(quest) })),
    ]),
    bossFights: content.acts.flatMap((act) =>
      act.bossFights.map((bossFight) => ({ actKey: act.key, ...linkableQuest(bossFight) })),
    ),
  };
}

function linkableQuest(
  quest: Pick<
    GeneratedAdventureContent["acts"][number]["mainQuests"][number],
    "key" | "title" | "description" | "doneCondition" | "rewardIntent"
  >,
) {
  return {
    key: quest.key,
    title: quest.title,
    description: quest.description,
    doneCondition: quest.doneCondition,
    rewardIntent: quest.rewardIntent,
  };
}

function parseGeneratedAdventureDependencyLinksResponse(
  response: unknown,
  content: GeneratedAdventureContent,
): GeneratedAdventureDependencyLinks {
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
    return parseGeneratedAdventureDependencyLinks(parsed, content);
  } catch (error) {
    throw invalidOutput("OpenAI structured output was not valid Adventure dependency links.", error);
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

function logStarted(
  context: AdventureDependencyLinkingContext,
  model: string,
  counts: GeneratedAdventureDependencyLinkingInputCounts,
): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_STARTED,
      flow: "ai_provider",
      operation: OPERATION,
      result: "started",
      ...context,
      model,
      step: STEP,
      ...counts,
    },
    "OpenAI Adventure dependency linking request started.",
  );
}

function logCompleted(
  context: AdventureDependencyLinkingContext,
  model: string,
  startedAt: number,
  counts: GeneratedAdventureDependencyLinkingCounts,
): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_COMPLETED,
      flow: "ai_provider",
      operation: OPERATION,
      result: "success",
      ...context,
      model,
      step: STEP,
      durationMs: Date.now() - startedAt,
      ...counts,
    },
    "OpenAI Adventure dependency linking request completed.",
  );
}

function logProviderError(
  error: AdventureGeneratorError,
  context: AdventureDependencyLinkingContext,
  model: string,
  startedAt: number,
): void {
  const payload = {
    event:
      error.code === "provider_output_invalid"
        ? APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_INVALID
        : APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_FAILED,
    flow: "ai_provider",
    operation: OPERATION,
    result: "failure",
    ...context,
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
    serverLogger.warn(payload, "OpenAI Adventure dependency linking returned invalid output.");
    return;
  }

  serverLogger.error(payload, "OpenAI Adventure dependency linking request failed.");
}

function logInvalidOutputRetry(
  error: AdventureGeneratorError,
  context: AdventureDependencyLinkingContext,
  model: string,
  startedAt: number,
  attempt: number,
): void {
  serverLogger.warn(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_INVALID,
      flow: "ai_provider",
      operation: OPERATION,
      result: "retrying",
      ...context,
      model,
      step: STEP,
      attempt,
      nextAttempt: attempt + 1,
      maxAttempts: MAX_INVALID_OUTPUT_ATTEMPTS,
      providerErrorCode: error.code,
      providerErrorCategory: "invalid_output",
      error: serializeErrorForLog(error),
      durationMs: Date.now() - startedAt,
    },
    "OpenAI Adventure dependency linking returned invalid output; retrying once.",
  );
}

function logAiPayloadDebug(
  context: AdventureDependencyLinkingContext,
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
      ...context,
      step: STEP,
      direction: payloadInfo.direction,
      payload: payloadPreview.payload,
    },
    "OpenAI Adventure dependency linking payload preview.",
  );
}

function serializeProviderRequestErrorForLog(error: unknown) {
  return {
    ...serializeErrorForLog(error),
    message: "Provider request failed.",
  };
}

type GeneratedAdventureDependencyLinkingInputCounts = ReturnType<typeof countLinkingInput>;
type GeneratedAdventureDependencyLinkingCounts = GeneratedAdventureDependencyLinkingInputCounts &
  ReturnType<typeof countLinks>;

function countLinkingInput(content: GeneratedAdventureContent) {
  return {
    questCount: content.acts.reduce(
      (count, act) => count + act.mainQuests.length + act.sideQuests.length,
      0,
    ),
    bossFightCount: content.acts.reduce((count, act) => count + act.bossFights.length, 0),
    skillCount: content.skills.length,
    inventoryItemCount: content.inventoryItems.length,
  };
}

function countLinks(links: GeneratedAdventureDependencyLinks) {
  return {
    questLinkCount: links.questLinks.length,
    bossFightLinkCount: links.bossFightLinks.length,
    linkedQuestSkillCount: links.questLinks.reduce((count, link) => count + link.skillKeys.length, 0),
    linkedBossFightSkillCount: links.bossFightLinks.reduce(
      (count, link) => count + link.skillKeys.length,
      0,
    ),
    linkedInventoryItemCount: [...links.questLinks, ...links.bossFightLinks].reduce(
      (count, link) => count + link.inventoryItemKeys.length,
      0,
    ),
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
