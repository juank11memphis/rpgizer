import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
import { assembleGeneratedAdventure } from "../../../adventure-planner/domain/assemble-generated-adventure";
import { parseGeneratedAdventure, type GeneratedAdventure } from "../../../adventure-planner/domain/generated-adventure";
import type { GeneratedAdventureContent } from "../../../adventure-planner/domain/generated-adventure-content";
import type { GeneratedAdventureDependencyLinks } from "../../../adventure-planner/domain/generated-adventure-dependencies";
import type { GeneratedAdventureXpBalance } from "../../../adventure-planner/domain/generated-adventure-xp";
import { AdventureGeneratorError } from "../../../adventure-planner/application/generate-adventure/ports";
import { serverLogger } from "../../../../server/logging/logger";
import { serializeErrorForLog } from "../../../../server/logging/redaction";
import {
  parseInterviewOutputArtifact,
  type InterviewOutputArtifact,
} from "../../domain/interview-output-artifact";
import type { AdventureInterview } from "../get-adventure-interview/output";
import type { ForgeAdventureInput } from "./input";
import {
  FORGE_ADVENTURE_FAILURE_MESSAGE,
  FORGE_ADVENTURE_NOT_CONFIRMED_MESSAGE,
  type ForgeAdventureOutput,
} from "./output";
import type {
  ForgeAdventurePlanner,
  ForgeAdventureRepository,
  ForgeInterviewOutputArtifactGenerator,
} from "./ports";
import { reportForgeProgress } from "./progress";

export type ForgeAdventureDependencies = {
  adventureDraftRepository: ForgeAdventureRepository;
  interviewOutputArtifactGenerator: ForgeInterviewOutputArtifactGenerator;
  adventurePlanner: ForgeAdventurePlanner;
};

export async function forgeAdventure(
  input: ForgeAdventureInput,
  dependencies: ForgeAdventureDependencies,
): Promise<ForgeAdventureOutput> {
  const startedAt = Date.now();
  const repository = dependencies.adventureDraftRepository;

  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_STARTED,
      flow: "forge",
      operation: "forge_adventure",
      result: "started",
      userId: input.userId,
      adventureId: input.adventureId,
    },
    "Forge Adventure orchestration started.",
  );

  try {
    const interview = await repository.getDraftWithTranscript(input);

    if (!interview) {
      serverLogger.warn(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_NOT_FOUND,
          flow: "forge",
          operation: "forge_adventure",
          result: "expected_error",
          userId: input.userId,
          adventureId: input.adventureId,
          resultCategory: "not_found",
          durationMs: Date.now() - startedAt,
        },
        "Forge Adventure skipped because the interview was not found.",
      );

      return { status: "not_found" };
    }

    if (interview.draft.interviewStatus !== "confirmed") {
      serverLogger.warn(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_NOT_CONFIRMED,
          flow: "forge",
          operation: "forge_adventure",
          result: "expected_error",
          userId: input.userId,
          adventureId: input.adventureId,
          resultCategory: "not_confirmed",
          readinessStatus: interview.draft.readinessStatus,
          interviewStatus: interview.draft.interviewStatus,
          durationMs: Date.now() - startedAt,
        },
        "Forge Adventure skipped because the interview was not confirmed.",
      );

      return {
        status: "not_confirmed",
        message: FORGE_ADVENTURE_NOT_CONFIRMED_MESSAGE,
      };
    }

    await reportForgeProgress(input.progressReporter, { stage: "quest_lore", status: "started" });
    const artifactResult = await getOrCreateArtifact(input, dependencies, interview, startedAt);
    if (artifactResult.status === "recoverable_failure") return artifactResult;
    await reportForgeProgress(input.progressReporter, { stage: "quest_lore", status: "completed" });

    const generatedAdventure = await generateAdventureFromArtifact(
      input,
      dependencies,
      interview,
      artifactResult,
      startedAt,
    );

    if (generatedAdventure.status === "recoverable_failure") {
      return generatedAdventure;
    }

    serverLogger.info(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_COMPLETED,
        flow: "forge",
        operation: "forge_adventure",
        result: "success",
        userId: input.userId,
        adventureId: input.adventureId,
        artifactId: artifactResult.artifactId,
        generatedAdventureId: generatedAdventure.generatedAdventureId,
        reusedExistingArtifact: artifactResult.reusedExistingArtifact,
        reusedExistingAdventure: generatedAdventure.reusedExistingAdventure,
        durationMs: Date.now() - startedAt,
      },
      "Forge Adventure orchestration completed.",
    );

    await reportForgeProgress(input.progressReporter, {
      stage: "opening_adventure",
      status: "completed",
    });

    return {
      status: "ready",
      adventureId: generatedAdventure.adventureId,
      artifactId: artifactResult.artifactId,
      generatedAdventureId: generatedAdventure.generatedAdventureId,
      reusedExistingArtifact: artifactResult.reusedExistingArtifact,
      reusedExistingAdventure: generatedAdventure.reusedExistingAdventure,
    };
  } catch (error) {
    serverLogger.error(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_UNEXPECTED_FAILURE,
        flow: "forge",
        operation: "forge_adventure",
        result: "failure",
        userId: input.userId,
        adventureId: input.adventureId,
        durationMs: Date.now() - startedAt,
        error: serializeErrorForLog(error),
      },
      "Forge Adventure failed unexpectedly.",
    );
    throw error;
  }
}


