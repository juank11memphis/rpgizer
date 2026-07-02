import type { InterviewOutputArtifact } from "../../domain/interview-output-artifact";
import type { InterviewMessage } from "../../domain/interview-message";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";
import type { InterviewStatus } from "../../domain/interview-status";
import type { AdventureInterview } from "../get-adventure-interview/output";
import type { InterviewOutputArtifactRepository } from "../interview-output-artifact/ports";

export type InterviewOutputArtifactGenerationRequest = {
  userId: string;
  adventureId: string;
  goalText: string;
  readinessStatus: InterviewReadinessStatus;
  interviewStatus: InterviewStatus;
  transcript: InterviewMessage[];
};

export type InterviewOutputArtifactGenerator = {
  generateArtifact(
    input: InterviewOutputArtifactGenerationRequest,
  ): Promise<InterviewOutputArtifact>;
};

export type GenerateInterviewOutputArtifactRepository = InterviewOutputArtifactRepository & {
  getDraftWithTranscript(input: {
    userId: string;
    adventureId: string;
  }): Promise<AdventureInterview | null>;
};
