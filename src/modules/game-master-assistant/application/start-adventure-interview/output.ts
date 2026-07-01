import type { InterviewMessage } from "../../domain/interview-message";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";

export type StartedAdventureDraft = {
  id: string;
  goalText: string;
  readinessStatus: InterviewReadinessStatus;
};

export type StartAdventureInterviewOutput = {
  draft: StartedAdventureDraft;
  transcript: InterviewMessage[];
};
