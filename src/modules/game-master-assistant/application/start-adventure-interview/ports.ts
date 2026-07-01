import type { AdventureDraftState } from "../../domain/adventure-draft-state";
import type { InterviewMessage, InterviewMessageRole } from "../../domain/interview-message";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";

export type CreatedAdventureDraft = {
  id: string;
  goalText: string;
  state: AdventureDraftState;
  readinessStatus: InterviewReadinessStatus;
};

export type CreateAdventureDraftInput = {
  userId: string;
  goalText: string;
  state: AdventureDraftState;
  readinessStatus: InterviewReadinessStatus;
};

export type AppendInterviewMessageInput = {
  userId: string;
  adventureId: string;
  role: InterviewMessageRole;
  content: string;
};

export type InterviewTurnRequest = {
  userId: string;
  adventureId: string;
  goalText: string;
  readinessStatus: InterviewReadinessStatus;
  transcript: InterviewMessage[];
};

export type InterviewTurnResult = {
  messageToUser: string;
  readinessStatus: InterviewReadinessStatus;
  coveredSignals?: string[];
  summaryDelta?: string | null;
};

export type StartAdventureInterviewRepository = {
  createDraft(input: CreateAdventureDraftInput): Promise<CreatedAdventureDraft>;
  appendInterviewMessage(input: AppendInterviewMessageInput): Promise<InterviewMessage>;
  updateReadiness(input: {
    userId: string;
    adventureId: string;
    readinessStatus: InterviewReadinessStatus;
  }): Promise<void>;
};

export type GameMasterInterviewer = {
  askNextQuestion(input: InterviewTurnRequest): Promise<InterviewTurnResult>;
};
