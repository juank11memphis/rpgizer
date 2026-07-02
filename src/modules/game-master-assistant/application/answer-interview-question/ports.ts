import type { InterviewMessage, InterviewMessageRole } from "../../domain/interview-message";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";
import type { InterviewStatus } from "../../domain/interview-status";
import type { AdventureInterview } from "../get-adventure-interview/output";
import type { GameMasterInterviewer, InterviewTurnRequest, InterviewTurnResult } from "../start-adventure-interview/ports";

export type AppendInterviewMessageInput = {
  userId: string;
  adventureId: string;
  role: InterviewMessageRole;
  content: string;
};

export type AnswerInterviewQuestionRepository = {
  getDraftWithTranscript(input: {
    userId: string;
    adventureId: string;
  }): Promise<AdventureInterview | null>;
  appendInterviewMessage(input: AppendInterviewMessageInput): Promise<InterviewMessage>;
  updateReadiness(input: {
    userId: string;
    adventureId: string;
    readinessStatus: InterviewReadinessStatus;
    interviewStatus: InterviewStatus;
  }): Promise<void>;
};

export type { GameMasterInterviewer, InterviewTurnRequest, InterviewTurnResult };
