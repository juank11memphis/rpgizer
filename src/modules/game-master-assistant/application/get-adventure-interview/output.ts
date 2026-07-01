import type { AdventureDraftState } from "../../domain/adventure-draft-state";
import type { InterviewMessage } from "../../domain/interview-message";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";

export type AdventureInterviewDraft = {
  id: string;
  goalText: string;
  state: AdventureDraftState;
  readinessStatus: InterviewReadinessStatus;
  updatedAt: Date;
};

export type AdventureInterview = {
  draft: AdventureInterviewDraft;
  transcript: InterviewMessage[];
};

export type GetAdventureInterviewOutput = {
  interview: AdventureInterview | null;
};
