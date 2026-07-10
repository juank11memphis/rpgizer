import type { InterviewMessage } from "../../../game-master-assistant/domain/interview-message";
import type { InterviewOutputArtifact } from "../../../game-master-assistant/domain/interview-output-artifact";

export type GenerateAdventureInput = {
  userId: string;
  adventureId: string;
  goalText: string;
  transcript: InterviewMessage[];
  interviewOutputArtifactId: string;
  interviewOutputArtifact: InterviewOutputArtifact;
};
