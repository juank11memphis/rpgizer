import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
import { serverLogger } from "../../../../server/logging/logger";
import { serializeErrorForLog } from "../../../../server/logging/redaction";
import type { GeneratedAdventure } from "../../domain/generated-adventure";
import type { GenerateAdventureInput } from "./input";
import {
  ADVENTURE_GENERATOR_FAILURE_USER_MESSAGE,
  AdventureGeneratorError,
  type AdventureGenerator,
  type GeneratedAdventureRepository,
} from "./ports";
import type { GenerateAdventureOutput } from "./output";

export type GenerateAdventureDependencies = {
  generatedAdventureRepository: GeneratedAdventureRepository;
  adventureGenerator: AdventureGenerator;
};

const OPERATION = "generate_adventure";

export async function generateAdventure(
  input: GenerateAdventureInput,
  dependencies: GenerateAdventureDependencies,
): Promise<GenerateAdventureOutput> {
  const startedAt = Date.now();

  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_STARTED,
      flow: "forge",
      operation: OPERATION,
      result: "started",
      userId: input.userId,
      adventureId: input.adventureId,
      artifactId: input.interviewOutputArtifactId,
      transcriptMessageCount: input.transcript.length,
    },
    "Adventure generation started.",
  );

  try {
    const existing = await dependencies.generatedAdventureRepository.findExistingGeneratedAdventure({
      userId: input.userId,
      adventureId: input.adventureId,
    });

    if (existing) {
      const counts = countGeneratedAdventureContent(existing.adventure);
      serverLogger.info(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_REUSED_EXISTING,
          flow: "forge",
          operation: OPERATION,
          result: "success",
          userId: input.userId,
          adventureId: input.adventureId,
          artifactId: input.interviewOutputArtifactId,
          generatedAdventureId: existing.generatedAdventureId,
          reusedExistingAdventure: true,
          durationMs: Date.now() - startedAt,
          ...counts,
        },
        "Adventure generation reused an existing generated Adventure.",
      );

      return {
        status: "ready",
        adventureId: existing.adventureId,
        generatedAdventureId: existing.generatedAdventureId,
        reusedExistingAdventure: true,
        adventure: existing.adventure,
      };
    }

    const generatedAdventure = await dependencies.adventureGenerator.generateAdventure(input);
    const savedAdventure = await dependencies.generatedAdventureRepository.saveGeneratedAdventure({
      userId: input.userId,
      adventureId: input.adventureId,
      interviewOutputArtifactId: input.interviewOutputArtifactId,
      adventure: generatedAdventure,
    });
    const counts = countGeneratedAdventureContent(savedAdventure.adventure);

    serverLogger.info(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_COMPLETED,
        flow: "forge",
        operation: OPERATION,
        result: "success",
        userId: input.userId,
        adventureId: savedAdventure.adventureId,
        artifactId: input.interviewOutputArtifactId,
        generatedAdventureId: savedAdventure.generatedAdventureId,
        reusedExistingAdventure: savedAdventure.reusedExistingAdventure,
        durationMs: Date.now() - startedAt,
        ...counts,
      },
      "Adventure generation completed.",
    );

    return {
      status: "ready",
      adventureId: savedAdventure.adventureId,
      generatedAdventureId: savedAdventure.generatedAdventureId,
      reusedExistingAdventure: savedAdventure.reusedExistingAdventure,
      adventure: savedAdventure.adventure,
    };
  } catch (error) {
    if (isRecoverableAdventureGenerationError(error)) {
      serverLogger.warn(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_RECOVERABLE_FAILURE,
          flow: "forge",
          operation: OPERATION,
          result: "recoverable_failure",
          userId: input.userId,
          adventureId: input.adventureId,
          artifactId: input.interviewOutputArtifactId,
          resultCategory: error instanceof AdventureGeneratorError ? error.code : "persistence_failed",
          durationMs: Date.now() - startedAt,
          error: serializeErrorForLog(error),
        },
        "Adventure generation failed recoverably.",
      );

      return {
        status: "recoverable_failure",
        message: ADVENTURE_GENERATOR_FAILURE_USER_MESSAGE,
      };
    }

    serverLogger.error(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_UNEXPECTED_FAILURE,
        flow: "forge",
        operation: OPERATION,
        result: "failure",
        userId: input.userId,
        adventureId: input.adventureId,
        artifactId: input.interviewOutputArtifactId,
        durationMs: Date.now() - startedAt,
        error: serializeErrorForLog(error),
      },
      "Adventure generation failed unexpectedly.",
    );

    throw error;
  }
}

function isRecoverableAdventureGenerationError(error: unknown): boolean {
  if (error instanceof AdventureGeneratorError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /persist|database|duplicate|not found|created|insert|save/i.test(error.message);
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
