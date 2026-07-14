import type {
  AdventureGenerator,
  AdventureGeneratorRequest,
} from "../application/generate-adventure/ports";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import { assembleGeneratedAdventure } from "../domain/assemble-generated-adventure";
import { parseGeneratedAdventure, type GeneratedAdventure } from "../domain/generated-adventure";
import type { GeneratedAdventureContent } from "../domain/generated-adventure-content";
import type { GeneratedAdventureDependencyLinks } from "../domain/generated-adventure-dependencies";
import type { GeneratedAdventureXpBalance } from "../domain/generated-adventure-xp";
import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { serverLogger } from "../../../server/logging/logger";
import { serializeErrorForLog } from "../../../server/logging/redaction";
import { OpenAIAdventureContentGenerator } from "./openai-adventure-content-generator";
import { OpenAIAdventureDependencyLinker } from "./openai-adventure-dependency-linker";
import { OpenAIAdventureXpBalancer } from "./openai-adventure-xp-balancer";

const FLOW = "multi_step_adventure_generation";
const OPERATION = "generate_adventure";

type MultiStepAdventureGenerationStep =
  | "content_generation"
  | "dependency_linking"
  | "xp_balancing"
  | "final_assembly"
  | "final_validation";

type AdventureContentGenerator = {
  generateAdventureContent(input: AdventureGeneratorRequest): Promise<GeneratedAdventureContent>;
};

type AdventureDependencyLinker = {
  linkAdventureDependencies(
    content: GeneratedAdventureContent,
    context?: { userId?: string; adventureId?: string },
  ): Promise<GeneratedAdventureDependencyLinks>;
};

type AdventureXpBalancer = {
  balanceAdventureXp(
    content: GeneratedAdventureContent,
    dependencies: GeneratedAdventureDependencyLinks,
    context?: { userId?: string; adventureId?: string },
  ): Promise<GeneratedAdventureXpBalance>;
};

type OpenAIMultiStepAdventureGeneratorOptions = {
  contentGenerator?: AdventureContentGenerator;
  dependencyLinker?: AdventureDependencyLinker;
  xpBalancer?: AdventureXpBalancer;
};

export class OpenAIMultiStepAdventureGenerator implements AdventureGenerator {
  private readonly contentGenerator: AdventureContentGenerator;
  private readonly dependencyLinker: AdventureDependencyLinker;
  private readonly xpBalancer: AdventureXpBalancer;

  constructor(options: OpenAIMultiStepAdventureGeneratorOptions = {}) {
    this.contentGenerator = options.contentGenerator ?? new OpenAIAdventureContentGenerator();
    this.dependencyLinker = options.dependencyLinker ?? new OpenAIAdventureDependencyLinker();
    this.xpBalancer = options.xpBalancer ?? new OpenAIAdventureXpBalancer();
  }

  async generateAdventure(input: AdventureGeneratorRequest): Promise<GeneratedAdventure> {
    const startedAt = Date.now();
    logWorkflowStarted(input);

    try {
      const content = await this.contentGenerator.generateAdventureContent(input);
      logStepCompleted(input, "content_generation", countContent(content));

      const stepContext = { userId: input.userId, adventureId: input.adventureId };
      const dependencies = await this.dependencyLinker.linkAdventureDependencies(content, stepContext);
      logStepCompleted(input, "dependency_linking", countLinks(dependencies));

      const xpBalance = await this.xpBalancer.balanceAdventureXp(content, dependencies, stepContext);
      logStepCompleted(input, "xp_balancing", countXpBalance(xpBalance));

      const assembledAdventure = assembleFinalAdventure(input, content, dependencies, xpBalance);
      const finalAdventure = validateFinalAdventure(input, assembledAdventure);

      serverLogger.info(
        {
          ...baseLogPayload(input),
          event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_WORKFLOW_COMPLETED,
          result: "success",
          durationMs: Date.now() - startedAt,
          ...countFinalAdventure(finalAdventure),
        },
        "Multi-step Adventure generation workflow completed.",
      );

      return finalAdventure;
    } catch (error) {
      const normalizedError = normalizeWorkflowError(error);
      logWorkflowFailed(input, normalizedError, startedAt, inferFailureStep(normalizedError));
      throw normalizedError;
    }
  }
}

