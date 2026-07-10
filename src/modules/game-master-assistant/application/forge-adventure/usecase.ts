import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
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

    const artifactResult = await getOrCreateArtifact(input, dependencies, interview, startedAt);
    if (artifactResult.status === "recoverable_failure") return artifactResult;

    const generatedAdventure = await dependencies.adventurePlanner.generateAdventure({
      userId: input.userId,
      adventureId: input.adventureId,
      goalText: interview.draft.goalText,
      transcript: interview.transcript,
      interviewOutputArtifactId: artifactResult.artifactId,
      interviewOutputArtifact: artifactResult.artifact,
    });

    if (generatedAdventure.status !== "ready") {
      serverLogger.warn(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_RECOVERABLE_FAILURE,
          flow: "forge",
          operation: "forge_adventure",
          result: "recoverable_failure",
          userId: input.userId,
          adventureId: input.adventureId,
          artifactId: artifactResult.artifactId,
          resultCategory: generatedAdventure.status,
          durationMs: Date.now() - startedAt,
        },
        "Forge Adventure failed recoverably through Adventure Planner.",
      );

      return {
        status: "recoverable_failure",
        message:
          generatedAdventure.status === "recoverable_failure"
            ? generatedAdventure.message
            : FORGE_ADVENTURE_FAILURE_MESSAGE,
      };
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
