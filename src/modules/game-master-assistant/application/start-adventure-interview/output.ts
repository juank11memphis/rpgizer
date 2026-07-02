import type { InterviewMessage } from "../../domain/interview-message";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";
import type { InterviewStatus } from "../../domain/interview-status";

export type StartedAdventureDraft = {
  id: string;
  goalText: string;
  readinessStatus: InterviewReadinessStatus;
  interviewStatus: InterviewStatus;
};

export type StartAdventureInterviewOutput = {
  draft: StartedAdventureDraft;
  transcript: InterviewMessage[];
};
