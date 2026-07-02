import type { InterviewOutputArtifact } from "../../domain/interview-output-artifact";

export type GetCurrentInterviewOutputArtifactInput = {
  userId: string;
  adventureId: string;
};

export type SaveCurrentInterviewOutputArtifactInput = {
  userId: string;
  adventureId: string;
  artifact: InterviewOutputArtifact;
};
