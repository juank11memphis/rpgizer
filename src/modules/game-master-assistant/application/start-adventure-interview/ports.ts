import type { AdventureDraftState } from "../../domain/adventure-draft-state";
import type { InterviewMessage, InterviewMessageRole } from "../../domain/interview-message";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";
import type { InterviewStatus } from "../../domain/interview-status";

export type CreatedAdventureDraft = {
  id: string;
  goalText: string;
  state: AdventureDraftState;
  readinessStatus: InterviewReadinessStatus;
  interviewStatus: InterviewStatus;
};

export type CreateAdventureDraftInput = {
  userId: string;
  goalText: string;
  state: AdventureDraftState;
  readinessStatus: InterviewReadinessStatus;
  interviewStatus: InterviewStatus;
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
  interviewStatus: InterviewStatus;
  transcript: InterviewMessage[];
};

export const INTERVIEW_COVERED_SIGNAL_KEYS = [
  "motivation",
  "successDefinition",
  "currentStage",
  "pastFriction",
  "constraints",
  "existingInventory",
  "likelyMissingResources",
  "safetyBoundary",
  "preferences",
  "dislikesOrAvoidances",
  "confidenceGaps",
  "examplesOrInspirations",
  "firstMilestoneReadiness",
  "goalTypeSpecificBasics",
] as const;

export type InterviewCoveredSignalKey = (typeof INTERVIEW_COVERED_SIGNAL_KEYS)[number];

export type InterviewReadinessConfirmation = "confirmed" | "not_confirmed";

export type InterviewTurnResult = {
  messageToUser: string;
  readinessStatus: InterviewReadinessStatus;
  readinessConfirmation: InterviewReadinessConfirmation;
  coveredSignals?: InterviewCoveredSignalKey[];
  summaryDelta?: string | null;
};

export type StartAdventureInterviewRepository = {
  createDraft(input: CreateAdventureDraftInput): Promise<CreatedAdventureDraft>;
  appendInterviewMessage(input: AppendInterviewMessageInput): Promise<InterviewMessage>;
  updateReadiness(input: {
    userId: string;
    adventureId: string;
    readinessStatus: InterviewReadinessStatus;
    interviewStatus: InterviewStatus;
  }): Promise<void>;
};

export type GameMasterInterviewer = {
  askNextQuestion(input: InterviewTurnRequest): Promise<InterviewTurnResult>;
};

export { GameMasterInterviewerError } from "./provider-error";
export type { GameMasterInterviewerErrorCode } from "./provider-error";
