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
import type { GeneratedAdventureDependencyLinks } from "../domain/generated-adventure-dependencies";
import {
  MAX_GENERATED_ADVENTURE_REWARD_XP,
  MIN_GENERATED_ADVENTURE_REWARD_XP,
  parseGeneratedAdventureXpBalance,
  type GeneratedAdventureXpBalance,
} from "../domain/generated-adventure-xp";
import {
  loadOpenAIAdventureXpBalancerConfig,
  type OpenAIGameMasterInterviewerConfig,
} from "../../game-master-assistant/infra/openai-game-master-interviewer-config";

const PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/adventure-planner/infra/prompts/balance-adventure-xp.md",
);

const OPERATION = "balance_adventure_xp";
const STEP = "xp_balancing";
const MAX_OUTPUT_TOKENS = 2_000;

type OpenAIResponsesClient = {
  responses: {
    create(params: ResponseCreateParamsNonStreaming): Promise<Response>;
  };
};

type OpenAIAdventureXpBalancerOptions = {
  config?: OpenAIGameMasterInterviewerConfig;
  client?: OpenAIResponsesClient;
  instructions?: string;
  promptPath?: string;
};

export type AdventureXpBalancingContext = {
  userId?: string;
  adventureId?: string;
};

export class OpenAIAdventureXpBalancer {
  private readonly config: OpenAIGameMasterInterviewerConfig;
  private readonly client: OpenAIResponsesClient;
  private readonly instructions?: string;
  private readonly promptPath: string;

  constructor(options: OpenAIAdventureXpBalancerOptions = {}) {
    this.config = options.config ?? loadOpenAIAdventureXpBalancerProviderConfig();
    this.client = options.client ?? new OpenAI({ apiKey: this.config.apiKey });
    this.instructions = options.instructions;
    this.promptPath = options.promptPath ?? PROMPT_PATH;
  }

  async balanceAdventureXp(
    content: GeneratedAdventureContent,
    dependencies: GeneratedAdventureDependencyLinks,
    context: AdventureXpBalancingContext = {},
  ): Promise<GeneratedAdventureXpBalance> {
    const startedAt = Date.now();
    logStarted(context, this.config.model, countXpBalancingInput(content, dependencies));

    try {
      const instructions = await this.loadInstructions();
      const request = buildOpenAIRequest(
        instructions,
        content,
        dependencies,
        this.config.model,
        context.userId,
      );
      const response = await this.createResponse(request, context);
      const xpBalance = parseGeneratedAdventureXpBalanceResponse(response, dependencies);

      logCompleted(context, this.config.model, startedAt, {
        ...countXpBalancingInput(content, dependencies),
        ...countXpBalance(xpBalance),
      });

      return xpBalance;
    } catch (error) {
      if (error instanceof AdventureGeneratorError) {
        logProviderError(error, context, this.config.model, startedAt);
        throw error;
      }

      const normalizedError = new AdventureGeneratorError(
        "provider_request_failed",
        "OpenAI Adventure XP balancing request failed.",
        { cause: error },
      );
      logProviderError(normalizedError, context, this.config.model, startedAt);
      throw normalizedError;
    }
  }

  private async createResponse(
    request: ResponseCreateParamsNonStreaming,
    context: AdventureXpBalancingContext,
  ): Promise<Response> {
    logAiPayloadDebug(context, { direction: "request", payload: request });
    const response = await this.client.responses.create(request);
    logAiPayloadDebug(context, { direction: "response", payload: response });
    return response;
  }

  private async loadInstructions(): Promise<string> {
    if (this.instructions !== undefined) {
      return this.instructions;
    }

    return readFile(this.promptPath, "utf8");
  }
}