type GeneratedAdventureResult =
  | {
      status: "ready";
      adventureId: string;
      generatedAdventureId: string;
      reusedExistingAdventure: boolean;
      adventure: GeneratedAdventure;
    }
  | { status: "recoverable_failure"; message: string };

async function generateAdventureFromArtifact(
  input: ForgeAdventureInput,
  dependencies: ForgeAdventureDependencies,
  interview: AdventureInterview,
  artifactResult: Extract<ArtifactResult, { status: "ready" }>,
  startedAt: number,
): Promise<GeneratedAdventureResult> {
  try {
    const existing = await dependencies.adventurePlanner.findExistingGeneratedAdventure({
      userId: input.userId,
      adventureId: input.adventureId,
    });

    if (existing) {
      await reportForgeProgress(input.progressReporter, { stage: "opening_adventure", status: "started" });
      serverLogger.info(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_REUSED_EXISTING,
          flow: "forge",
          operation: "forge_adventure",
          result: "success",
          userId: input.userId,
          adventureId: input.adventureId,
          artifactId: artifactResult.artifactId,
          generatedAdventureId: existing.generatedAdventureId,
          reusedExistingAdventure: true,
          durationMs: Date.now() - startedAt,
        },
        "Forge Adventure reused an existing generated Adventure.",
      );

      return {
        status: "ready",
        adventureId: existing.adventureId,
        generatedAdventureId: existing.generatedAdventureId,
        reusedExistingAdventure: true,
        adventure: existing.adventure,
      };
    }

    const request = {
      userId: input.userId,
      adventureId: input.adventureId,
      goalText: interview.draft.goalText,
      transcript: interview.transcript,
      interviewOutputArtifactId: artifactResult.artifactId,
      interviewOutputArtifact: artifactResult.artifact,
    };

    await reportForgeProgress(input.progressReporter, { stage: "adventure_roadmap", status: "started" });
    const content = await dependencies.adventurePlanner.generateAdventureContent(request);
    await reportForgeProgress(input.progressReporter, { stage: "adventure_roadmap", status: "completed" });
    logAdventureContentCompleted(input, artifactResult.artifactId, content);

    const stepContext = { userId: input.userId, adventureId: input.adventureId };
    await reportForgeProgress(input.progressReporter, { stage: "connections", status: "started" });
    const links = await dependencies.adventurePlanner.linkAdventureDependencies(content, stepContext);
    await reportForgeProgress(input.progressReporter, { stage: "connections", status: "completed" });
    logAdventureLinksCompleted(input, artifactResult.artifactId, links);

    await reportForgeProgress(input.progressReporter, { stage: "xp_rewards", status: "started" });
    const xpBalance = await dependencies.adventurePlanner.balanceAdventureXp(content, links, stepContext);
    await reportForgeProgress(input.progressReporter, { stage: "xp_rewards", status: "completed" });
    logAdventureXpCompleted(input, artifactResult.artifactId, xpBalance);

    await reportForgeProgress(input.progressReporter, { stage: "opening_adventure", status: "started" });
    const adventure = parseGeneratedAdventure(assembleGeneratedAdventure({ content, dependencies: links, xpBalance }));
    const savedAdventure = await dependencies.adventurePlanner.saveGeneratedAdventure({
      userId: input.userId,
      adventureId: input.adventureId,
      interviewOutputArtifactId: artifactResult.artifactId,
      adventure,
    });

    return {
      status: "ready",
      adventureId: savedAdventure.adventureId,
      generatedAdventureId: savedAdventure.generatedAdventureId,
      reusedExistingAdventure: savedAdventure.reusedExistingAdventure,
      adventure: savedAdventure.adventure,
    };
  } catch (error) {
    if (!isRecoverableAdventureGenerationError(error)) {
      throw error;
    }

    serverLogger.warn(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_RECOVERABLE_FAILURE,
        flow: "forge",
        operation: "forge_adventure",
        result: "recoverable_failure",
        userId: input.userId,
        adventureId: input.adventureId,
        artifactId: artifactResult.artifactId,
        resultCategory: error instanceof AdventureGeneratorError ? error.code : "adventure_generation_failed",
        durationMs: Date.now() - startedAt,
        error: serializeErrorForLog(error),
      },
      "Forge Adventure failed recoverably while generating the Adventure.",
    );

    return { status: "recoverable_failure", message: FORGE_ADVENTURE_FAILURE_MESSAGE };
  }
}

