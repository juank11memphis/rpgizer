import type { InterviewOutputArtifact } from "../../domain/interview-output-artifact";

export type CurrentInterviewOutputArtifact = {
  id: string;
  adventureId: string;
  artifact: InterviewOutputArtifact;
  createdAt: Date;
  updatedAt: Date;
};
