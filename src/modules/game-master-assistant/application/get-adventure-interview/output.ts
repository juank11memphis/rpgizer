import type { AdventureDraftState } from "../../domain/adventure-draft-state";
import type { InterviewMessage } from "../../domain/interview-message";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";
import type { InterviewStatus } from "../../domain/interview-status";

export type AdventureInterviewDraft = {
  id: string;
  goalText: string;
  state: AdventureDraftState;
  readinessStatus: InterviewReadinessStatus;
  interviewStatus: InterviewStatus;
  updatedAt: Date;
};

export type AdventureInterview = {
  draft: AdventureInterviewDraft;
  transcript: InterviewMessage[];
};

export type GetAdventureInterviewOutput = {
  interview: AdventureInterview | null;
};
