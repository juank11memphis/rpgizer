import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
import { serverLogger } from "../../../../server/logging/logger";
import {
  parseInterviewOutputArtifact,
  type InterviewOutputArtifact,
} from "../../domain/interview-output-artifact";
import type { AdventureInterview } from "../get-adventure-interview/output";
import type { GenerateInterviewOutputArtifactInput } from "./input";
import {
  INTERVIEW_NOT_CONFIRMED_MESSAGE,
  INTERVIEW_OUTPUT_ARTIFACT_FAILURE_MESSAGE,
  type GenerateInterviewOutputArtifactOutput,
} from "./output";
import type {
  GenerateInterviewOutputArtifactRepository,
  InterviewOutputArtifactGenerator,
} from "./ports";

export type GenerateInterviewOutputArtifactDependencies = {
  adventureDraftRepository: GenerateInterviewOutputArtifactRepository;
  interviewOutputArtifactGenerator: InterviewOutputArtifactGenerator;
};

export async function generateInterviewOutputArtifact(
  input: GenerateInterviewOutputArtifactInput,
  dependencies: GenerateInterviewOutputArtifactDependencies,
): Promise<GenerateInterviewOutputArtifactOutput> {
  const startedAt = Date.now();
  const repository = dependencies.adventureDraftRepository;
  const interview = await repository.getDraftWithTranscript({
    userId: input.userId,
    adventureId: input.adventureId,
  });

  if (!interview) {
    serverLogger.warn(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_NOT_FOUND,
        flow: "forge",
        result: "expected_error",
        userId: input.userId,
        adventureId: input.adventureId,
        resultCategory: "not_found",
        durationMs: Date.now() - startedAt,
      },
      "Forge artifact generation skipped because the interview was not found.",
    );

    return { status: "not_found" };
  }

  if (interview.draft.interviewStatus !== "confirmed") {
    serverLogger.warn(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_NOT_CONFIRMED,
        flow: "forge",
        result: "expected_error",
        userId: input.userId,
        adventureId: input.adventureId,
        resultCategory: "not_confirmed",
        readinessStatus: interview.draft.readinessStatus,
        interviewStatus: interview.draft.interviewStatus,
        durationMs: Date.now() - startedAt,
      },
      "Forge artifact generation skipped because the interview was not confirmed.",
    );

    return {
      status: "not_confirmed",
      message: INTERVIEW_NOT_CONFIRMED_MESSAGE,
    };
  }

  const existingArtifact = await repository.getCurrentArtifact({
    userId: input.userId,
    adventureId: input.adventureId,
  });

  if (existingArtifact) {
    serverLogger.info(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_REUSED_EXISTING,
        flow: "forge",
        result: "success",
        userId: input.userId,
        adventureId: input.adventureId,
        artifactId: existingArtifact.id,
        reusedExistingArtifact: true,
        durationMs: Date.now() - startedAt,
      },
      "Forge artifact generation reused an existing artifact.",
    );

    return {
      status: "ready",
      adventureId: existingArtifact.adventureId,
      artifactId: existingArtifact.id,
      reusedExistingArtifact: true,
    };
  }

  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_STARTED,
      flow: "forge",
      result: "started",
      userId: input.userId,
      adventureId: input.adventureId,
      readinessStatus: interview.draft.readinessStatus,
      interviewStatus: interview.draft.interviewStatus,
    },
    "Forge artifact generation started.",
  );

  const generatedArtifact = await generateAndValidateArtifact(input, dependencies, interview);

  if (!generatedArtifact) {
    serverLogger.warn(
      {
        event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_FAILED,
        flow: "forge",
        result: "recoverable_failure",
        userId: input.userId,
        adventureId: input.adventureId,
        resultCategory: "generation_failed",
        durationMs: Date.now() - startedAt,
      },
      "Forge artifact generation failed recoverably.",
    );

    return {
      status: "recoverable_failure",
      message: INTERVIEW_OUTPUT_ARTIFACT_FAILURE_MESSAGE,
    };
  }

  const savedArtifact = await repository.saveCurrentArtifact({
    userId: input.userId,
    adventureId: input.adventureId,
    artifact: generatedArtifact,
  });

  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_COMPLETED,
      flow: "forge",
      result: "success",
      userId: input.userId,
      adventureId: input.adventureId,
      artifactId: savedArtifact.id,
      reusedExistingArtifact: false,
      durationMs: Date.now() - startedAt,
    },
    "Forge artifact generation completed.",
  );

  return {
    status: "ready",
    adventureId: savedArtifact.adventureId,
    artifactId: savedArtifact.id,
    reusedExistingArtifact: false,
  };
}

async function generateAndValidateArtifact(
  input: GenerateInterviewOutputArtifactInput,
  dependencies: GenerateInterviewOutputArtifactDependencies,
  interview: AdventureInterview,
): Promise<InterviewOutputArtifact | null> {
  try {
    const generatedArtifact = await dependencies.interviewOutputArtifactGenerator.generateArtifact({
      userId: input.userId,
      adventureId: input.adventureId,
      goalText: interview.draft.goalText,
      readinessStatus: interview.draft.readinessStatus,
      interviewStatus: interview.draft.interviewStatus,
      transcript: interview.transcript,
    });

    return parseInterviewOutputArtifact(generatedArtifact);
  } catch {
    return null;
  }
}