function assembleFinalAdventure(
  input: AdventureGeneratorRequest,
  content: GeneratedAdventureContent,
  dependencies: GeneratedAdventureDependencyLinks,
  xpBalance: GeneratedAdventureXpBalance,
): GeneratedAdventure {
  const startedAt = Date.now();
  serverLogger.info(
    {
      ...baseLogPayload(input),
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_FINAL_ASSEMBLY_STARTED,
      result: "started",
      step: "final_assembly",
    },
    "Multi-step Adventure final assembly started.",
  );

  try {
    const adventure = assembleGeneratedAdventure({ content, dependencies, xpBalance });
    serverLogger.info(
      {
        ...baseLogPayload(input),
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_FINAL_ASSEMBLY_COMPLETED,
        result: "success",
        step: "final_assembly",
        durationMs: Date.now() - startedAt,
        ...countFinalAdventure(adventure),
      },
      "Multi-step Adventure final assembly completed.",
    );
    return adventure;
  } catch (error) {
    const normalizedError = normalizeStepError(
      error,
      "final_assembly",
      "Multi-step Adventure final assembly failed.",
    );
    serverLogger.warn(
      {
        ...baseLogPayload(input),
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_FINAL_ASSEMBLY_FAILED,
        result: "failure",
        step: "final_assembly",
        providerErrorCode: normalizedError.code,
        providerErrorCategory: "invalid_output",
        error: serializeErrorForLog(normalizedError),
        durationMs: Date.now() - startedAt,
      },
      "Multi-step Adventure final assembly failed.",
    );
    throw normalizedError;
  }
}

function validateFinalAdventure(
  input: AdventureGeneratorRequest,
  adventure: GeneratedAdventure,
): GeneratedAdventure {
  const startedAt = Date.now();

  try {
    const validatedAdventure = parseGeneratedAdventure(adventure);
    serverLogger.info(
      {
        ...baseLogPayload(input),
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_FINAL_VALIDATION_COMPLETED,
        result: "success",
        step: "final_validation",
        durationMs: Date.now() - startedAt,
        ...countFinalAdventure(validatedAdventure),
      },
      "Multi-step Adventure final validation completed.",
    );
    return validatedAdventure;
  } catch (error) {
    const normalizedError = normalizeStepError(
      error,
      "final_validation",
      "Multi-step Adventure final validation failed.",
    );
    serverLogger.warn(
      {
        ...baseLogPayload(input),
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_FINAL_VALIDATION_FAILED,
        result: "failure",
        step: "final_validation",
        providerErrorCode: normalizedError.code,
        providerErrorCategory: "invalid_output",
        error: serializeErrorForLog(normalizedError),
        durationMs: Date.now() - startedAt,
      },
      "Multi-step Adventure final validation failed.",
    );
    throw normalizedError;
  }
}

function normalizeWorkflowError(error: unknown): AdventureGeneratorError {
  if (error instanceof AdventureGeneratorError) {
    return error;
  }

  return new AdventureGeneratorError(
    "provider_output_invalid",
    "Multi-step Adventure generation workflow produced invalid output.",
    { cause: error },
  );
}

function normalizeStepError(
  error: unknown,
  step: MultiStepAdventureGenerationStep,
  fallbackMessage: string,
): AdventureGeneratorError {
  const normalizedError = normalizeWorkflowError(error);

  if (inferFailureStep(normalizedError) === step) {
    return normalizedError;
  }

  return new AdventureGeneratorError(normalizedError.code, fallbackMessage, { cause: normalizedError });
}

function logWorkflowStarted(input: AdventureGeneratorRequest): void {
  serverLogger.info(
    {
      ...baseLogPayload(input),
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_WORKFLOW_STARTED,
      result: "started",
    },
    "Multi-step Adventure generation workflow started.",
  );
}