export const GENERATED_ADVENTURE_XP_BALANCE_FORMAT = {
  type: "json_schema" as const,
  name: "rpgizer_generated_adventure_xp_balance",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["questXp", "bossFightXp"],
    properties: {
      questXp: arrayOf({
        type: "object",
        additionalProperties: false,
        required: ["questKey", "skillRewards"],
        properties: {
          questKey: keySchema(),
          skillRewards: nonEmptyArrayOf(skillRewardSchema()),
        },
      }),
      bossFightXp: arrayOf({
        type: "object",
        additionalProperties: false,
        required: ["bossFightKey", "skillRewards"],
        properties: {
          bossFightKey: keySchema(),
          skillRewards: nonEmptyArrayOf(skillRewardSchema()),
        },
      }),
    },
  },
};

function loadOpenAIAdventureXpBalancerProviderConfig(): OpenAIGameMasterInterviewerConfig {
  try {
    return loadOpenAIAdventureXpBalancerConfig();
  } catch (error) {
    throw new AdventureGeneratorError(
      "configuration_missing",
      "OPENAI_API_KEY is required to use the OpenAI Adventure XP balancer; OPENAI_ADVENTURE_XP_BALANCER_MODEL overrides the default Adventure model when set.",
      { cause: error },
    );
  }
}

function buildOpenAIRequest(
  instructions: string,
  content: GeneratedAdventureContent,
  dependencies: GeneratedAdventureDependencyLinks,
  model: string,
  userId?: string,
): ResponseCreateParamsNonStreaming {
  return {
    model,
    instructions,
    input: [
      {
        role: "user",
        content: JSON.stringify(buildXpBalancingInput(content, dependencies)),
      },
    ],
    text: { format: GENERATED_ADVENTURE_XP_BALANCE_FORMAT },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    ...(userId !== undefined ? { safety_identifier: userId.slice(0, 64) } : {}),
  };
}

function buildXpBalancingInput(
  content: GeneratedAdventureContent,
  dependencies: GeneratedAdventureDependencyLinks,
) {
  return {
    title: content.title,
    goalSummary: content.goalSummary,
    xpRange: {
      min: MIN_GENERATED_ADVENTURE_REWARD_XP,
      max: MAX_GENERATED_ADVENTURE_REWARD_XP,
    },
    skills: content.skills.map(({ key, name, description }) => ({ key, name, description })),
    quests: content.acts.flatMap((act, actIndex) => [
      ...act.mainQuests.map((quest, questIndex) => ({
        actKey: act.key,
        actNumber: actIndex + 1,
        progressionPosition: questIndex + 1,
        questType: quest.type,
        ...xpBalanceableQuest(quest, dependencies.questLinks.find((link) => link.questKey === quest.key)?.skillKeys),
      })),
      ...act.sideQuests.map((quest, questIndex) => ({
        actKey: act.key,
        actNumber: actIndex + 1,
        progressionPosition: questIndex + 1,
        questType: quest.type,
        optional: true,
        ...xpBalanceableQuest(quest, dependencies.questLinks.find((link) => link.questKey === quest.key)?.skillKeys),
      })),
    ]),
    bossFights: content.acts.flatMap((act, actIndex) =>
      act.bossFights.map((bossFight, bossFightIndex) => ({
        actKey: act.key,
        actNumber: actIndex + 1,
        progressionPosition: bossFightIndex + 1,
        milestoneType: "boss_fight",
        ...xpBalanceableQuest(
          bossFight,
          dependencies.bossFightLinks.find((link) => link.bossFightKey === bossFight.key)?.skillKeys,
        ),
      })),
    ),
  };
}

function xpBalanceableQuest(
  quest: Pick<
    GeneratedAdventureContent["acts"][number]["mainQuests"][number],
    "key" | "title" | "doneCondition" | "rewardIntent"
  >,
  linkedSkillKeys: string[] | undefined,
) {
  return {
    key: quest.key,
    title: quest.title,
    doneCondition: quest.doneCondition,
    rewardIntent: quest.rewardIntent,
    linkedSkillKeys: linkedSkillKeys ?? [],
  };
}

