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
  const repository = dependencies.adventureDraftRepository;
  const interview = await repository.getDraftWithTranscript({
    userId: input.userId,
    adventureId: input.adventureId,
  });

  if (!interview) {
    return { status: "not_found" };
  }

  if (interview.draft.interviewStatus !== "confirmed") {
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
    return {
      status: "ready",
      adventureId: existingArtifact.adventureId,
      artifactId: existingArtifact.id,
      reusedExistingArtifact: true,
    };
  }

  const generatedArtifact = await generateAndValidateArtifact(input, dependencies, interview);

  if (!generatedArtifact) {
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