function isRecoverableAdventureGenerationError(error: unknown): boolean {
  if (error instanceof AdventureGeneratorError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /persist|database|duplicate|not found|created|insert|save|assembly|validation|missing dependency|invalid/i.test(error.message);
}

function logAdventureContentCompleted(
  input: ForgeAdventureInput,
  artifactId: string,
  content: GeneratedAdventureContent,
): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_WORKFLOW_STEP_COMPLETED,
      flow: "forge",
      operation: "forge_adventure",
      result: "success",
      step: "content_generation",
      userId: input.userId,
      adventureId: input.adventureId,
      artifactId,
      actCount: content.acts.length,
    },
    "Forge Adventure content generation completed.",
  );
}

function logAdventureLinksCompleted(
  input: ForgeAdventureInput,
  artifactId: string,
  links: GeneratedAdventureDependencyLinks,
): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_WORKFLOW_STEP_COMPLETED,
      flow: "forge",
      operation: "forge_adventure",
      result: "success",
      step: "dependency_linking",
      userId: input.userId,
      adventureId: input.adventureId,
      artifactId,
      questLinkCount: links.questLinks.length,
      bossFightLinkCount: links.bossFightLinks.length,
    },
    "Forge Adventure dependency linking completed.",
  );
}

function logAdventureXpCompleted(
  input: ForgeAdventureInput,
  artifactId: string,
  xpBalance: GeneratedAdventureXpBalance,
): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_WORKFLOW_STEP_COMPLETED,
      flow: "forge",
      operation: "forge_adventure",
      result: "success",
      step: "xp_balancing",
      userId: input.userId,
      adventureId: input.adventureId,
      artifactId,
      questXpCount: xpBalance.questXp.length,
      bossFightXpCount: xpBalance.bossFightXp.length,
    },
    "Forge Adventure XP balancing completed.",
  );
}

type ArtifactResult =
  | {
      status: "ready";
      artifactId: string;
      artifact: InterviewOutputArtifact;
      reusedExistingArtifact: boolean;
    }
  | { status: "recoverable_failure"; message: string };

async function getOrCreateArtifact(
  input: ForgeAdventureInput,
  dependencies: ForgeAdventureDependencies,
  interview: AdventureInterview,
  startedAt: number,
): Promise<ArtifactResult> {
  const existingArtifact = await dependencies.adventureDraftRepository.getCurrentArtifact(input);

  if (existingArtifact) {
    serverLogger.info(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_ARTIFACT_REUSED,
        flow: "forge",
        operation: "forge_adventure",
        result: "success",
        userId: input.userId,
        adventureId: input.adventureId,
        artifactId: existingArtifact.id,
        reusedExistingArtifact: true,
        durationMs: Date.now() - startedAt,
      },
      "Forge Adventure reused an existing Interview Output Artifact.",
    );

    return {
      status: "ready",
      artifactId: existingArtifact.id,
      artifact: existingArtifact.artifact,
      reusedExistingArtifact: true,
    };
  }

  try {
    const generatedArtifact = await dependencies.interviewOutputArtifactGenerator.generateArtifact({
      userId: input.userId,
      adventureId: input.adventureId,
      goalText: interview.draft.goalText,
      readinessStatus: interview.draft.readinessStatus,
      interviewStatus: interview.draft.interviewStatus,
      transcript: interview.transcript,
    });
    const parsedArtifact = parseInterviewOutputArtifact(generatedArtifact);
    const savedArtifact = await dependencies.adventureDraftRepository.saveCurrentArtifact({
      userId: input.userId,
      adventureId: input.adventureId,
      artifact: parsedArtifact,
    });

    serverLogger.info(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_ARTIFACT_CREATED,
        flow: "forge",
        operation: "forge_adventure",
        result: "success",
        userId: input.userId,
        adventureId: input.adventureId,
        artifactId: savedArtifact.id,
        reusedExistingArtifact: false,
        durationMs: Date.now() - startedAt,
      },
      "Forge Adventure created an Interview Output Artifact.",
    );

    return {
      status: "ready",
      artifactId: savedArtifact.id,
      artifact: savedArtifact.artifact,
      reusedExistingArtifact: false,
    };
  } catch (error) {
    serverLogger.warn(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_RECOVERABLE_FAILURE,
        flow: "forge",
        operation: "forge_adventure",
        result: "recoverable_failure",
        userId: input.userId,
        adventureId: input.adventureId,
        resultCategory: "artifact_generation_failed",
        durationMs: Date.now() - startedAt,
        error: serializeErrorForLog(error),
      },
      "Forge Adventure could not create the Interview Output Artifact.",
    );

    return { status: "recoverable_failure", message: FORGE_ADVENTURE_FAILURE_MESSAGE };
  }
}
