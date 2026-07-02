import type { AdventureInterviewDraft } from "../get-adventure-interview/output";
import type { InterviewMessage } from "../../domain/interview-message";

export const INVALID_INTERVIEW_CONFIRMATION_MESSAGE =
  "The Interview is not ready to confirm yet.";

export type AnswerInterviewQuestionSuccess = {
  status: "success";
  draft: AdventureInterviewDraft;
  transcript: InterviewMessage[];
  userMessage?: InterviewMessage;
  gameMasterMessage?: InterviewMessage;
};

export type AnswerInterviewQuestionExpectedError = {
  status: "expected_error";
  draft: AdventureInterviewDraft;
  transcript: InterviewMessage[];
  message: string;
};

export type AnswerInterviewQuestionRecoverableFailure = {
  status: "recoverable_failure";
  draft: AdventureInterviewDraft;
  transcript: InterviewMessage[];
  preservedUserMessage: InterviewMessage;
  retryUserMessageId: string;
  message: string;
};

export type AnswerInterviewQuestionOutput =
  | AnswerInterviewQuestionSuccess
  | AnswerInterviewQuestionExpectedError
  | AnswerInterviewQuestionRecoverableFailure;