function logStepCompleted(
  input: AdventureGeneratorRequest,
  step: Extract<MultiStepAdventureGenerationStep, "content_generation" | "dependency_linking" | "xp_balancing">,
  counts: Record<string, number>,
): void {
  serverLogger.info(
    {
      ...baseLogPayload(input),
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_WORKFLOW_STEP_COMPLETED,
      result: "success",
      step,
      ...counts,
    },
    "Multi-step Adventure generation workflow step completed.",
  );
}

function logWorkflowFailed(
  input: AdventureGeneratorRequest,
  error: AdventureGeneratorError,
  startedAt: number,
  step: MultiStepAdventureGenerationStep | null,
): void {
  serverLogger.warn(
    {
      ...baseLogPayload(input),
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_WORKFLOW_FAILED,
      result: "failure",
      providerErrorCode: error.code,
      providerErrorCategory: error.code === "provider_request_failed" ? "request_failed" : "invalid_output",
      ...(step !== null ? { step } : {}),
      error: serializeErrorForLog(error),
      durationMs: Date.now() - startedAt,
    },
    "Multi-step Adventure generation workflow failed.",
  );
}

function inferFailureStep(error: Error): MultiStepAdventureGenerationStep | null {
  const message = collectErrorMessages(error).join(" ").toLowerCase();

  if (message.includes("content generation") || message.includes("adventure content")) {
    return "content_generation";
  }

  if (message.includes("dependency linking") || message.includes("dependency linker")) {
    return "dependency_linking";
  }

  if (message.includes("xp balancing") || message.includes("xp balancer")) {
    return "xp_balancing";
  }

  if (message.includes("final assembly")) {
    return "final_assembly";
  }

  if (message.includes("final validation")) {
    return "final_validation";
  }

  return null;
}

function collectErrorMessages(error: Error): string[] {
  const messages = [error.message];
  const cause = error.cause;

  if (cause instanceof Error) {
    messages.push(...collectErrorMessages(cause));
  }

  return messages;
}

function baseLogPayload(input: AdventureGeneratorRequest) {
  return {
    flow: FLOW,
    operation: OPERATION,
    userId: input.userId,
    adventureId: input.adventureId,
    artifactId: input.interviewOutputArtifactId,
  };
}

function countContent(content: GeneratedAdventureContent): Record<string, number> {
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
  };
}

function countLinks(dependencies: GeneratedAdventureDependencyLinks): Record<string, number> {
  return {
    questLinkCount: dependencies.questLinks.length,
    bossFightLinkCount: dependencies.bossFightLinks.length,
    skillLinkCount:
      dependencies.questLinks.reduce((count, link) => count + link.skillKeys.length, 0) +
      dependencies.bossFightLinks.reduce((count, link) => count + link.skillKeys.length, 0),
    inventoryLinkCount:
      dependencies.questLinks.reduce((count, link) => count + link.inventoryItemKeys.length, 0) +
      dependencies.bossFightLinks.reduce((count, link) => count + link.inventoryItemKeys.length, 0),
  };
}

function countXpBalance(xpBalance: GeneratedAdventureXpBalance): Record<string, number> {
  return {
    questXpCount: xpBalance.questXp.length,
    bossFightXpCount: xpBalance.bossFightXp.length,
    xpRewardCount:
      xpBalance.questXp.reduce((count, entry) => count + entry.skillRewards.length, 0) +
      xpBalance.bossFightXp.reduce((count, entry) => count + entry.skillRewards.length, 0),
  };
}

function countFinalAdventure(adventure: GeneratedAdventure): Record<string, number> {
  return {
    ...countContent(adventure),
    skillRewardCount: adventure.acts.reduce(
      (count, act) =>
        count +
        act.mainQuests.reduce((questCount, quest) => questCount + quest.skillRewards.length, 0) +
        act.sideQuests.reduce((questCount, quest) => questCount + quest.skillRewards.length, 0) +
        act.bossFights.reduce((bossCount, bossFight) => bossCount + bossFight.skillRewards.length, 0),
      0,
    ),
  };
}