function parseGeneratedAdventureXpBalanceResponse(
  response: unknown,
  dependencies: GeneratedAdventureDependencyLinks,
): GeneratedAdventureXpBalance {
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
    return parseGeneratedAdventureXpBalance(parsed, dependencies);
  } catch (error) {
    throw invalidOutput("OpenAI structured output was not valid Adventure XP balance.", error);
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
  context: AdventureXpBalancingContext,
  model: string,
  counts: GeneratedAdventureXpBalancingInputCounts,
): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_XP_BALANCING_STARTED,
      flow: "ai_provider",
      operation: OPERATION,
      result: "started",
      ...context,
      model,
      step: STEP,
      ...counts,
    },
    "OpenAI Adventure XP balancing request started.",
  );
}

function logCompleted(
  context: AdventureXpBalancingContext,
  model: string,
  startedAt: number,
  counts: GeneratedAdventureXpBalancingCounts,
): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_XP_BALANCING_COMPLETED,
      flow: "ai_provider",
      operation: OPERATION,
      result: "success",
      ...context,
      model,
      step: STEP,
      durationMs: Date.now() - startedAt,
      ...counts,
    },
    "OpenAI Adventure XP balancing request completed.",
  );
}

function logProviderError(
  error: AdventureGeneratorError,
  context: AdventureXpBalancingContext,
  model: string,
  startedAt: number,
): void {
  const payload = {
    event:
      error.code === "provider_output_invalid"
        ? APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_XP_BALANCING_INVALID
        : APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_XP_BALANCING_FAILED,
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
    serverLogger.warn(payload, "OpenAI Adventure XP balancing returned invalid output.");
    return;
  }

  serverLogger.error(payload, "OpenAI Adventure XP balancing request failed.");
}

function logAiPayloadDebug(
  context: AdventureXpBalancingContext,
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
    "OpenAI Adventure XP balancing payload preview.",
  );
}

function serializeProviderRequestErrorForLog(error: unknown) {
  return {
    ...serializeErrorForLog(error),
    message: "Provider request failed.",
  };
}

type GeneratedAdventureXpBalancingInputCounts = ReturnType<typeof countXpBalancingInput>;
type GeneratedAdventureXpBalancingCounts = GeneratedAdventureXpBalancingInputCounts &
  ReturnType<typeof countXpBalance>;

function countXpBalancingInput(
  content: GeneratedAdventureContent,
  dependencies: GeneratedAdventureDependencyLinks,
) {
  return {
    questCount: content.acts.reduce(
      (count, act) => count + act.mainQuests.length + act.sideQuests.length,
      0,
    ),
    bossFightCount: content.acts.reduce((count, act) => count + act.bossFights.length, 0),
    skillCount: content.skills.length,
    linkedRewardCount: [...dependencies.questLinks, ...dependencies.bossFightLinks].reduce(
      (count, link) => count + link.skillKeys.length,
      0,
    ),
  };
}

function countXpBalance(xpBalance: GeneratedAdventureXpBalance) {
  const questXpRewardCount = xpBalance.questXp.reduce(
    (count, entry) => count + entry.skillRewards.length,
    0,
  );
  const bossFightXpRewardCount = xpBalance.bossFightXp.reduce(
    (count, entry) => count + entry.skillRewards.length,
    0,
  );

  return {
    questXpRecordCount: xpBalance.questXp.length,
    bossFightXpRecordCount: xpBalance.bossFightXp.length,
    questXpRewardCount,
    bossFightXpRewardCount,
    totalXpRewardCount: questXpRewardCount + bossFightXpRewardCount,
  };
}

function skillRewardSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["skillKey", "xp"],
    properties: {
      skillKey: keySchema(),
      xp: {
        type: "integer",
        minimum: MIN_GENERATED_ADVENTURE_REWARD_XP,
        maximum: MAX_GENERATED_ADVENTURE_REWARD_XP,
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
